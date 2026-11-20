<script lang="ts">
	import Hand from '@lucide/svelte/icons/hand';
	import { invalidate } from '$app/navigation';
	import {
		descreverPonto,
		FORMAS,
		mensagemDeErro,
		PONTOS,
		pontosEmOrdem,
		SITUACAO_PONTO,
		type TipoPonto
	} from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import Cronometro from '#lib/ui/Cronometro.svelte';
	import { assinaturasDesconfianca, escolhasPermitidas, ESCOLHAS, ETAPAS, FASES, listaAtiva, presidenciaEmVigor, textoResultado, type Escolha } from '#lib/votacao.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let diferenca = $state(0);
	let erro = $state('');
	let mensagem = $state('');
	let tipoPonto = $state<TipoPonto>('ponto_duvida');
	let detalhe = $state('');
	let topico = $state(1);
	let minutos = $state(10);
	let placa = $state<HTMLDialogElement>();

	const eu = $derived(data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado'));
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
	const minhaPresenca = $derived(sessao?.presenca.find((p) => p.delegacao_id === eu?.delegacao_id)?.situacao);
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

	const placaAcao = (funcao: 'levantar_placa' | 'baixar_placa') =>
		executar(supabase.rpc(funcao, { p_comite: data.comite.id }));
	const votar = (escolha: Escolha) =>
		executar(supabase.rpc('votar', { p_votacao: data.votacao!.id, p_escolha: escolha }));
	const inscrever = (lado: 'a_favor' | 'contra') =>
		executar(supabase.rpc('inscrever_lista', { p_ponto: emDiscussao!.id, p_lado: lado }), 'Sua delegação entrou na lista.');

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
			`${PONTOS[tipoPonto]}: enviado à presidência.`
		);
		if (ok) detalhe = '';
	}
</script>

<svelte:head>
	<title>Sessão · {data.comite.sigla} · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">Comitê · {data.comite.sigla} <AoVivo comiteId={data.comite.id} bind:diferenca /></p>
<h1>{sessao ? `Sessão ${sessao.numero}` : 'Sessão'}</h1>

