<script lang="ts">
	import BotaoImprimir from '#lib/ui/BotaoImprimir.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const m = $derived(data.modelo);
	const data_ = $derived(
		new Date(data.enviadaEm).toLocaleDateString('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' })
	);
</script>

<svelte:head>
	<title>Carta · {m.titulo} · UFRGSMUN</title>
</svelte:head>

<div class="impressao">
	<BotaoImprimir voltar={`/comite/${data.sigla}/cartas`} />
	<article class="a4 carta" aria-label="Carta para impressão">
		<header class="carta-cabecalho">
			<p class="carta-remetente">{m.remetente}</p>
			<p>{m.comite} · {data_}</p>
		</header>
		<p class="carta-para">{m.para}</p>
		<h1>{m.titulo}</h1>
		{#each m.paragrafos as p, i (i)}<p>{p}</p>{/each}
		<p class="assinatura">{m.assinatura}</p>
	</article>
</div>
