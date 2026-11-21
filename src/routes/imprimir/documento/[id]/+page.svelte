<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { nomeDoDocumento } from '#lib/formatacao.ts';
	import BotaoImprimir from '#lib/ui/BotaoImprimir.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const f = $derived(data.formatado);
</script>

<svelte:head>
	<title>{nomeDoDocumento(data.documento, data.idioma)} · UFRGSMUN</title>
</svelte:head>

<div class="impressao">
	<BotaoImprimir voltar={`/documento/${data.documento.id}`} />
	<article class="a4 resolucao" lang={data.idioma === 'en' ? 'en' : 'pt-BR'} aria-label={t('Documento para impressão')}>
		<p class="rotulo">{data.sigla}</p>
		<h1>{nomeDoDocumento(data.documento, data.idioma)}</h1>
		{#each f.textos as tp (tp.id)}<p>{tp.texto}</p>{/each}
		{#each f.preambulares as p (p.id)}<p class="preambular">{p.texto}</p>{/each}
		<p class="linha-do-comite">{f.linhaDoComite}</p>
		{#each f.operativas as o (o.id)}
			<p class="operativa">{o.numero}. {o.texto}</p>
			{#each o.subitens as s (s.id)}<p class="subitem-doc">{s.letra}) {s.texto}</p>{/each}
		{/each}
		{#if f.signatarios}<p class="signatarios">{f.signatarios}</p>{/if}
	</article>
</div>
