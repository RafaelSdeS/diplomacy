<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { FORMAS, PONTOS } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import Cronometro from '#lib/ui/Cronometro.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let diferenca = $state(0);
	let erro = $state('');
	let tempoFala = $state(0);
	let forma = $state<keyof typeof FORMAS>('formal_formal');
	let minutos = $state<number | null>(null);

	const sessao = $derived(data.estado?.sessao);
	const fila = $derived(sessao?.pedidos ?? []);
	const pontosAbertos = $derived((sessao?.pontos ?? []).filter((p) => p.status === 'aberto'));
	const pausado = $derived(data.estado?.cronometro_pausado_restante_seg !== null);
	const correndo = $derived(!!data.estado?.cronometro_inicio && !pausado);
	// O campo começa com o tempo de fala da sessão (e segue o banco enquanto ninguém mexe nele).
	$effect(() => {
		if (data.estado) tempoFala = data.estado.tempo_fala_seg;
	});

	const comite = $derived(data.comite.id);
	const mensagens = (codigo: string) =>
		({
			'42501': 'Você não preside mais esta sessão.',
			'23514': `O informal-informal passaria de ${data.regras.informal_informal_max_min} minutos nesta sessão.`,
			'22023': 'Informe quantos minutos.'
		})[codigo] ?? 'Não foi possível. Tente de novo.';

	async function executar(acao: PromiseLike<{ error: { code: string } | null }>) {
		erro = '';
		const { error } = await acao;
		if (error) erro = mensagens(error.code);
		await invalidate('app:sessao-ao-vivo');
	}

	// Sem delegação (null), encerra a fala. Os tipos gerados não sabem que o argumento aceita null.
	const darPalavra = (delegacao: string | null) =>
		executar(supabase.rpc('dar_palavra', { p_comite: comite, p_delegacao: delegacao as string, p_seg: tempoFala }));
	const pausarOuRetomar = () =>
		pausado
			? executar(supabase.rpc('retomar', { p_comite: comite }))
			: correndo
				? executar(supabase.rpc('pausar', { p_comite: comite }))
				: undefined;
	const somar = (seg: number) => executar(supabase.rpc('somar_segundos', { p_comite: comite, p_seg: seg }));

	function mudarForma(evento: SubmitEvent) {
		evento.preventDefault();
		void executar(
			supabase.rpc('mudar_forma', { p_comite: comite, p_forma: forma, p_minutos: minutos ?? undefined })
		);
	}

	// Atalhos: espaço pausa ou retoma; Enter dá a palavra ao próximo da fila. Só
	// valem fora de campos e botões, onde as teclas já têm outro uso.
	function atalho(evento: KeyboardEvent) {
		const alvo = evento.target as HTMLElement;
		if (alvo.closest('input, textarea, select, button, a, dialog, [contenteditable]')) return;
		if (evento.key === ' ') {
			evento.preventDefault();
			void pausarOuRetomar();
		} else if (evento.key === 'Enter' && fila[0]?.delegacao) {
			evento.preventDefault();
			void darPalavra(fila[0].delegacao.id);
		}
	}
</script>

<svelte:window onkeydown={data.podePresidir && sessao ? atalho : undefined} />

<svelte:head>
	<title>Presidência · {data.comite.sigla} · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">Comitê · {data.comite.sigla} <AoVivo comiteId={data.comite.id} bind:diferenca /></p>
<h1>Presidência</h1>

