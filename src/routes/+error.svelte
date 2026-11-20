<script lang="ts">
	import { page } from '$app/state';

	const titulos: Record<number, string> = {
		403: 'Sem permissão',
		404: 'Página não encontrada'
	};
</script>

<svelte:head>
	<title>{titulos[page.status] ?? 'Algo deu errado'} · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">Erro {page.status}</p>
<h1>{titulos[page.status] ?? 'Algo deu errado'}</h1>
{#if page.error?.message}
	<p>{page.error.message}</p>
{/if}
<p><a href="/">Voltar ao início</a></p>
