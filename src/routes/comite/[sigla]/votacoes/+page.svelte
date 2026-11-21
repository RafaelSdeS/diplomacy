<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import ListaVotos from '#lib/ui/ListaVotos.svelte';
	import { textoResultado } from '#lib/votacao.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{t('Votações')} · {data.comite.sigla} · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">{t('Comitê')} · {data.comite.sigla}</p>
<h1>{t('Votações')}</h1>

{#each data.sessoes as [numero, votacoes] (numero)}
	<section aria-labelledby={`t-sessao-${numero}`}>
		<h2 id={`t-sessao-${numero}`}>{t('Sessão {n}', { n: numero })}</h2>
		{#each votacoes as v (v.id)}
			<details class="votacao-historico">
				<summary>
					{v.objeto}
					<span class="selo {v.aprovada ? 'selo--ok' : 'selo--erro'}">{v.aprovada ? t('Aprovada') : t('Rejeitada')}</span>
				</summary>
				<p>{textoResultado(v)}</p>
				<ListaVotos
					delegacoes={data.delegacoes}
					votos={v.votos}
					tipo={v.tipo}
					presentes={new Set((v.sessao?.presenca ?? []).map((p) => p.delegacao_id))}
				/>
			</details>
		{/each}
	</section>
{:else}
	<p class="suave">{t('Nenhuma votação encerrada ainda.')}</p>
{/each}
