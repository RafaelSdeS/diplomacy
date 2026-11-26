<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { menu } from '#lib/menu.ts';
	import CircleUser from '@lucide/svelte/icons/circle-user';
	import Languages from '@lucide/svelte/icons/languages';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import { idioma } from '#lib/i18n.svelte.ts';
	import { alternarIdioma, alternarTema, favoritos, pedirSaida, tema, temaAtual, TROCAR_IDIOMA } from '#lib/preferencias.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Passo 43: as telas que não cabem na barra do celular, cada uma dizendo para que serve.
	const todas = $derived(menu(data.participacoes));
	// Passo 51 (preferências): as favoritas (marcadas no "Ir para…") vêm primeiro.
	const favoritas = $derived(favoritos.hrefs.flatMap((h) => todas.filter((i) => i.href === h)));
	const telas = $derived(todas.filter((i) => i.mais && !favoritos.hrefs.includes(i.href)));
	// Passo 47: no celular, o que no notebook fica no cabeçalho (tema, idioma, Sair), com texto.
	const escuro = $derived(tema.escolhido ? tema.escolhido === 'dark' : temaAtual() === 'dark');
</script>

<svelte:head>
	<title>{tituloDaAba(t('Mais'))}</title>
</svelte:head>

<h1>{t('Mais')}</h1>

{#if favoritas.length}
	<h2 class="rotulo">{t('Favoritos')}</h2>
	<ul class="grade-atalhos" aria-label={t('Favoritos')}>
		{#each favoritas as tela (tela.href)}
			<li>
				<a href={tela.href}>
					<tela.icone aria-hidden="true" size={24} strokeWidth={1.5} />
					<span class="grade-atalhos-nome">{tela.rotulo}</span>
					<span class="grade-atalhos-descricao">{tela.descricao}</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}

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
	<li>
		<button type="button" onclick={alternarTema}>
			{#if escuro}<Sun aria-hidden="true" size={24} strokeWidth={1.5} />{:else}<Moon aria-hidden="true" size={24} strokeWidth={1.5} />{/if}
			<span class="grade-atalhos-nome">{escuro ? t('Usar o tema claro') : t('Usar o tema escuro')}</span>
			<span class="grade-atalhos-descricao">{t('Só neste aparelho')}</span>
		</button>
	</li>
	<li>
		<button type="button" onclick={() => data.usuario && alternarIdioma(data.usuario.id)}>
			<Languages aria-hidden="true" size={24} strokeWidth={1.5} />
			<span class="grade-atalhos-nome" lang={idioma.atual === 'en' ? 'pt-BR' : 'en'}
				>{idioma.atual === 'en' ? TROCAR_IDIOMA.pt : TROCAR_IDIOMA.en}</span
			>
			<span class="grade-atalhos-descricao">{t('Fica salvo no seu perfil')}</span>
		</button>
	</li>
	<li>
		<button type="button" onclick={pedirSaida}>
			<LogOut aria-hidden="true" size={24} strokeWidth={1.5} />
			<span class="grade-atalhos-nome">{t('Sair')}</span>
			<span class="grade-atalhos-descricao">{t('Remove os dados desta sessão do aparelho')}</span>
		</button>
	</li>
</ul>

<!-- Passo 54: o acesso discreto à página "Sobre". -->
<p class="suave"><a href="/sobre">{t('Sobre o Diplomacy')}</a></p>
