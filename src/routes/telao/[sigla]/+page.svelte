<script lang="ts">
	import { onMount } from 'svelte';
	import { FORMAS } from '#lib/sessao.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import Cronometro from '#lib/ui/Cronometro.svelte';
	import type { PageProps } from './$types';

	// O telão roda no notebook do projetor, logado com a conta da mesa, sem botões:
	// um clique (ou F) põe em tela cheia, e o Wake Lock não deixa a tela apagar.
	let { data }: PageProps = $props();
	let diferenca = $state(0);

	const sessao = $derived(data.estado?.sessao);
	const proximos = $derived((sessao?.pedidos ?? []).slice(0, 4));

	const telaCheia = () => void document.documentElement.requestFullscreen?.().catch(() => {});

	onMount(() => {
		let trava: WakeLockSentinel | undefined;
		const pedir = async () => {
			try {
				trava = await navigator.wakeLock?.request('screen');
			} catch {
				// sem permissão ou sem suporte: a tela pode apagar, nada mais
			}
		};
		const aoVoltar = () => {
			if (document.visibilityState === 'visible') void pedir();
		};
		void pedir();
		document.addEventListener('visibilitychange', aoVoltar);
		return () => {
			document.removeEventListener('visibilitychange', aoVoltar);
			void trava?.release();
		};
	});
</script>

<svelte:window onclick={telaCheia} onkeydown={(e) => e.key.toLowerCase() === 'f' && telaCheia()} />

<svelte:head>
	<title>Telão · {data.comite.sigla} · UFRGSMUN</title>
</svelte:head>

<div class="telao">
	<header class="telao-topo">
		<div>
			<p class="telao-comite">{data.comite.sigla} · {data.comite.nome}</p>
			<h1 class="telao-sessao">
				{#if sessao && data.estado}
					Sessão {sessao.numero} · {FORMAS[data.estado.forma]}
				{:else}
					Sessão não iniciada
				{/if}
			</h1>
		</div>
		<div class="telao-presidencia">
			{#if sessao}
				<span class="rotulo">Presidência</span>
				<span>{sessao.presidencia?.nome ?? 'Mesa'}</span>
			{/if}
			<AoVivo comiteId={data.comite.id} bind:diferenca />
		</div>
	</header>

	<section class="telao-orador" aria-label="Com a palavra">
		{#if data.estado?.orador}
			<Bandeira codigo={data.estado.orador.bandeira} />
			<p class="telao-nome">{data.estado.orador.nome}</p>
		{:else}
			<p class="telao-nome telao-nome--vazio">{sessao ? 'Aguardando orador' : 'UFRGSMUN'}</p>
		{/if}
		{#if data.estado}
			<Cronometro cronometro={data.estado} avisoSeg={data.regras.aviso_fala_seg} {diferenca} grande />
		{/if}
	</section>

	<aside class="telao-fila" aria-label="Próximos oradores">
		<p class="rotulo">Próximos</p>
		<ol>
			{#each proximos as pedido (pedido.id)}
				<li class="com-bandeira"><Bandeira codigo={pedido.delegacao?.bandeira} /> {pedido.delegacao?.nome}</li>
			{:else}
				<li class="telao-vazio">Nenhuma placa levantada</li>
			{/each}
		</ol>
	</aside>
</div>
