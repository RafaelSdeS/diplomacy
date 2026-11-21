<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import BotaoImprimir from '#lib/ui/BotaoImprimir.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const m = $derived(data.modelo);
</script>

<svelte:head>
	<title>{tituloDaAba(t('DPO'), m.pais)}</title>
</svelte:head>

<div class="impressao">
	<BotaoImprimir voltar={`/comite/${data.sigla}/dpo`} />
	<article class="a4 dpo" lang={data.idioma === 'en' ? 'en' : 'pt-BR'} aria-label={t('DPO para impressão')}>
		<header class="dpo-cabecalho">
			<Bandeira codigo={m.bandeira} />
			<h1>{m.pais}</h1>
			<p class="dpo-titulo">{m.titulo}</p>
			<p>{m.comite}</p>
		</header>
		<p class="faixa">{m.topico}</p>
		<div class="dpo-texto">
			{#each m.paragrafos as p, i (i)}<p>{p}</p>{/each}
		</div>
		{#if m.referencias.length}
			<section class="referencias" aria-label={m.rotuloReferencias}>
				<h2>{m.rotuloReferencias}</h2>
				<ol>
					{#each m.referencias as r (r.numero)}<li>{r.texto}</li>{/each}
				</ol>
			</section>
		{/if}
		<p class="assinatura">{m.assinatura}</p>
	</article>
</div>
