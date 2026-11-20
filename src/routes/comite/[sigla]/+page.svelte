<script lang="ts">
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const SITUACOES = { membro: '', observadora: 'Observadora', suspensa: 'Suspensa' } as const;
</script>

<svelte:head>
	<title>{data.comite.sigla} · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">Comitê · {data.comite.sigla}</p>
<h1>{data.comite.nome}</h1>

<section aria-labelledby="t-topicos">
	<h2 id="t-topicos">Tópicos</h2>
	<ol>
		{#each data.comite.topicos as topico (topico)}
			<li>{topico}</li>
		{/each}
	</ol>
	{#if data.comite.guia_url}
		<p><a href={data.comite.guia_url} target="_blank" rel="noopener">Guia de estudos</a></p>
	{/if}
	<p><a href={`/comite/${data.comite.sigla}/regras`}>Regras de procedimento</a></p>
	<p><a href={`/comite/${data.comite.sigla}/blocos`}>Blocos e documentos</a></p>
</section>

<section aria-labelledby="t-mesa">
	<h2 id="t-mesa">Mesa</h2>
	<ul class="lista">
		{#each data.mesa as membro (membro.id)}
			<li>{membro.pessoa?.nome}</li>
		{:else}
			<li class="suave">A mesa ainda não foi definida.</li>
		{/each}
	</ul>
</section>

<section aria-labelledby="t-delegacoes">
	<h2 id="t-delegacoes">Delegações ({data.delegacoes.length})</h2>
	<ul class="lista grade">
		{#each data.delegacoes as d (d.id)}
			<li>
				<span class="com-bandeira">
					<Bandeira codigo={d.bandeira} />
					<span>
						{d.nome}
						<span class="detalhe">{d.nome_oficial}{SITUACOES[d.situacao] ? ` · ${SITUACOES[d.situacao]}` : ''}</span>
					</span>
				</span>
			</li>
		{/each}
	</ul>
</section>
