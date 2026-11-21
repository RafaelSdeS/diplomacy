<script lang="ts">
	import { abrirFicha } from '#lib/ficha.svelte.ts';
	import Bandeira from './Bandeira.svelte';

	// Bandeira e nome da delegação, como link para a página dela (passo 26). No telão,
	// que é projetado, sem link. Nas telas ao vivo (painel, sessão), `ficha` abre o resumo
	// por cima, sem sair da tela (passo 43).
	type Props = {
		sigla: string;
		delegacao: { id: string; nome: string; bandeira: string | null } | null | undefined;
		link?: boolean;
		ficha?: boolean;
	};
	let { sigla, delegacao, link = true, ficha = false }: Props = $props();
</script>

{#if delegacao}
	{#if ficha}
		<button class="com-bandeira nome-delegacao nome-delegacao--ficha" type="button" onclick={() => abrirFicha(sigla, delegacao.id)}
			><Bandeira codigo={delegacao.bandeira} /> {delegacao.nome}</button
		>
	{:else if link}
		<a class="com-bandeira nome-delegacao" href={`/comite/${sigla}/delegacao/${delegacao.id}`}
			><Bandeira codigo={delegacao.bandeira} /> {delegacao.nome}</a
		>
	{:else}
		<span class="com-bandeira"><Bandeira codigo={delegacao.bandeira} /> {delegacao.nome}</span>
	{/if}
{/if}
