<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { contador } from '#lib/contador.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { invalidate } from '$app/navigation';
	import {
		descreverPonto,
		FORMAS,
		mensagemDeErro,
		PONTOS,
		pontosEmOrdem,
		situacaoDoPonto,
		momentoDoDebate,
		type TipoPonto
	} from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import NomeDelegacao from '#lib/ui/NomeDelegacao.svelte';
	import Cronometro from '#lib/ui/Cronometro.svelte';
	import { fase, relogioDebate, restanteSeg, temDebate } from '#lib/cronometro.ts';
	import { chamarAtencao, manterTelaAcesa, vibrar } from '#lib/aparelho.ts';
	import { guardarRascunho, lerRascunho } from '#lib/rascunho.ts';
	import { untrack } from 'svelte';
	import ListaVotos from '#lib/ui/ListaVotos.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import FichaVotacao from '#lib/ui/FichaVotacao.svelte';
	import FichaPonto from '#lib/ui/FichaPonto.svelte';
	import Contagem from '#lib/ui/Contagem.svelte';
	import BotaoPlaca from '#lib/ui/BotaoPlaca.svelte';
	import Votar from '#lib/ui/Votar.svelte';
	import AlertaCrise from '#lib/ui/AlertaCrise.svelte';
	import { semVoz } from '#lib/crise.ts';
	import NotaRapida from '#lib/ui/NotaRapida.svelte';
	import { assinaturasDesconfianca, escolhasPermitidas, ETAPAS, FASES, listaAtiva, presidenciaEmVigor, textoResultado } from '#lib/votacao.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let diferenca = $state(0);
	let erro = $state('');
	let mensagem = $state('');
	let tipoPonto = $state<TipoPonto>('ponto_duvida');
	let detalhe = $state(lerRascunho(`ponto:${untrack(() => data.comite.sigla)}`));
	let topico = $state(1);
	let minutos = $state(10);
	let placa = $state<Modal>();

	// Passo 31: a mesa que assumiu uma delegação age como ela nesta tela.
	const representada = $derived(data.representacoes.find((r) => r.pessoa_id === data.usuario?.id)?.delegacao ?? null);
	const eu = $derived(
		data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado') ??
			(representada
				? { delegacao_id: representada.id, delegacao_nome: representada.nome, delegacao_bandeira: representada.bandeira }
				: undefined)
	);
	const ehMesa = $derived(
		data.participacoes.some((p) => (p.papel === 'mesa' && p.comite_id === data.comite.id) || p.papel === 'secretaria')
	);
	const sessao = $derived(data.estado?.sessao);
	const fila = $derived(sessao?.pedidos ?? []);
	const posicao = $derived(fila.findIndex((p) => p.delegacao?.id === eu?.delegacao_id));
	const pontos = $derived(sessao?.pontos ?? []);
	const meusPontos = $derived(pontos.filter((p) => p.delegacao?.id === eu?.delegacao_id));
	const emDiscussao = $derived(pontos.find((p) => p.status === 'em_discussao'));
	const lista = $derived(listaAtiva(data.lista, emDiscussao?.id, data.fase));
	const tiposEmOrdem = $derived(pontosEmOrdem(data.fase, data.estado?.etapa_plenaria, data.salaFechada));
	const minhaSituacao = $derived(data.delegacoes.find((d) => d.id === eu?.delegacao_id)?.situacao);
	const presentes = $derived(new Set((sessao?.presenca ?? []).map((p) => p.delegacao_id)));
	// Debate rápido (passo 30): a pausa para pontos e moções e a lista curta.
	let agora = $state(Date.now());
	$effect(() => {
		const relogio = setInterval(() => (agora = Date.now()), 1000);
		return () => clearInterval(relogio);
	});
	const momento = $derived(data.estado ? momentoDoDebate(data.estado, agora + diferenca) : null);
	// Passo 35: a delegação atingida pela crise fica sem voz.
	const impedida = $derived(semVoz(data.incidentes, eu?.delegacao_id, agora + diferenca));

	// Passo 38: tela acesa, rascunho do ponto, "a palavra é sua" e a votação que abre.
	$effect(manterTelaAcesa);
	$effect(() => guardarRascunho(`ponto:${data.comite.sigla}`, detalhe));
	const minhaVez = $derived(!!eu?.delegacao_id && data.estado?.orador?.id === eu.delegacao_id);
	const fimDaFala = $derived(
		minhaVez && data.estado ? fase(data.estado, restanteSeg(data.estado, agora + diferenca), data.regras.aviso_fala_seg) === 'aviso' : false
	);
	$effect(() => {
		if (minhaVez) vibrar(200);
	});
	$effect(() => {
		if (fimDaFala) vibrar(80);
	});
	// A votação que já estava aberta ao entrar não puxa a tela; a que abre depois, sim.
	let votacaoVista = untrack(() => (data.votacao?.aberta ? data.votacao.id : ''));
	$effect(() => {
		const id = data.votacao?.aberta ? data.votacao.id : '';
		if (!id || id === votacaoVista) return;
		votacaoVista = id;
		setTimeout(() => chamarAtencao('c-votacao'));
	});
	const naListaCurta = $derived((sessao?.proximos ?? []).findIndex((p) => p.delegacao?.id === eu?.delegacao_id));
	function irAoPonto() {
		const campo = document.getElementById('tipo-ponto');
		campo?.scrollIntoView({ block: 'center' });
		campo?.focus();
	}
	const minhaPresenca = $derived(sessao?.presenca.find((p) => p.delegacao_id === eu?.delegacao_id)?.situacao);
	// Passo 47: as fichas da votação e do ponto, abertas pelo nome, sem mudar a URL.
	let verVotacao = $state(false);
	let pontoVisto = $state<string | null>(null);
	const pontoDaFicha = $derived(data.estado?.sessao?.pontos.find((p) => p.id === pontoVisto));
	const meuVoto = $derived(data.votacao?.votos.find((v) => v.delegacao_id === eu?.delegacao_id)?.escolha);
	// Tecnologia restrita: durante a sessão, a mesa opera o app; o delegado acompanha.
	const restrita = $derived(!!data.comite.tecnologia_restrita && !!data.estado);
	const posso = $derived(
		data.votacao && !restrita ? escolhasPermitidas(data.votacao.tipo, minhaSituacao, minhaPresenca) : []
	);
	const desconfiancas = $derived(
		(data.estado?.sessao?.pontos ?? []).filter((p) => p.tipo === 'voto_desconfianca' && p.status === 'aberto')
	);
	const topicoAtual = $derived(data.estado?.topico_atual ? data.comite.topicos[data.estado.topico_atual - 1] : null);

	// Se o tipo escolhido sai de ordem (a fase mudou), volta ao ponto de dúvida.
	$effect(() => {
		if (!tiposEmOrdem.includes(tipoPonto)) tipoPonto = 'ponto_duvida';
	});

	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, ok = '') {
		erro = mensagem = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		else mensagem = ok;
		await invalidate('app:sessao-ao-vivo');
		return !error;
	}

	const inscrever = (lado: 'a_favor' | 'contra') =>
		executar(supabase.rpc('inscrever_lista', { p_ponto: emDiscussao!.id, p_lado: lado }), t('Sua delegação entrou na lista.'));

	async function enviarPonto(evento: SubmitEvent) {
		evento.preventDefault();
		const ok = await executar(
			supabase.rpc('enviar_ponto', {
				p_comite: data.comite.id,
				p_tipo: tipoPonto,
				p_detalhe: detalhe,
				p_topico: tipoPonto === 'topico_no_topo' ? topico : undefined,
				p_minutos: tipoPonto === 'informal_informal' ? minutos : undefined
			}),
			t('{pedido}: enviado à mesa.', { pedido: PONTOS[tipoPonto] })
		);
		if (ok) detalhe = '';
	}
