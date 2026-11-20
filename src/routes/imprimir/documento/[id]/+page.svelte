<script lang="ts">
	import { nomeDoDocumento } from '#lib/formatacao.ts';
	import BotaoImprimir from '#lib/ui/BotaoImprimir.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const f = $derived(data.formatado);
</script>

<svelte:head>
	<title>{nomeDoDocumento(data.documento)} · UFRGSMUN</title>
</svelte:head>

<div class="impressao">
	<BotaoImprimir voltar={`/documento/${data.documento.id}`} />
	<article class="a4 resolucao" aria-label="Documento para impressão">
		<p class="rotulo">{data.sigla}</p>
		<h1>{nomeDoDocumento(data.documento)}</h1>
		{#each f.textos as t (t.id)}<p>{t.texto}</p>{/each}
		{#each f.preambulares as p (p.id)}<p class="preambular">{p.texto}</p>{/each}
		<p class="linha-do-comite">{f.linhaDoComite}</p>
		{#each f.operativas as o (o.id)}
			<p class="operativa">{o.numero}. {o.texto}</p>
			{#each o.subitens as s (s.id)}<p class="subitem-doc">{s.letra}) {s.texto}</p>{/each}
		{/each}
		{#if f.signatarios}<p class="signatarios">{f.signatarios}</p>{/if}
	</article>
</div>
