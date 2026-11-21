<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { regrasLegiveis } from '#lib/regras.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const regras = $derived(regrasLegiveis(data.regras));
	const grupos = $derived([...new Set(regras.map((r) => r.grupo))]);
</script>

<svelte:head>
	<title>{tituloDaAba(t('Regras'), data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">{t('Comitê')} · {data.comite.sigla}</p>
<h1>{t('Regras de procedimento')}</h1>
<p class="suave">
	{t('Do guia de regras do evento, com os ajustes deste comitê.')}
</p>

{#each grupos as grupo (grupo)}
	<section aria-labelledby={`g-${grupo}`}>
		<h2 id={`g-${grupo}`}>{grupo}</h2>
		<dl class="ficha">
			{#each regras.filter((r) => r.grupo === grupo) as regra (regra.rotulo)}
				<div>
					<dt>{regra.rotulo}</dt>
					<dd>
						{regra.texto}
						{#if regra.rotulo === t('Quórum')}
							<span class="detalhe">{t('Hoje: {n} de {total} delegações.', { n: data.quorum, total: data.previstas })}</span>
						{/if}
					</dd>
				</div>
			{/each}
		</dl>
	</section>
{/each}
