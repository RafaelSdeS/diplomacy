<script lang="ts">
	import BotaoImprimir from '#lib/ui/BotaoImprimir.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const origem = typeof location === 'undefined' ? '' : location.origin;
</script>

<svelte:head>
	<title>Certificados · {data.evento}</title>
</svelte:head>

<div class="impressao">
	<BotaoImprimir voltar="/secretaria/certificados" />
	<h1 class="nao-imprimir">{data.certificados.length} certificados</h1>
	{#each data.certificados as c (c.codigo)}
		<article class="a4 certificado" aria-label={`Certificado de ${c.nome}`}>
			<p class="rotulo">{data.evento}</p>
			<h2>Certificado de participação</h2>
			<p class="certificado-texto">
				Certificamos que <strong>{c.nome}</strong> participou do {data.evento} como {c.funcao}.
			</p>
			<p class="certificado-codigo">
				Código de verificação: <strong>{c.codigo}</strong><br />
				Confira em {origem}/verificar/{c.codigo}
			</p>
		</article>
	{/each}
</div>