</script>

<svelte:head>
	<title>{tituloDaAba(t('Sessão'), data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">{t('Comitê')} · {data.comite.sigla} <AoVivo comiteId={data.comite.id} bind:diferenca /></p>
<h1>{sessao ? t('Sessão {n}', { n: sessao.numero }) : t('Sessão')}</h1>

<!-- Passo 43: só o que é da sessão, no topo (documentos e mensagens estão no menu). -->
<nav class="nesta-sessao" aria-label={t('Telas da sessão')}>
	{#if data.podePresidir}
		<a class="botao" href={`/comite/${data.comite.sigla}/sessao/presidencia`}>{t('Painel da presidência')}</a>
	{/if}
	{#if ehMesa}<a href={`/comite/${data.comite.sigla}/sessao/chamada`}>{t('Chamada e rodízio')}</a>{/if}
	<a href={`/comite/${data.comite.sigla}/sessao/agenda`}>{t('Agenda')}</a>
	<a href={`/comite/${data.comite.sigla}/votacoes`}>{t('Votações')}</a>
	{#if data.comite.crise_ligada && eu}<a href={`/comite/${data.comite.sigla}/crise`}>{t('Notas de crise')}</a>{/if}
	<a href={`/telao/${data.comite.sigla}`}>{t('Telão')}</a>
</nav>

{#if !data.estado || !sessao}
	<p class="suave">{t('Nenhuma sessão aberta. A mesa abre a sessão.')}</p>
{:else}
	<p class="suave">
		{FASES[data.fase]}{data.fase === 'plenaria' ? ` · ${ETAPAS[data.estado.etapa_plenaria].rotulo}` : ''} ·
		{FORMAS[data.estado.forma]} · {t('Presidência')}: {presidenciaEmVigor(data.fase, data.estado.mesa_assumiu, sessao.presidencia?.nome)}
	</p>
	{#if topicoAtual}
		<p class="topico-atual">
			<span class="rotulo">{t('Tópico em debate')}</span> <a href={`/comite/${data.comite.sigla}/sessao/agenda`}>{topicoAtual}</a>
		</p>
	{/if}

	{#if erro}
		<p class="erro" role="alert">{erro}</p>
	{/if}
	{#if mensagem}
		<p class="sucesso" role="status">{mensagem}</p>
	{/if}

	{#if representada}
		<p class="telegrama" role="note">{t('Pela mesa: você está no lugar de {delegacao}.', { delegacao: representada.nome })}</p>
	{/if}
	{#if restrita}
		<p class="telegrama" role="note">{t('Tecnologia restrita: durante a sessão, a mesa registra as falas e os votos.')}</p>
	{/if}

	{#if impedida}
		<p class="erro" role="alert">{t('Sua delegação está impedida pela crise: {motivo}', { motivo: impedida })}</p>
	{/if}

	{#if minhaVez}<p class="sua-vez" role="status">{t('A palavra é sua')}</p>{/if}

	<!-- Passo 43: no notebook, o que a delegação faz à esquerda e o que acontece na sala à
	     direita; no celular, a ação vem primeiro. -->
	<div class="sessao-colunas">
		<div class="cartoes sessao-acao">
			<AlertaCrise incidentes={data.incidentes} {diferenca} />
			{#if momento === 'pausa' && eu && !restrita && !impedida}
				<article class="cartao cartao--destaque pausa-pontos" aria-labelledby="c-pausa">
					<h2 id="c-pausa">{t('Há pontos ou moções?')}</h2>
					<button class="botao" type="button" onclick={irAoPonto}>{t('Fazer um ponto ou moção')}</button>
				</article>
			{/if}
			{#if eu && !minhaPresenca && minhaSituacao !== 'suspensa'}
				{@const avisei = sessao.avisos.some((a) => a.delegacao?.id === eu.delegacao_id)}
				<article class="cartao cartao--destaque" aria-labelledby="c-chegada">
					<h2 id="c-chegada">{t('Sua delegação está ausente na chamada')}</h2>
					{#if avisei}
						<p>{t('Aguardando a mesa confirmar a presença.')}</p>
					{:else}
						<p class="suave">{t('Chegou agora? Avise a mesa para entrar na chamada e votar.')}</p>
						<button
							class="botao"
							type="button"
							onclick={() => executar(supabase.rpc('avisar_chegada', { p_comite: data.comite.id }), t('A mesa foi avisada.'))}
							>{t('Cheguei')}</button
						>
					{/if}
				</article>
			{/if}
			{#each desconfiancas as p (p.id)}
				{@const assinou = p.assinaturas.some((a) => a.delegacao_id === eu?.delegacao_id)}
				<article class="cartao" aria-labelledby={`c-desconfianca-${p.id}`}>
					<h2 id={`c-desconfianca-${p.id}`}>{t('Pedido de não-confiança')}</h2>
					<p>
						{p.delegacao?.nome} ·
						<Contagem
							rotulo={t('{n} de {total} assinaturas para ir a voto', {
								n: p.assinaturas.length,
								total: assinaturasDesconfianca(data.regras.assinaturas_desconfianca_fracao, data.delegacoes)
							})}
							itens={p.assinaturas.map((a) => ({
								texto: data.delegacoes.find((d) => d.id === a.delegacao_id)?.nome ?? '',
								href: `/comite/${data.comite.sigla}/delegacao/${a.delegacao_id}`
							}))}
						/>
					</p>
					{#if eu && !restrita && !assinou}
						<button class="botao" type="button" onclick={() => executar(supabase.rpc('assinar_mocao', { p_ponto: p.id }))}
							>{t('Assinar o pedido')}</button
						>
					{:else if assinou}
						<p class="suave">{t('Sua delegação assinou.')}</p>
					{/if}
				</article>
			{/each}
			{#if data.votacao}
				<article class="cartao cartao--destaque" aria-labelledby="c-votacao">
					<h2 id="c-votacao" tabindex="-1">{data.votacao.aberta ? t('Votação aberta') : t('Última votação')}</h2>
					<p class="destaque"><button class="abre-ficha" type="button" onclick={() => (verVotacao = true)}>{data.votacao.objeto}</button></p>
					{#if data.votacao.aberta && data.votacao.nominal}<p><strong>{t('Votação nominal:')}</strong> {t('a mesa chama as delegações em ordem alfabética.')}</p>{/if}
					{#if !data.votacao.aberta}
						<p>{textoResultado(data.votacao)}</p>
						<ListaVotos sigla={data.comite.sigla} delegacoes={data.delegacoes} votos={data.votacao.votos} tipo={data.votacao.tipo} {presentes} />
					{:else if impedida}
						<p class="suave">{t('Sua delegação está impedida pela crise.')}</p>
					{:else if meuVoto || posso.length}
						<Votar votacaoId={data.votacao.id} escolhas={posso} {meuVoto} representada={representada?.id} onerro={(m) => (erro = m)} />
					{:else if eu}
						<p class="suave">{t('Sua delegação não vota nesta questão (ausente na chamada, observadora ou suspensa).')}</p>
					{/if}
				</article>
			{/if}
			{#if eu && !restrita && !impedida && data.fase !== 'plenaria'}
				<article class="cartao" aria-labelledby="c-placa">
					<h2 id="c-placa">{t('Sua placa')}</h2>
					{#if naListaCurta >= 0}
						<p class="sucesso" role="status">{t('Sua delegação é a {n}ª da lista curta.', { n: naListaCurta + 1 })}</p>
					{/if}
					<BotaoPlaca comiteId={data.comite.id} {posicao} nome={eu.delegacao_nome ?? ''} onerro={(m) => (erro = m)} />
					<p>
						<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => placa?.abrir()}>
							{t('Mostrar placa em tela cheia')}
						</button>
					</p>
				</article>

			{/if}
		{#if eu && !restrita && !impedida}
			<section class="cartao" aria-labelledby="t-ponto">
				<h2 id="t-ponto">{t('Ponto ou moção')}</h2>
				<form class="formulario" onsubmit={enviarPonto}>
					<label class="campo">
						{t('Tipo')}
						<select id="tipo-ponto" bind:value={tipoPonto}>
							{#each tiposEmOrdem as tipo (tipo)}
								<option value={tipo}>{PONTOS[tipo]}</option>
							{/each}
						</select>
					</label>
					{#if tipoPonto === 'topico_no_topo'}
						<label class="campo">
							{t('Tópico')}
							<select bind:value={topico}>
								{#each data.comite.topicos as tp, i (tp)}
									<option value={i + 1}>{i + 1}. {tp}</option>
								{/each}
							</select>
						</label>
					{:else if tipoPonto === 'informal_informal'}
						<label class="campo campo--curto">
							{t('Minutos (até {n} por sessão)', { n: data.regras.informal_informal_max_min })}
							<input type="number" min="1" max={data.regras.informal_informal_max_min} required bind:value={minutos} />
						</label>
					{/if}
					<label class="campo">
						{t('Detalhe (opcional)')}
						<textarea maxlength="300" bind:value={detalhe} {@attach contador(detalhe)}></textarea>
					</label>
					<button class="botao">{t('Enviar à mesa')}</button>
				</form>
				{#if meusPontos.length}
					<ul class="lista" aria-label={t('Seus pontos e moções')}>
						{#each meusPontos as ponto (ponto.id)}
							<li>
								<button class="abre-ficha" type="button" onclick={() => (pontoVisto = ponto.id)}>{descreverPonto(ponto)}</button>
								<span
									class="selo {ponto.status === 'aceito' ? 'selo--ok' : ponto.status === 'recusado' ? 'selo--erro' : 'selo--info'}"
									>{situacaoDoPonto(ponto)}</span
								>
								{@render retirar(ponto)}
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<Modal classe="placa" bind:this={placa} nome="Placa de {eu.delegacao_nome}">
				<Bandeira codigo={eu.delegacao_bandeira} />
				<p>{eu.delegacao_nome}</p>
				<form method="dialog"><button class="botao botao--secundario">{t('Fechar')}</button></form>
			</Modal>
		{/if}
		</div>
		<div class="cartoes sessao-sala">
			<article class="cartao cartao--ao-vivo" aria-labelledby="c-palavra">
				<h2 id="c-palavra">{t('Com a palavra')}</h2>
				{#if data.estado.orador}
					<p class="destaque com-bandeira">
						<Bandeira codigo={data.estado.orador.bandeira} />
						{data.estado.orador.nome}
					</p>
				{:else}
					<p class="suave">{t('Ninguém com a palavra.')}</p>
				{/if}
				<Cronometro cronometro={data.estado} avisoSeg={data.regras.aviso_fala_seg} {diferenca} />
				{#if temDebate(data.estado)}
					<p class="rotulo">{FORMAS[data.estado.forma]} · {t('tempo do debate')}</p>
					<Cronometro cronometro={relogioDebate(data.estado)} avisoSeg={60} {diferenca} />
				{/if}
			</article>

			<!-- Passo 46: anotar e preparar a próxima fala sem sair da sessão (no celular, uma folha). -->
			{#if eu && !restrita && !representada}
				<NotaRapida comite={data.comite} estado={data.estado} onresultado={(r) => ({ erro, mensagem } = r)} />
			{/if}

			{#if lista.length}
				<article class="cartao" aria-labelledby="c-lista">
					<h2 id="c-lista">{emDiscussao ? t('Lista especial') : t('Lista de oradores')}</h2>
					{#if emDiscussao}
						<p>{descreverPonto(emDiscussao)}</p>
					{/if}
					<ol class="lista">
						{#each lista as inscricao (inscricao.id)}
							<li>
								<NomeDelegacao ficha sigla={data.comite.sigla} delegacao={inscricao.delegacao} />
								{#if inscricao.lado}<span class="selo">{inscricao.lado === 'a_favor' ? t('A favor') : t('Contra')}</span>{/if}
								{#if inscricao.falou}<span class="selo selo--ok">{t('Falou')}</span>{/if}
							</li>
						{/each}
					</ol>
				</article>
			{/if}

			{#if emDiscussao && eu && !restrita}
				<article class="cartao" aria-labelledby="c-inscricao">
					<h2 id="c-inscricao">{t('Lista especial aberta')}</h2>
					<p>{descreverPonto(emDiscussao)}. {t('Até 2 discursos a favor e 2 contra.')}</p>
					<div class="acoes">
						<button class="botao" type="button" onclick={() => inscrever('a_favor')}>{t('Falar a favor')}</button>
						<button class="botao botao--secundario" type="button" onclick={() => inscrever('contra')}>{t('Falar contra')}</button>
					</div>
				</article>
			{/if}
			{#if eu && !restrita && !impedida && data.fase !== 'plenaria'}
				<article class="cartao" aria-labelledby="c-fila">
					<h2 id="c-fila">{t('Pedidos de fala')}</h2>
					<ol class="lista">
						{#each fila as pedido (pedido.id)}
							<li><NomeDelegacao ficha sigla={data.comite.sigla} delegacao={pedido.delegacao} /></li>
						{:else}
							<li class="suave">{t('Nenhuma placa levantada.')}</li>
						{/each}
					</ol>
				</article>
			{/if}
		{#if data.votacoes.length}
			<section aria-labelledby="t-votacoes">
				<h2 id="t-votacoes">{t('Votações desta sessão')}</h2>
				{#each data.votacoes as v (v.id)}
					<details class="votacao-historico">
						<summary>
							{v.objeto}
							<span class="selo {v.aprovada ? 'selo--ok' : 'selo--erro'}">{v.aprovada ? t('Aprovada') : t('Rejeitada')}</span>
						</summary>
						<p>{textoResultado(v)}</p>
						<ListaVotos sigla={data.comite.sigla} delegacoes={data.delegacoes} votos={v.votos} tipo={v.tipo} {presentes} />
					</details>
				{/each}
			</section>
		{/if}
		</div>
	</div>
{/if}

{#snippet retirar(ponto: NonNullable<typeof pontoDaFicha>)}
	{#if ponto.status === 'aberto' && ponto.delegacao?.id === eu?.delegacao_id}
		<button
			class="botao botao--secundario botao--pequeno"
			type="button"
			onclick={() => executar(supabase.rpc('retirar_ponto', { p_ponto: ponto.id }), t('Pedido retirado.'))}>{t('Retirar')}</button
		>
	{/if}
{/snippet}

<FichaVotacao
	votacao={verVotacao ? data.votacao : null}
	sigla={data.comite.sigla}
	delegacoes={data.delegacoes}
	{presentes}
	onclose={() => (verVotacao = false)}
/>
<FichaPonto ponto={pontoDaFicha} sigla={data.comite.sigla} acoes={retirar} onclose={() => (pontoVisto = null)} />
