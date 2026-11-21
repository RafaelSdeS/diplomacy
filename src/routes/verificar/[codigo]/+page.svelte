<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{tituloDaAba('Verificar certificado')}</title>
</svelte:head>

<p class="rotulo">Certificado · {data.codigo.toUpperCase()}</p>
<h1>Verificar certificado</h1>
{#if data.certificado}
	<dl class="verificacao">
		<dt>Nome</dt>
		<dd>{data.certificado.nome}</dd>
		<dt>Evento</dt>
		<dd>{data.certificado.evento}</dd>
		<dt>Função</dt>
		<dd>{data.certificado.funcao}</dd>
	</dl>
	<p class="sucesso" role="status">Certificado válido.</p>
{:else}
	<p class="erro" role="alert">Certificado não encontrado. Confira o código.</p>
{/if}
