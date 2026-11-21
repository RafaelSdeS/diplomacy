<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { page } from '$app/state';

	const titulos: Record<number, string> = {
		403: t('Sem permissão'),
		404: t('Página não encontrada')
	};
</script>

<svelte:head>
	<title>{tituloDaAba(titulos[page.status] ?? t('Algo deu errado'))}</title>
</svelte:head>

<p class="rotulo">{t('Erro')} {page.status}</p>
<h1>{titulos[page.status] ?? t('Algo deu errado')}</h1>
{#if page.error?.message}
	<p>{page.error.message}</p>
{/if}
<p><a href="/">{t('Voltar ao início')}</a></p>
