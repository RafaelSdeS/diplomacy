<script lang="ts">
	import Bandeira from './Bandeira.svelte';

	// Bandeira e nome da delegação, como link para a página dela (passo 26). No telão,
	// que é projetado, sem link.
	type Props = { sigla: string; delegacao: { id: string; nome: string; bandeira: string | null } | null | undefined; link?: boolean };
	let { sigla, delegacao, link = true }: Props = $props();
</script>

{#if delegacao}
	{#if link}
		<a class="com-bandeira nome-delegacao" href={`/comite/${sigla}/delegacao/${delegacao.id}`}
			><Bandeira codigo={delegacao.bandeira} /> {delegacao.nome}</a
		>
	{:else}
		<span class="com-bandeira"><Bandeira codigo={delegacao.bandeira} /> {delegacao.nome}</span>
	{/if}
{/if}
