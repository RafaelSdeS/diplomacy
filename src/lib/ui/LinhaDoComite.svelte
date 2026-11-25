<script lang="ts">
	// Passo 61: o caminho inteiro do comitê, sempre à vista: a plenária de abertura (briefing →
	// discursos → moção do tópico) e depois cada tópico, pela ordem dele. O momento atual em
	// destaque, com o "Agora" e o "Depois" de cada papel. Compacta (Agora): só as duas frases.
	import { t } from '#lib/i18n.svelte.ts';
	import { momentoDoComite, type Estado, type Papel } from '#lib/momento.ts';
	import { doTopico, type Ordem } from '#lib/ordem.ts';
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import TrilhaDoTopico from './TrilhaDoTopico.svelte';

	type Props = { sigla: string; estado: Estado | null; papel: Papel; ordem: Ordem; topicos?: string[]; compacta?: boolean };
	let { sigla, estado, papel, ordem, topicos = [], compacta = false }: Props = $props();

	const topico = $derived(estado?.topico_atual ?? null);
	const resumo = $derived(topico ? doTopico(ordem, topico) : null);
	const momento = $derived(momentoDoComite(estado, papel, resumo ?? undefined));
	const PLENARIA = (): [string, string][] => [
		['briefing', t('Briefing')],
		['discursos', t('Discursos de abertura')],
		['topico', t('Moção do tópico')]
	];
	const naPlenaria = $derived(momento.passo === 'plenaria');
	const etapa = $derived(estado?.etapa_plenaria ?? 'briefing');
	const feitaNaPlenaria = (e: string) => PLENARIA().findIndex(([x]) => x === e) < PLENARIA().findIndex(([x]) => x === etapa);
</script>

<section class={['linha-comite', compacta && 'linha-comite--compacta']} aria-label={t('Momento do comitê')}>
	{#if !compacta}
		<ol class="linha-comite-passos">
			<li class={naPlenaria ? 'atual' : 'feito'} aria-current={naPlenaria ? 'step' : undefined}>{t('Plenária de abertura')}</li>
			{#each estado?.topico_atual ? [estado.topico_atual] : [] as n (n)}
				<li class="atual" aria-current="step">{t('Tópico {n}', { n })}: {topicos[n - 1]}</li>
			{:else}
				<li>{t('Debate dos tópicos')}</li>
			{/each}
		</ol>
		{#if naPlenaria}
			<ol class="trilha-topico-plenaria">
				{#each PLENARIA() as [e, rotulo] (e)}
					<li class={e === etapa ? 'atual' : feitaNaPlenaria(e) ? 'feito' : ''} aria-current={e === etapa ? 'step' : undefined}>{rotulo}</li>
				{/each}
			</ol>
		{:else if resumo && topico}
			<TrilhaDoTopico compacta {sigla} mesa={papel === 'mesa'} {...resumo} />
		{/if}
	{/if}
	<p class="linha-comite-agora">
		<strong>{t('Agora')}:</strong> {momento.agora}
		{#if compacta}{@render ajuda()}{/if}
	</p>
	{#if !compacta}
		<p class="linha-comite-depois"><strong>{t('Depois')}:</strong> {momento.depois} {@render ajuda()}</p>
	{/if}
</section>

{#snippet ajuda()}
	<a class="linha-comite-ajuda" href={`/comite/${sigla}/como-funciona`}
		><CircleHelp aria-hidden="true" size={14} strokeWidth={1.75} /> {t('Como funciona o comitê')}</a
	>
{/snippet}
