<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import BotaoImprimir from '#lib/ui/BotaoImprimir.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const m = $derived(data.modelo);
	// A carta sai no idioma do comitê, como o modelo.
	const lang = $derived(data.idioma === 'en' ? 'en-GB' : 'pt-BR');
	const data_ = $derived(
		new Date(data.enviadaEm).toLocaleDateString(lang, { dateStyle: 'long', timeZone: 'America/Sao_Paulo' })
	);
</script>

<svelte:head>
	<title>{t('Carta')} · {m.titulo} · UFRGSMUN</title>
</svelte:head>

<div class="impressao">
	<BotaoImprimir voltar={`/comite/${data.sigla}/cartas`} />
	<article class="a4 carta" {lang} aria-label={t('Carta para impressão')}>
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
