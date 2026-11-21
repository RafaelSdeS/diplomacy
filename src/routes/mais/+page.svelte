<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { menu } from '#lib/menu.ts';
	import CircleUser from '@lucide/svelte/icons/circle-user';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Passo 43: as telas que não cabem na barra do celular, cada uma dizendo para que serve.
	const telas = $derived(menu(data.participacoes).filter((i) => i.mais));
</script>

<svelte:head>
	<title>{tituloDaAba(t('Mais'))}</title>
</svelte:head>

<h1>{t('Mais')}</h1>

<ul class="grade-atalhos">
	{#each telas as tela (tela.href)}
		<li>
			<a href={tela.href}>
				<tela.icone aria-hidden="true" size={24} strokeWidth={1.5} />
				<span class="grade-atalhos-nome">{tela.rotulo}</span>
				<span class="grade-atalhos-descricao">{tela.descricao}</span>
			</a>
		</li>
	{/each}
	<li>
		<a href="/perfil">
			<CircleUser aria-hidden="true" size={24} strokeWidth={1.5} />
			<span class="grade-atalhos-nome">{t('Perfil')}</span>
			<span class="grade-atalhos-descricao">{t('Seus dados, idioma, tema e notificações')}</span>
		</a>
	</li>
</ul>
