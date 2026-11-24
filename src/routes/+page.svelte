<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { abrirPrevia } from '#lib/ficha.svelte.ts';
	import { formatarDia, formatarHora, formatarQuando, itensAtuais, proximoItem } from '#lib/cronograma.ts';
	import { FASES } from '#lib/votacao.ts';
	import { SELO_NOTA, STATUS_NOTA, type StatusNota } from '#lib/crise.ts';
	import { STATUS_DPO } from '#lib/impressao.ts';
	import { relogioDebate, temDebate } from '#lib/cronometro.ts';
	import { FORMAS, momentoDoDebate } from '#lib/sessao.ts';
	import { escolhasPermitidas } from '#lib/votacao.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import TipoItem from '#lib/ui/TipoItem.svelte';
	import BotaoPlaca from '#lib/ui/BotaoPlaca.svelte';
	import Cronometro from '#lib/ui/Cronometro.svelte';
	import Votar from '#lib/ui/Votar.svelte';
	import AlertaCrise from '#lib/ui/AlertaCrise.svelte';
	import FichaVotacao from '#lib/ui/FichaVotacao.svelte';
	import FichaNota from '#lib/ui/FichaNota.svelte';
	import { chamarAtencao } from '#lib/aparelho.ts';
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// O relógio da tela anda sozinho, para o cartão "Acontecendo agora" virar na hora certa.
	let agora = $state(new Date());
	$effect(() => {
		const relogio = setInterval(() => (agora = new Date()), 30_000);
		return () => clearInterval(relogio);
	});

	const atuais = $derived(itensAtuais(data.cronograma, agora));
	const proximo = $derived(proximoItem(data.cronograma, agora));
	const vistosEm = $derived(data.avisosVistosEm ? new Date(data.avisosVistosEm) : null);
	const novos = $derived(data.avisos.filter((a) => !vistosEm || new Date(a.criado_em) > vistosEm));
	const junto = (...partes: (string | null | undefined)[]) => partes.filter(Boolean).join(' · ');

	// Passo 32: a sessão ao vivo para o delegado e a mesa.
	let diferenca = $state(0);
	let erro = $state('');
	let agoraMs = $state(Date.now());
	$effect(() => {
		if (!data.aoVivo) return;
		const relogio = setInterval(() => (agoraMs = Date.now()), 1000);
		return () => clearInterval(relogio);
	});
	const sigla = $derived(data.minha?.comite_sigla ?? '');
	const estado = $derived(data.aoVivo?.estado ?? null);
	const sessao = $derived(estado?.sessao ?? null);
	const momento = $derived(estado ? momentoDoDebate(estado, agoraMs + diferenca) : null);
	const minhaDelegacao = $derived(data.principal === 'delegado' ? (data.minha?.delegacao_id ?? null) : null);
	const preside = $derived(!!minhaDelegacao && sessao?.presidencia?.id === minhaDelegacao && data.aoVivo?.fase === 'debate');
	const posicao = $derived((sessao?.pedidos ?? []).findIndex((p) => p.delegacao?.id === minhaDelegacao));
	const votacao = $derived(data.aoVivo?.votacao?.aberta ? data.aoVivo.votacao : null);
	// Passo 47: as fichas da votação e da nota, sem sair da Agora.
	let verVotacao = $state(false);
	let notaVista = $state<string | null>(null);
	// Passo 38: a votação que abre depois de a tela estar aberta chama a atenção.
	let votacaoVista = untrack(() => votacao?.id ?? '');
	$effect(() => {
		if (!votacao || votacao.id === votacaoVista) return;
		votacaoVista = votacao.id;
		setTimeout(() => chamarAtencao('a-votacao'));
	});
	const meuVoto = $derived(votacao?.votos.find((v) => v.delegacao_id === minhaDelegacao)?.escolha);
	const posso = $derived(
		votacao
			? escolhasPermitidas(
					votacao.tipo,
					data.aoVivo?.delegacoes.find((d) => d.id === minhaDelegacao)?.situacao,
					sessao?.presenca.find((p) => p.delegacao_id === minhaDelegacao)?.situacao
				)
			: []
	);
	// Tecnologia restrita: durante a sessão, a mesa opera o app (a placa fica com ela).
	const restrita = $derived(!!data.aoVivo?.restrita && !!estado);
	// Passo 43: os DPOs que ainda pedem algo da delegação (rascunho ou ajustes da mesa).
	const dposPendentes = $derived(data.dpos.filter((d) => d.status === 'rascunho' || d.status === 'pede_ajustes'));
	const paraJulgar = $derived(
		(sessao?.pontos ?? []).filter((p) => p.status === 'aberto' && p.aprovado_bureau == null).length
	);
	// Passo 46: o que a sala espera da delegação, sem abrir a sessão para descobrir.
	const meusPontos = $derived(
		(sessao?.pontos ?? []).filter((p) => p.status === 'aberto' && p.delegacao?.id === minhaDelegacao).length
	);
	const ausente = $derived(
		!!sessao && !!minhaDelegacao && !sessao.presenca.some((p) => p.delegacao_id === minhaDelegacao)
	);
	const nadaParaDelegacao = $derived(
		!data.rodadas.length && !dposPendentes.length && !data.bilhetes.length && !meusPontos && !ausente
	);
	// A mesa: três ações, e o que espera por ela em cada uma.
	const documentosEnviados = $derived((data.mesa?.dpos ?? 0) + (data.mesa?.documentos ?? 0));
	const nadaParaMesa = $derived(!sessao?.avisos.length && !paraJulgar && !documentosEnviados);
