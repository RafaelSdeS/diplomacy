<script lang="ts">
	import { APP, marca } from '#lib/titulo.svelte.ts';
	import { locale, t } from '#lib/i18n.svelte.ts';
	import { paragrafos } from '#lib/impressao.ts';
	import { TIPOS_NOTICIA } from '#lib/press.ts';
	import BotaoImprimir from '#lib/ui/BotaoImprimir.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const dia = $derived(
		new Date(`${data.dia}T12:00:00-03:00`).toLocaleDateString(locale(), { dateStyle: 'full', timeZone: 'America/Sao_Paulo' })
	);
</script>

<svelte:head>
	<title>{data.veiculo.nome} · {data.especial ? t('Edição especial') : t('Edição do dia')}</title>
</svelte:head>

<div class="impressao">
	<BotaoImprimir voltar={`/press/${data.sigla}`} />
	<article class="a4 edicao" aria-label={t('Edição para impressão')}>
		<header class="edicao-cabecalho">
			<p class="rotulo">{t('Simulação')} · {marca.evento ?? APP}</p>
			<h1>{data.veiculo.nome}</h1>
			<p>{data.especial ? t('Edição especial') : t('Edição do dia')} · {dia}</p>
		</header>
		{#each data.noticias as n (n.id)}
			<section class="edicao-materia" aria-label={n.titulo}>
				<p class="rotulo">{TIPOS_NOTICIA[n.tipo]}</p>
				<h2>{n.titulo}</h2>
				{#if n.linha_fina}<p class="linha-fina">{n.linha_fina}</p>{/if}
				{#each paragrafos(n.texto) as p, i (i)}<p>{p}</p>{/each}
			</section>
		{:else}
			<p>{t('Nenhuma matéria publicada neste dia.')}</p>
		{/each}
	</article>
</div>
