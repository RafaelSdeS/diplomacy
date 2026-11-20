<script lang="ts">
	import Hand from '@lucide/svelte/icons/hand';
	import { invalidate } from '$app/navigation';
	import { FORMAS, PONTOS, SITUACAO_PONTO } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import Cronometro from '#lib/ui/Cronometro.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let diferenca = $state(0);
	let erro = $state('');
	let mensagem = $state('');
	let tipoPonto = $state<keyof typeof PONTOS>('ponto_duvida');
	let detalhe = $state('');
	let placa = $state<HTMLDialogElement>();

	const eu = $derived(data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado'));
	const ehMesa = $derived(data.participacoes.some((p) => p.comite_id === data.comite.id && p.papel === 'mesa'));
	const sessao = $derived(data.estado?.sessao);
	const fila = $derived(sessao?.pedidos ?? []);
	const posicao = $derived(fila.findIndex((p) => p.delegacao?.id === eu?.delegacao_id));
	const meusPontos = $derived((sessao?.pontos ?? []).filter((p) => p.delegacao?.id === eu?.delegacao_id));

	async function chamar(funcao: 'levantar_placa' | 'baixar_placa') {
		erro = '';
		const { error } = await supabase.rpc(funcao, { p_comite: data.comite.id });
		if (error) erro = 'Não foi possível mudar a placa. Tente de novo.';
		await invalidate('app:sessao-ao-vivo');
	}

	async function enviarPonto(evento: SubmitEvent) {
		evento.preventDefault();
		erro = mensagem = '';
		const { error } = await supabase.rpc('enviar_ponto', {
			p_comite: data.comite.id,
			p_tipo: tipoPonto,
			p_detalhe: detalhe
		});
		if (error) {
			erro = 'Não foi possível enviar.';
			return;
		}
		detalhe = '';
		mensagem = `${PONTOS[tipoPonto]} enviado à presidência.`;
		await invalidate('app:sessao-ao-vivo');
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
		{FORMAS[data.estado.forma]} · Presidência: {sessao.presidencia?.nome ?? 'Mesa'}{sessao.de_votacao
			? ' · Sessão de votação'
			: ''}
	</p>

	<div class="cartoes">
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

		{#if eu}
			<article class="cartao" aria-labelledby="c-placa">
				<h2 id="c-placa">Sua placa</h2>
				{#if posicao >= 0}
					<p class="destaque">Placa levantada · {posicao + 1}ª na fila</p>
					<button class="botao botao--grande" type="button" aria-pressed="true" onclick={() => chamar('baixar_placa')}>
						<Hand aria-hidden="true" size={20} /> Baixar placa
					</button>
				{:else}
					<p class="suave">{eu.delegacao_nome}</p>
					<button class="botao botao--grande" type="button" aria-pressed="false" onclick={() => chamar('levantar_placa')}>
						<Hand aria-hidden="true" size={20} /> Levantar placa
					</button>
				{/if}
				<p>
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => placa?.showModal()}>
						Mostrar placa em tela cheia
					</button>
				</p>
			</article>
		{/if}

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
	</div>

	{#if erro}
		<p class="erro" role="alert">{erro}</p>
	{/if}

	{#if eu}
		<section aria-labelledby="t-ponto">
			<h2 id="t-ponto">Ponto ou moção</h2>
			<form class="formulario" onsubmit={enviarPonto}>
				<label class="campo">
					Tipo
					<select bind:value={tipoPonto}>
						{#each Object.entries(PONTOS) as [valor, rotulo] (valor)}
							<option value={valor}>{rotulo}</option>
						{/each}
					</select>
				</label>
				<label class="campo">
					Detalhe (opcional)
					<textarea maxlength="300" bind:value={detalhe}></textarea>
				</label>
				{#if mensagem}
					<p class="sucesso" role="status">{mensagem}</p>
				{/if}
				<button class="botao">Enviar à presidência</button>
			</form>
			{#if meusPontos.length}
				<ul class="lista" aria-label="Seus pontos e moções">
					{#each meusPontos as ponto (ponto.id)}
						<li>
							{PONTOS[ponto.tipo as keyof typeof PONTOS]}
							<span class="selo {ponto.status === 'aceito' ? 'selo--ok' : ponto.status === 'recusado' ? 'selo--erro' : 'selo--info'}"
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
	<a class="botao botao--secundario" href={`/telao/${data.comite.sigla}`}>Telão</a>
</nav>
