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
	import QuemPreside from '#lib/ui/QuemPreside.svelte';
	import LinhaDoComite from '#lib/ui/LinhaDoComite.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import Quando from '#lib/ui/Quando.svelte';
	import ResponderEntrevista from '#lib/ui/ResponderEntrevista.svelte';
	import { invalidateAll } from '$app/navigation';
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
	const minhaDelegacao = $derived(data.papel === 'delegado' ? (data.minha?.delegacao_id ?? null) : null);
	const preside = $derived(!!minhaDelegacao && sessao?.presidencia?.id === minhaDelegacao && data.aoVivo?.fase === 'debate');
	const posicao = $derived((sessao?.pedidos ?? []).findIndex((p) => p.delegacao?.id === minhaDelegacao));
	const votacao = $derived(data.aoVivo?.votacao?.aberta ? data.aoVivo.votacao : null);
	// Passo 47: as fichas da votação e da nota, sem sair da Agora.
	let verVotacao = $state(false);
	let notaVista = $state<string | null>(null);
	let modalAgora = $state<Modal>();
	let modalAvisos = $state<Modal>();
	let modalCrise = $state<Modal>();
	let modalPress = $state<Modal>();
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
		!data.rodadas.length && !data.pedidosEntrevista.length && !data.chamadaColetiva && !dposPendentes.length && !data.bilhetes.length && !meusPontos && !ausente
	);
	// A mesa: três ações, e o que espera por ela em cada uma.
	const documentosEnviados = $derived((data.mesa?.dpos ?? 0) + (data.mesa?.documentos ?? 0));
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

	{#if data.papel === 'delegado' && data.aoVivo}
		<article class="cartao cartao--ao-vivo cartao--largo" aria-labelledby="c-ao-vivo">
			<h2 id="c-ao-vivo">{t('Sessão ao vivo')} · {sigla}</h2>
			{#if sessao && estado && !preside}
				<QuemPreside fase={data.aoVivo.fase} mesaAssumiu={estado.mesa_assumiu} motivo={estado.motivo_mesa} presidencia={sessao.presidencia} {minhaDelegacao} {sigla} />
			{/if}
			{#if !sessao || !estado}
				<p class="suave">{t('Nenhuma sessão aberta.')}</p>
			{:else}
				<!-- Passo 51 (lote 2): no notebook, o que acontece à esquerda e as ações à direita. -->
				<div class="ao-vivo-grade">
					<div>
					<p class="suave">{t('Sessão {n}', { n: sessao.numero })} · {FASES[data.aoVivo.fase]} · {FORMAS[estado.forma]}</p>
					<LinhaDoComite compacta {sigla} estado={{ fase: data.aoVivo.fase, etapa_plenaria: estado.etapa_plenaria, topico_atual: estado.topico_atual }} papel="delegacao" ordem={data.aoVivo.ordem} />
					{#if momento === 'pausa'}<p class="telegrama" role="status">{t('Há pontos ou moções?')}</p>{/if}
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
					</div>
					<div class="ao-vivo-acoes">
					{#if data.aoVivo.fase !== 'plenaria' && minhaDelegacao && !restrita}
						<BotaoPlaca compacto comiteId={data.minha!.comite_id!} {posicao} nome={data.minha?.delegacao_nome ?? ''} onerro={(m) => (erro = m)} />
					{/if}
					<!-- Passo 59: ponto ou moção sempre à mão, não só na pausa. -->
					<p class="acoes">
						{#if minhaDelegacao && !restrita}<a class="botao" href={`/comite/${sigla}/sessao?ponto`}>{t('Fazer um ponto ou moção')}</a>{/if}
						<a class="botao botao--secundario" href={`/comite/${sigla}/sessao`}>{t('Abrir a sessão')}</a>
					</p>
					</div>
				</div>
			{/if}
		</article>
	{/if}

	<!-- Passo 43: o que espera a delegação, cada item a um clique do lugar exato. -->
	<!-- Passo 51 (lote 2): sem pendências e com a sessão ao vivo à vista, o cartão sai (sem ruído). -->
	{#if data.papel === 'delegado' && !(nadaParaDelegacao && data.aoVivo)}
		<article class={['cartao', nadaParaDelegacao ? 'precisa-vazio' : 'cartao--destaque']} aria-labelledby="c-caixa">
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
				{#if data.chamadaColetiva}
					<li>
						<a class="botao botao--pequeno" href="/press/coletiva">{t('Sua delegação foi chamada na coletiva')}</a>
						<span class="detalhe">{data.chamadaColetiva.veiculo?.nome}</span>
					</li>
				{/if}
				{#each data.pedidosEntrevista as e (e.id)}
					<li>
						<span>{t('Pedido de entrevista de {veiculo}', { veiculo: e.veiculo?.nome ?? '' })} <span class="detalhe">{e.tema}</span></span>
						<ResponderEntrevista entrevista={e} onfeito={() => invalidateAll()} />
					</li>
				{/each}
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
					<li><span><strong>{b.de?.nome}</strong> {b.texto}</span> <a class="botao botao--secundario botao--pequeno" href={`/comite/${sigla}/mensagens`}>{t('Responder')}</a></li>
				{/each}
				{#if nadaParaDelegacao}
					<li class="suave">{t('Nada esperando você agora.')}</li>
				{/if}
			</ul>
		</article>
	{/if}

	{#if data.papel === 'mesa'}
		<article class="cartao cartao--destaque" aria-labelledby="c-mesa">
			<h2 id="c-mesa">{t('Mesa')} · {sigla}</h2>
			<p>{sessao ? t('Sessão {n} aberta', { n: sessao.numero }) : t('Nenhuma sessão aberta.')}</p>
			<!-- Passo 61: o momento do comitê e o que a mesa faz agora. -->
			{#if estado && data.aoVivo}<LinhaDoComite compacta {sigla} estado={{ fase: data.aoVivo.fase, etapa_plenaria: estado.etapa_plenaria, topico_atual: estado.topico_atual }} papel="mesa" ordem={data.aoVivo.ordem} />{/if}
			<!-- Passo 51 (lote 2): os três atalhos como botões numa linha, com a contagem dentro. -->
			<div class="acoes">
				<a class={['botao botao--pequeno', !sessao?.avisos.length && 'botao--secundario']} href={`/comite/${sigla}/sessao/chamada`}
					>{t('Chegadas a confirmar')} <span class="selo">{sessao?.avisos.length ?? 0}</span></a
				>
				<a class={['botao botao--pequeno', !paraJulgar && 'botao--secundario']} href={`/comite/${sigla}/sessao/presidencia`}
					>{t('Pedidos para o bureau')} <span class="selo">{paraJulgar}</span></a
				>
				<a class={['botao botao--pequeno', !documentosEnviados && 'botao--secundario']} href={`/comite/${sigla}/documentos`}
					>{t('Documentos enviados à mesa')} <span class="selo">{documentosEnviados}</span></a
				>
				<!-- Passo 56: na mesma linha, para a trilha do tópico caber sem rolar. -->
				<a class="botao botao--pequeno" href={`/comite/${sigla}/sessao/presidencia`}>{t('Abrir o painel')}</a>
			</div>
		</article>
	{/if}

	{#if data.papel === 'crise'}
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

	<!-- Passo 54: com um comitê (mesa), o bloco dele vem em cima e a secretaria fica compacta. -->
	{#if data.secretaria}
		<article class={['cartao', !data.papel && 'cartao--destaque']} aria-labelledby="c-secretaria">
			<h2 id="c-secretaria">{t('Secretaria')}</h2>
			<div class="acoes">
				<a class={['botao', data.papel && 'botao--pequeno']} href="/secretaria/checkin">{t('Check-in')}</a>
				<a class={['botao botao--secundario', data.papel && 'botao--pequeno']} href="/secretaria/participantes">{t('Participantes')}</a>
				{#if !data.papel}<a class="botao botao--secundario" href="/avisos">{t('Avisos')}</a>{/if}
			</div>
		</article>
	{/if}

	<!-- Passo 51 (lote 2): o bloco do papel fica em cima; o resto do evento vira linhas curtas,
		 cada uma com o mais recente, e "Ver tudo" abre o resto num modal. -->
	<section class="cartao cartao--largo no-evento" aria-labelledby="c-no-evento">
		<h2 id="c-no-evento">{t('No evento')}</h2>
		<article class="linha-evento" aria-labelledby="c-agora">
			<h3 id="c-agora">{t('Acontecendo agora')}</h3>
			<div class="linha-evento-resumo">
				{#if atuais[0]}
					<p><strong>{atuais[0].titulo}</strong> <TipoItem tipo={atuais[0].tipo} /></p>
					<p class="suave">{junto(atuais[0].local, `${t('até')} ${formatarHora(atuais[0].fim)}`)}</p>
				{:else}
					<p class="suave">{t('Nada no cronograma neste momento.')}</p>
				{/if}
			</div>
			{#if atuais.length > 1 || data.comitesAoVivo.length}
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => modalAgora?.abrir()}>{t('Ver tudo')}</button>
			{/if}
		</article>
		<article class="linha-evento" aria-labelledby="c-depois">
			<h3 id="c-depois">{t('Depois')}</h3>
			<div class="linha-evento-resumo">
				{#if proximo}
					<p><strong>{proximo.titulo}</strong> <TipoItem tipo={proximo.tipo} /></p>
					<p class="suave">{junto(proximo.local, formatarQuando(proximo.inicio, agora))}</p>
				{:else}
					<p class="suave">{t('Nada mais no cronograma.')}</p>
				{/if}
			</div>
			<a class="botao botao--secundario botao--pequeno" href="/cronograma">{t('Cronograma')}</a>
		</article>
		<article class="linha-evento" aria-labelledby="c-avisos">
			<h3 id="c-avisos">
				{t('Avisos')}
				{#if novos.length > 0}<span class="selo selo--info">{novos.length === 1 ? t('1 aviso novo') : t('{n} avisos novos', { n: novos.length })}</span>{/if}
			</h3>
			<div class="linha-evento-resumo">
				{#if data.avisos[0]}<p class="linha-evento-texto">{data.avisos[0].texto}</p>{:else}<p class="suave">{t('Nenhum aviso.')}</p>{/if}
			</div>
			<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => modalAvisos?.abrir()}>{t('Ver tudo')}</button>
		</article>
		{#if data.respostasCrise.length}
			<article class="linha-evento" aria-labelledby="c-crise">
				<h3 id="c-crise">{t('Respostas da crise')} <span class="selo">{data.respostasCrise.length}</span></h3>
				<div class="linha-evento-resumo">
					<p class="linha-evento-texto">
						<button class="abre-ficha" type="button" onclick={() => (notaVista = data.respostasCrise[0].id)}>{data.respostasCrise[0].titulo}</button>
						<span class="detalhe">{data.respostasCrise[0].resposta}</span>
					</p>
				</div>
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => modalCrise?.abrir()}>{t('Ver tudo')}</button>
			</article>
		{/if}
		{#if data.citacoes.length}
			<article class="linha-evento" aria-labelledby="c-press">
				<h3 id="c-press">{t('Na press')} <span class="selo">{data.citacoes.length}</span></h3>
				<div class="linha-evento-resumo">
					<p class="linha-evento-texto">
						<button class="abre-ficha" type="button" onclick={() => abrirPrevia('noticia', data.citacoes[0].id)}>{data.citacoes[0].titulo}</button>
						<span class="detalhe">{t('{veiculo} cita a sua delegação', { veiculo: data.citacoes[0].veiculo?.nome ?? '' })}</span>
					</p>
				</div>
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => modalPress?.abrir()}>{t('Ver tudo')}</button>
			</article>
		{/if}
	</section>
</div>

<Modal bind:this={modalAgora} nome={t('Acontecendo agora')} classe="modal-acao">
	<h3>{t('Acontecendo agora')}</h3>
	{#each data.comitesAoVivo as c (c.comite?.sigla)}
		<p class="topico-atual">
			<span class="rotulo">{c.comite?.sigla}</span>
			{c.fase === 'debate' && c.topico_atual ? `${t('Em debate')}: ${c.comite?.topicos[c.topico_atual - 1]}` : FASES[c.fase]}
		</p>
	{/each}
	{#each atuais as item (item.id)}
		<p><strong>{item.titulo}</strong> <TipoItem tipo={item.tipo} /></p>
		<p class="suave">{junto(item.local, `${t('até')} ${formatarHora(item.fim)}`)}</p>
	{/each}
	<form method="dialog" class="acoes"><button class="botao botao--secundario">{t('Fechar')}</button></form>
</Modal>
<Modal bind:this={modalAvisos} nome={t('Avisos')} classe="modal-acao">
	<h3>{t('Avisos')}</h3>
	<ul class="lista">
		{#each data.avisos.slice(0, 5) as aviso (aviso.id)}
			<li><span>{aviso.texto} <span class="detalhe"><Quando iso={aviso.criado_em} /></span></span></li>
		{:else}
			<li class="suave">{t('Nenhum aviso.')}</li>
		{/each}
	</ul>
	<div class="acoes">
		<a class="botao botao--secundario" href="/avisos">{t('Ver todos os avisos')}</a>
		<button class="botao botao--secundario" type="button" onclick={() => modalAvisos?.fechar()}>{t('Fechar')}</button>
	</div>
</Modal>
<Modal bind:this={modalCrise} nome={t('Respostas da crise')} classe="modal-acao">
	<h3>{t('Respostas da crise')}</h3>
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
	<div class="acoes">
		{#if data.respostasCrise[0]}
			<a class="botao botao--secundario" href={`/comite/${data.participacoes.find((p) => p.comite_id === data.respostasCrise[0].comite_id)?.comite_sigla}/crise`}
				>{t('Ver as notas de crise')}</a
			>
		{/if}
		<button class="botao botao--secundario" type="button" onclick={() => modalCrise?.fechar()}>{t('Fechar')}</button>
	</div>
</Modal>
<Modal bind:this={modalPress} nome={t('Na press')} classe="modal-acao">
	<h3>{t('Na press')}</h3>
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
	<form method="dialog" class="acoes"><button class="botao botao--secundario">{t('Fechar')}</button></form>
</Modal>

<FichaVotacao
	votacao={verVotacao ? votacao : null}
	{sigla}
	delegacoes={data.aoVivo?.delegacoes ?? []}
	presentes={new Set((sessao?.presenca ?? []).map((p) => p.delegacao_id))}
	onclose={() => (verVotacao = false)}
/>
<FichaNota nota={data.respostasCrise.find((n) => n.id === notaVista)} onclose={() => (notaVista = null)} />