{#if !data.estado || !sessao}
	<p class="suave">Nenhuma sessão aberta. A mesa abre a sessão.</p>
{:else}
	<p class="suave">
		{FASES[data.fase]}{data.fase === 'plenaria' ? ` · ${ETAPAS[data.estado.etapa_plenaria].rotulo}` : ''} ·
		{FORMAS[data.estado.forma]} · Presidência: {presidenciaEmVigor(data.fase, data.estado.mesa_assumiu, sessao.presidencia?.nome)}
	</p>
	{#if topicoAtual}
		<p class="topico-atual"><span class="rotulo">Tópico em debate</span> {topicoAtual}</p>
	{/if}

	{#if erro}
		<p class="erro" role="alert">{erro}</p>
	{/if}
	{#if mensagem}
		<p class="sucesso" role="status">{mensagem}</p>
	{/if}

	{#if restrita}
		<p class="telegrama" role="note">Tecnologia restrita: durante a sessão, a mesa registra as falas e os votos.</p>
	{/if}

	<div class="cartoes">
		{#each desconfiancas as p (p.id)}
			{@const assinou = p.assinaturas.some((a) => a.delegacao_id === eu?.delegacao_id)}
			<article class="cartao" aria-labelledby={`c-desconfianca-${p.id}`}>
				<h2 id={`c-desconfianca-${p.id}`}>Pedido de não-confiança</h2>
				<p>
					{p.delegacao?.nome} · {p.assinaturas.length} de {assinaturasDesconfianca(data.regras.assinaturas_desconfianca_fracao, data.delegacoes)}
					assinaturas para ir a voto
				</p>
				{#if eu && !restrita && !assinou}
					<button class="botao" type="button" onclick={() => executar(supabase.rpc('assinar_mocao', { p_ponto: p.id }))}
						>Assinar o pedido</button
					>
				{:else if assinou}
					<p class="suave">Sua delegação assinou.</p>
				{/if}
			</article>
		{/each}
		{#if data.votacao}
			<article class="cartao cartao--destaque" aria-labelledby="c-votacao">
				<h2 id="c-votacao">{data.votacao.aberta ? 'Votação aberta' : 'Última votação'}</h2>
				<p class="destaque">{data.votacao.objeto}</p>
				{#if data.votacao.aberta && data.votacao.nominal}<p><strong>Votação nominal:</strong> a mesa chama as delegações em ordem alfabética.</p>{/if}
				{#if !data.votacao.aberta}
					<p>{textoResultado(data.votacao)}</p>
				{:else if meuVoto}
					<p>Voto da sua delegação: <strong>{ESCOLHAS[meuVoto]}</strong></p>
				{:else if posso.length}
					<div class="acoes">
						{#each posso as escolha (escolha)}
							<button class="botao botao--grande" type="button" onclick={() => votar(escolha)}>{ESCOLHAS[escolha]}</button>
						{/each}
					</div>
				{:else if eu}
					<p class="suave">Sua delegação não vota nesta questão (ausente na chamada, observadora ou suspensa).</p>
				{/if}
			</article>
		{/if}

		<article class="cartao" aria-labelledby="c-palavra">
			<h2 id="c-palavra">Com a palavra</h2>
			{#if data.estado.orador}
				<p class="destaque com-bandeira">
					<Bandeira codigo={data.estado.orador.bandeira} />
					{data.estado.orador.nome}
				</p>
			{:else}
				<p class="suave">Ninguém com a palavra.</p>
			{/if}
			<Cronometro cronometro={data.estado} avisoSeg={data.regras.aviso_fala_seg} {diferenca} />
		</article>

		{#if lista.length}
			<article class="cartao" aria-labelledby="c-lista">
				<h2 id="c-lista">{emDiscussao ? 'Lista especial' : 'Lista de oradores'}</h2>
				{#if emDiscussao}
					<p>{descreverPonto(emDiscussao)}</p>
				{/if}
				<ol class="lista">
					{#each lista as inscricao (inscricao.id)}
						<li>
							<span class="com-bandeira"><Bandeira codigo={inscricao.delegacao?.bandeira} /> {inscricao.delegacao?.nome}</span>
							{#if inscricao.lado}<span class="selo">{inscricao.lado === 'a_favor' ? 'A favor' : 'Contra'}</span>{/if}
							{#if inscricao.falou}<span class="selo selo--ok">Falou</span>{/if}
						</li>
					{/each}
				</ol>
			</article>
		{/if}

		{#if emDiscussao && eu && !restrita}
			<article class="cartao" aria-labelledby="c-inscricao">
				<h2 id="c-inscricao">Lista especial aberta</h2>
				<p>{descreverPonto(emDiscussao)}. Até 2 discursos a favor e 2 contra.</p>
				<div class="acoes">
					<button class="botao" type="button" onclick={() => inscrever('a_favor')}>Falar a favor</button>
					<button class="botao botao--secundario" type="button" onclick={() => inscrever('contra')}>Falar contra</button>
				</div>
			</article>
		{/if}

		{#if eu && !restrita && data.fase !== 'plenaria'}
			<article class="cartao" aria-labelledby="c-placa">
				<h2 id="c-placa">Sua placa</h2>
				{#if posicao >= 0}
					<p class="destaque">Placa levantada · {posicao + 1}ª na fila</p>
					<button class="botao botao--grande" type="button" aria-pressed="true" onclick={() => placaAcao('baixar_placa')}>
						<Hand aria-hidden="true" size={20} /> Baixar placa
					</button>
				{:else}
					<p class="suave">{eu.delegacao_nome}</p>
					<button class="botao botao--grande" type="button" aria-pressed="false" onclick={() => placaAcao('levantar_placa')}>
						<Hand aria-hidden="true" size={20} /> Levantar placa
					</button>
				{/if}
				<p>
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => placa?.showModal()}>
						Mostrar placa em tela cheia
					</button>
				</p>
			</article>

			<article class="cartao" aria-labelledby="c-fila">
				<h2 id="c-fila">Pedidos de fala</h2>
				<ol class="lista">
					{#each fila as pedido (pedido.id)}
						<li><span class="com-bandeira"><Bandeira codigo={pedido.delegacao?.bandeira} /> {pedido.delegacao?.nome}</span></li>
					{:else}
						<li class="suave">Nenhuma placa levantada.</li>
					{/each}
				</ol>
			</article>
		{/if}
	</div>

	{#if eu && !restrita}
		<section aria-labelledby="t-ponto">
			<h2 id="t-ponto">Ponto ou moção</h2>
			<form class="formulario" onsubmit={enviarPonto}>
				<label class="campo">
					Tipo
					<select bind:value={tipoPonto}>
						{#each tiposEmOrdem as tipo (tipo)}
							<option value={tipo}>{PONTOS[tipo]}</option>
						{/each}
					</select>
				</label>
				{#if tipoPonto === 'topico_no_topo'}
					<label class="campo">
						Tópico
						<select bind:value={topico}>
							{#each data.comite.topicos as t, i (t)}
								<option value={i + 1}>{i + 1}. {t}</option>
							{/each}
						</select>
					</label>
				{:else if tipoPonto === 'informal_informal'}
					<label class="campo campo--curto">
						Minutos (até {data.regras.informal_informal_max_min} por sessão)
						<input type="number" min="1" max={data.regras.informal_informal_max_min} required bind:value={minutos} />
					</label>
				{/if}
				<label class="campo">
					Detalhe (opcional)
					<textarea maxlength="300" bind:value={detalhe}></textarea>
				</label>
				<button class="botao">Enviar à presidência</button>
			</form>
			{#if meusPontos.length}
				<ul class="lista" aria-label="Seus pontos e moções">
					{#each meusPontos as ponto (ponto.id)}
						<li>
							{descreverPonto(ponto)}
							<span
								class="selo {ponto.status === 'aceito' ? 'selo--ok' : ponto.status === 'recusado' ? 'selo--erro' : 'selo--info'}"
								>{SITUACAO_PONTO[ponto.status as keyof typeof SITUACAO_PONTO]}</span
							>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<dialog class="placa" bind:this={placa} aria-label="Placa de {eu.delegacao_nome}">
			<Bandeira codigo={eu.delegacao_bandeira} />
			<p>{eu.delegacao_nome}</p>
			<form method="dialog"><button class="botao botao--secundario">Fechar</button></form>
		</dialog>
	{/if}
{/if}

<nav class="atalhos" aria-label="Telas da sessão">
	{#if data.podePresidir}
		<a class="botao" href={`/comite/${data.comite.sigla}/sessao/presidencia`}>Painel da presidência</a>
	{/if}
	{#if ehMesa}
		<a class="botao botao--secundario" href={`/comite/${data.comite.sigla}/sessao/chamada`}>Chamada e rodízio</a>
	{/if}
	<a class="botao botao--secundario" href={`/comite/${data.comite.sigla}/sessao/agenda`}>Agenda</a>
	<a class="botao botao--secundario" href={`/comite/${data.comite.sigla}/blocos`}>Blocos e documentos</a>
	<a class="botao botao--secundario" href={`/comite/${data.comite.sigla}/cartas`}>Cartas</a>
	<a class="botao botao--secundario" href={`/comite/${data.comite.sigla}/mensagens`}>Mensagens</a>
	{#if data.comite.crise_ligada && eu}
		<a class="botao botao--secundario" href={`/comite/${data.comite.sigla}/crise`}>Notas de crise</a>
	{/if}
	<a class="botao botao--secundario" href={`/telao/${data.comite.sigla}`}>Telão</a>
</nav>