{#if !data.podePresidir}
	<p class="suave">Você não preside esta sessão. Quando for a vez da sua delegação, o painel aparece aqui.</p>
{:else if !data.estado || !sessao}
	<p class="suave">Nenhuma sessão aberta. A mesa abre a sessão na chamada.</p>
{:else}
	<p class="suave">
		Sessão {sessao.numero} · {FORMAS[data.estado.forma]} · Presidência: {sessao.presidencia?.nome ?? 'Mesa'}
	</p>
	<p class="suave atalhos-ajuda">Atalhos: <kbd>Espaço</kbd> pausa ou retoma; <kbd>Enter</kbd> dá a palavra ao próximo da fila.</p>

	{#if erro}
		<p class="erro" role="alert">{erro}</p>
	{/if}

	<div class="painel">
		<section class="cartao" aria-labelledby="t-fila">
			<h2 id="t-fila">Pedidos de fala</h2>
			<ol class="lista">
				{#each fila as pedido (pedido.id)}
					<li>
						<span class="com-bandeira"><Bandeira codigo={pedido.delegacao?.bandeira} /> {pedido.delegacao?.nome}</span>
						<button
							class="botao botao--pequeno"
							type="button"
							aria-label={`Dar a palavra a ${pedido.delegacao?.nome}`}
							onclick={() => darPalavra(pedido.delegacao!.id)}>Dar a palavra</button
						>
					</li>
				{:else}
					<li class="suave">Nenhuma placa levantada.</li>
				{/each}
			</ol>
		</section>

		<section class="cartao" aria-labelledby="t-palavra">
			<h2 id="t-palavra">Com a palavra</h2>
			{#if data.estado.orador}
				<p class="destaque com-bandeira"><Bandeira codigo={data.estado.orador.bandeira} /> {data.estado.orador.nome}</p>
			{:else}
				<p class="suave">Ninguém com a palavra.</p>
			{/if}
			<Cronometro cronometro={data.estado} avisoSeg={data.regras.aviso_fala_seg} {diferenca} grande />
			<div class="acoes">
				<button class="botao" type="button" disabled={!pausado && !correndo} onclick={pausarOuRetomar}>
					{pausado ? 'Retomar' : 'Pausar'}
				</button>
				<button class="botao botao--secundario" type="button" disabled={!data.estado.cronometro_inicio} onclick={() => somar(30)}
					>+30 s</button
				>
				<button class="botao botao--secundario" type="button" disabled={!data.estado.cronometro_inicio} onclick={() => somar(-10)}
					>−10 s</button
				>
				<button class="botao botao--secundario" type="button" disabled={!data.estado.orador} onclick={() => darPalavra(null)}
					>Encerrar fala</button
				>
			</div>
			<label class="campo campo--curto">
				Tempo de fala (segundos)
				<input type="number" min="1" max="3600" bind:value={tempoFala} />
			</label>

			<form class="formulario" onsubmit={mudarForma} aria-label="Forma de debate">
				<label class="campo">
					Forma de debate
					<select bind:value={forma}>
						{#each Object.entries(FORMAS) as [valor, rotulo] (valor)}
							<option value={valor}>{rotulo}</option>
						{/each}
					</select>
				</label>
				<label class="campo campo--curto">
					Minutos {forma === 'informal_informal' ? `(até ${data.regras.informal_informal_max_min} por sessão)` : '(opcional)'}
					<input type="number" min="1" max="120" bind:value={minutos} required={forma === 'informal_informal'} />
				</label>
				<button class="botao botao--secundario">Mudar a forma de debate</button>
			</form>
		</section>

		<section class="cartao" aria-labelledby="t-pontos">
			<h2 id="t-pontos">Pontos e moções</h2>
			<ul class="lista">
				{#each pontosAbertos as ponto (ponto.id)}
					<li>
						<span>
							{PONTOS[ponto.tipo as keyof typeof PONTOS]}
							<span class="detalhe">{ponto.delegacao?.nome}{ponto.detalhe ? ` · ${ponto.detalhe}` : ''}</span>
						</span>
						<span class="acoes">
							<button
								class="botao botao--pequeno"
								type="button"
								aria-label={`Aceitar: ${PONTOS[ponto.tipo as keyof typeof PONTOS]}, ${ponto.delegacao?.nome}`}
								onclick={() => executar(supabase.rpc('responder_ponto', { p_ponto: ponto.id, p_status: 'aceito' }))}
								>Aceitar</button
							>
							<button
								class="botao botao--secundario botao--pequeno"
								type="button"
								aria-label={`Recusar: ${PONTOS[ponto.tipo as keyof typeof PONTOS]}, ${ponto.delegacao?.nome}`}
								onclick={() => executar(supabase.rpc('responder_ponto', { p_ponto: ponto.id, p_status: 'recusado' }))}
								>Recusar</button
							>
						</span>
					</li>
				{:else}
					<li class="suave">Nenhum ponto ou moção.</li>
				{/each}
			</ul>
			{#if !sessao.de_votacao}
				<button
					class="botao botao--secundario"
					type="button"
					onclick={() => executar(supabase.rpc('passar_presidencia', { p_comite: comite }))}
					>Passar a presidência</button
				>
			{/if}
		</section>
	</div>
{/if}
