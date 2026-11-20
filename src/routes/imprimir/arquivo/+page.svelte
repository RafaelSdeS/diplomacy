<script lang="ts">
	import { paragrafos } from '#lib/impressao.ts';
	import BotaoImprimir from '#lib/ui/BotaoImprimir.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const a = $derived(data.arquivo);
	const titulo = $derived(`${a.evento.nome} ${a.evento.ano}`);
</script>

<svelte:head>
	<title>Arquivo · {titulo}</title>
</svelte:head>

<div class="impressao">
	<BotaoImprimir voltar="/secretaria/dados" />
	<article class="a4" aria-label="Arquivo da edição">
		<h1>Arquivo da edição · {titulo}</h1>
		{#each a.comites as c (c.sigla)}
			<section class="arquivo-comite" aria-label={c.sigla}>
				<h2>{c.sigla} · {c.nome}</h2>
				{#if c.agenda?.length}
					<h3>Agenda aprovada</h3>
					<ol>{#each c.agenda as p, i (i)}<li>{p.texto}</li>{/each}</ol>
				{/if}
				{#each c.resolucoes ?? [] as r, i (i)}
					<h3>{r.tipo === 'projeto' ? 'Resolução' : 'Resolução de crise'} {r.numero ?? ''}: {r.titulo}</h3>
					{#each (r.clausulas ?? []).filter((x) => x.tipo === 'preambular') as cl, j (j)}<p class="preambular">{cl.texto}</p>{/each}
					<p class="linha-do-comite">{c.nome_oficial}:</p>
					{#each (r.clausulas ?? []).filter((x) => x.tipo === 'operativa') as cl, j (j)}<p>{j + 1}. {cl.texto}</p>{/each}
				{/each}
				{#if c.noticias?.length}
					<h3>Notícias publicadas</h3>
					{#each c.noticias as n, i (i)}
						<h4>{n.titulo}</h4>
						{#if n.linha_fina}<p class="linha-fina">{n.linha_fina}</p>{/if}
						{#each paragrafos(n.texto) as p, j (j)}<p>{p}</p>{/each}
					{/each}
				{/if}
			</section>
		{/each}
		{#if a.atualizacoes_de_crise.length}
			<section class="arquivo-comite" aria-label="Atualizações de crise">
				<h2>Atualizações de crise</h2>
				{#each a.atualizacoes_de_crise as u, i (i)}<p>{u.texto}</p>{/each}
			</section>
		{/if}
	</article>
</div>
