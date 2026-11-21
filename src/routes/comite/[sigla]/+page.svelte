<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { bilingue, t } from '#lib/i18n.svelte.ts';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const SITUACOES = bilingue({ membro: '', observadora: 'Observadora', suspensa: 'Suspensa' } as const);
</script>

<svelte:head>
	<title>{tituloDaAba(data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">{t('Comitê')} · {data.comite.sigla}</p>
<h1>{data.comite.nome}</h1>

<section aria-labelledby="t-topicos">
	<h2 id="t-topicos">{t('Tópicos')}</h2>
	<ol>
		{#each data.comite.topicos as topico (topico)}
			<li>{topico}</li>
		{/each}
	</ol>
	{#if data.comite.guia_url}
		<p><a href={data.comite.guia_url} target="_blank" rel="noopener">{t('Guia de estudos')}</a></p>
	{/if}
	<p><a href={`/comite/${data.comite.sigla}/regras`}>{t('Regras de procedimento')}</a></p>
	<p><a href={`/comite/${data.comite.sigla}/blocos`}>{t('Blocos e documentos')}</a></p>
	<p><a href={`/comite/${data.comite.sigla}/votacoes`}>{t('Votações')}</a></p>
	<p><a href={`/comite/${data.comite.sigla}/caderno`}>{t('Caderno da delegação')}</a></p>
	<p><a href={`/comite/${data.comite.sigla}/dpo`}>{t('DPO (documento de posição oficial)')}</a></p>
	<p><a href={`/comite/${data.comite.sigla}/cartas`}>{t('Cartas diplomáticas')}</a></p>
	<p><a href={`/comite/${data.comite.sigla}/mensagens`}>{t('Mensagens (bilhetes e conversa com a mesa)')}</a></p>
</section>

<section aria-labelledby="t-mesa">
	<h2 id="t-mesa">{t('Mesa')}</h2>
	<ul class="lista">
		{#each data.mesa as membro (membro.id)}
			<li>{membro.pessoa?.nome}</li>
		{:else}
			<li class="suave">{t('A mesa ainda não foi definida.')}</li>
		{/each}
	</ul>
</section>

<section aria-labelledby="t-delegacoes">
	<h2 id="t-delegacoes">{t('Delegações')} ({data.delegacoes.length})</h2>
	<ul class="lista grade">
		{#each data.delegacoes as d (d.id)}
			<li>
				<span class="com-bandeira">
					<Bandeira codigo={d.bandeira} />
					<span>
						<a href={`/comite/${data.comite.sigla}/delegacao/${d.id}`}>{d.nome}</a>
						<span class="detalhe">{d.nome_oficial}{SITUACOES[d.situacao] ? ` · ${SITUACOES[d.situacao]}` : ''}</span>
					</span>
				</span>
			</li>
		{/each}
	</ul>
</section>