</script>

<svelte:head>
	<title>{tituloDaAba(t('Agora'))}</title>
</svelte:head>

<p class="rotulo">
	{data.participacoes[0]?.evento_nome} · {formatarDia(new Date().toISOString())}
	{#if data.aoVivo && data.minha?.comite_id}<AoVivo comiteId={data.minha.comite_id} bind:diferenca />{/if}
</p>
<h1>{t('Agora')}</h1>
{#if erro}<p class="erro" role="alert">{erro}</p>{/if}

<div class="cartoes">
	{#if data.aoVivo}<AlertaCrise incidentes={data.aoVivo.incidentes} {diferenca} />{/if}
	{#if preside && sessao}
		<article class="cartao cartao--presidencia" aria-labelledby="c-preside">
			<h2 id="c-preside">{t('Você preside a sessão {n}', { n: sessao.numero })}</h2>
			<a class="botao" href={`/comite/${sigla}/sessao/presidencia`}>{t('Abrir o painel')}</a>
		</article>
	{/if}

	{#if data.principal === 'delegado' && data.aoVivo}
		<article class="cartao cartao--ao-vivo cartao--largo" aria-labelledby="c-ao-vivo">
			<h2 id="c-ao-vivo">{t('Sessão ao vivo')} · {sigla}</h2>
			{#if !sessao || !estado}
				<p class="suave">{t('Nenhuma sessão aberta.')}</p>
			{:else}
				<p class="suave">{t('Sessão {n}', { n: sessao.numero })} · {FASES[data.aoVivo.fase]} · {FORMAS[estado.forma]}</p>
				{#if momento === 'pausa'}
					<p class="telegrama" role="status">
						{t('Há pontos ou moções?')} <a href={`/comite/${sigla}/sessao`}>{t('Fazer um ponto ou moção')}</a>
					</p>
				{/if}
				<p>
					<span class="rotulo">{t('Com a palavra')}</span>
					{estado.orador ? estado.orador.nome : t('Ninguém com a palavra.')}
				</p>
				<Cronometro cronometro={estado} avisoSeg={data.aoVivo.regras.aviso_fala_seg} {diferenca} />
				{#if temDebate(estado)}
					<p class="rotulo">{FORMAS[estado.forma]} · {t('tempo do debate')}</p>
					<Cronometro cronometro={relogioDebate(estado)} avisoSeg={60} {diferenca} />
				{/if}
				{#if votacao}
					<p class="destaque" id="a-votacao" tabindex="-1">{t('Votação aberta')}:
						<button class="abre-ficha" type="button" onclick={() => (verVotacao = true)}>{votacao.objeto}</button></p
					>
					<Votar votacaoId={votacao.id} escolhas={posso} {meuVoto} onerro={(m) => (erro = m)} />
				{/if}
				{#if data.aoVivo.fase !== 'plenaria' && minhaDelegacao && !restrita}
					<BotaoPlaca comiteId={data.minha!.comite_id!} {posicao} nome={data.minha?.delegacao_nome ?? ''} onerro={(m) => (erro = m)} />
				{/if}
				<p class="acoes"><a class="botao botao--secundario" href={`/comite/${sigla}/sessao`}>{t('Abrir a sessão')}</a></p>
			{/if}
		</article>
	{/if}

	<!-- Passo 43: o que espera a delegação, cada item a um clique do lugar exato. -->
	{#if data.principal === 'delegado'}
		<article class="cartao cartao--destaque" aria-labelledby="c-caixa">
			<h2 id="c-caixa">{t('Precisa de você')}</h2>
			<ul class="lista">
				{#if ausente}
					<li>
						<a href={`/comite/${sigla}/sessao`}>{t('Sua delegação está ausente na chamada')}</a>
						<span class="detalhe">{t('avise a mesa que chegou')}</span>
					</li>
				{/if}
				{#if meusPontos}
					<li>
						<a href={`/comite/${sigla}/sessao`}>{t('Seu ponto ou moção espera a mesa')}</a>
						<span class="selo selo--info">{meusPontos}</span>
					</li>
				{/if}
				{#each data.rodadas as r (r.documento?.id)}
					<li>
						<a href={`/documento/${r.documento?.id}`}>{r.documento?.titulo}</a>
						<span class="detalhe">{t('rodada até {hora}', { hora: formatarHora(r.fim) })}</span>
					</li>
				{/each}
				{#each dposPendentes as dpo (dpo.id)}
					<li>
						<a href={`/comite/${sigla}/dpo`}>{t('DPO do tópico {n}', { n: dpo.topico })}</a>
						<span class="selo {STATUS_DPO[dpo.status].selo}">{STATUS_DPO[dpo.status].rotulo}</span>
					</li>
				{/each}
				{#each data.bilhetes as b (b.id)}
					<li><span><strong>{b.de?.nome}</strong> {b.texto}</span> <a href={`/comite/${sigla}/mensagens`}>{t('Responder')}</a></li>
				{/each}
				{#if nadaParaDelegacao}
					<li class="suave">{t('Nada esperando você agora.')}</li>
				{/if}
			</ul>
		</article>
	{/if}

	{#if data.principal === 'mesa'}
		<article class="cartao cartao--destaque" aria-labelledby="c-mesa">
			<h2 id="c-mesa">{t('Mesa')} · {sigla}</h2>
			<p>{sessao ? t('Sessão {n} aberta', { n: sessao.numero }) : t('Nenhuma sessão aberta.')}</p>
			<ul class="lista">
				<li>
					<a href={`/comite/${sigla}/sessao/chamada`}>{t('Chegadas a confirmar')}</a>
					<span class="selo">{sessao?.avisos.length ?? 0}</span>
				</li>
				<li>
					<a href={`/comite/${sigla}/sessao/presidencia`}>{t('Pedidos para o bureau')}</a>
					<span class="selo">{paraJulgar}</span>
				</li>
				<li>
					<a href={`/comite/${sigla}/documentos`}>{t('Documentos enviados à mesa')}</a>
					<span class="selo">{documentosEnviados}</span>
				</li>
				{#if nadaParaMesa}<li class="suave">{t('Nada esperando você agora.')}</li>{/if}
			</ul>
			<div class="acoes">
				<a class="botao" href={`/comite/${sigla}/sessao/presidencia`}>{t('Abrir o painel')}</a>
			</div>
		</article>
	{/if}

	{#if data.principal === 'crise'}
		<article class="cartao cartao--destaque" aria-labelledby="c-crise-equipe">
			<h2 id="c-crise-equipe">{t('Crise')} · {sigla}</h2>
			<p class="destaque">{t('{n} notas esperando resposta', { n: data.notasPendentes ?? 0 })}</p>
			<a class="botao" href={`/crise/${sigla}`}>{t('Abrir a fila da crise')}</a>
		</article>
	{/if}

	{#if data.principal === 'press'}
		<article class="cartao cartao--destaque" aria-labelledby="c-press-agora">
			<h2 id="c-press-agora">{t('Press')}</h2>
			<ul class="lista">
				{#each data.entrevistas as e (e.id)}
					<li>
						<span>{e.delegacao?.nome} · {e.tema}</span>
						<span class="detalhe">{e.horario ? formatarQuando(e.horario, agora) : ''}</span>
					</li>
				{:else}
					<li class="suave">{t('Nenhuma entrevista marcada.')}</li>
				{/each}
			</ul>
			<div class="acoes">
				<a class="botao" href="/press/escrever">{t('Escrever')}</a>
				<a class="botao botao--secundario" href="/press/entrevistas">{t('Entrevistas')}</a>
			</div>
		</article>
	{/if}

	{#if data.principal === 'secretaria'}
		<article class="cartao cartao--destaque" aria-labelledby="c-secretaria">
			<h2 id="c-secretaria">{t('Secretaria')}</h2>
			<div class="acoes">
				<a class="botao" href="/secretaria/checkin">{t('Check-in')}</a>
				<a class="botao botao--secundario" href="/secretaria/participantes">{t('Participantes')}</a>
				<a class="botao botao--secundario" href="/avisos">{t('Avisos')}</a>
			</div>
		</article>
	{/if}

	<article class="cartao" aria-labelledby="c-agora">
		<h2 id="c-agora">{t('Acontecendo agora')}</h2>
		{#each data.comitesAoVivo as c (c.comite?.sigla)}
			<p class="topico-atual">
				<span class="rotulo">{c.comite?.sigla}</span>
				{c.fase === 'debate' && c.topico_atual ? `${t('Em debate')}: ${c.comite?.topicos[c.topico_atual - 1]}` : FASES[c.fase]}
			</p>
		{/each}
		{#each atuais as item (item.id)}
			<p class="destaque">{item.titulo} <TipoItem tipo={item.tipo} /></p>
			<p class="suave">{junto(item.local, `${t('até')} ${formatarHora(item.fim)}`)}</p>
		{:else}
			<p class="suave">{t('Nada no cronograma neste momento.')}</p>
		{/each}
	</article>

	<article class="cartao" aria-labelledby="c-depois">
		<h2 id="c-depois">{t('Depois')}</h2>
		{#if proximo}
			<p class="destaque">{proximo.titulo} <TipoItem tipo={proximo.tipo} /></p>
			<p class="suave">{junto(proximo.local, formatarQuando(proximo.inicio, agora))}</p>
		{:else}
			<p class="suave">{t('Nada mais no cronograma.')}</p>
		{/if}
		<p><a href="/cronograma">{t('Ver o cronograma')}</a></p>
	</article>

	<article class="cartao" aria-labelledby="c-avisos">
		<h2 id="c-avisos">{t('Avisos')}</h2>
		{#if novos.length > 0}
			<p class="destaque">{novos.length === 1 ? t('1 aviso novo') : t('{n} avisos novos', { n: novos.length })}</p>
		{/if}
		{#each data.avisos.slice(0, 3) as aviso (aviso.id)}
			<p>{aviso.texto}</p>
		{:else}
			<p class="suave">{t('Nenhum aviso.')}</p>
		{/each}
		<p><a href="/avisos">{t('Ver todos os avisos')}</a></p>
	</article>

	{#if data.respostasCrise.length}
		<article class="cartao" aria-labelledby="c-crise">
			<h2 id="c-crise">{t('Respostas da crise')}</h2>
			<ul class="lista">
				{#each data.respostasCrise as nota (nota.id)}
					<li>
						<span>
							<span class="selo {SELO_NOTA[nota.status as StatusNota]}">{STATUS_NOTA[nota.status as StatusNota]}</span>
							<button class="abre-ficha" type="button" onclick={() => (notaVista = nota.id)}>{nota.titulo}</button>
							<span class="detalhe">{nota.resposta}</span>
						</span>
					</li>
				{/each}
			</ul>
			<p>
				<a href={`/comite/${data.participacoes.find((p) => p.comite_id === data.respostasCrise[0].comite_id)?.comite_sigla}/crise`}
					>{t('Ver as notas de crise')}</a
				>
			</p>
		</article>
	{/if}

	{#if data.citacoes.length}
		<article class="cartao" aria-labelledby="c-press">
			<h2 id="c-press">{t('Na press')}</h2>
			<ul class="lista">
				{#each data.citacoes as n (n.id)}
					<li>
						<span>
							<button class="abre-ficha" type="button" onclick={() => abrirPrevia('noticia', n.id)}>{n.titulo}</button>
							<span class="detalhe">{t('{veiculo} cita a sua delegação', { veiculo: n.veiculo?.nome ?? '' })}</span>
						</span>
					</li>
				{/each}
			</ul>
		</article>
	{/if}

</div>

<FichaVotacao
	votacao={verVotacao ? votacao : null}
	{sigla}
	delegacoes={data.aoVivo?.delegacoes ?? []}
	presentes={new Set((sessao?.presenca ?? []).map((p) => p.delegacao_id))}
	onclose={() => (verVotacao = false)}
/>
<FichaNota nota={data.respostasCrise.find((n) => n.id === notaVista)} onclose={() => (notaVista = null)} />
