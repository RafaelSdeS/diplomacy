<script lang="ts">
	import { abrirFicha } from '#lib/ficha.svelte.ts';
	import Bandeira from './Bandeira.svelte';

	// Bandeira e nome da delegação (passo 26). Passo 55: em todo lugar, abre a ficha por cima
	// da tela, com as minhas anotações sobre ela. `link={false}` só no telão e na impressão,
	// que não têm ação; `ficha={false}` leva à página da delegação.
	type Props = {
		sigla: string;
		delegacao: { id: string; nome: string; bandeira: string | null } | null | undefined;
		link?: boolean;
		ficha?: boolean;
	};
	let { sigla, delegacao, link = true, ficha = true }: Props = $props();
</script>

{#if delegacao}
	{#if !link}
		<span class="com-bandeira"><Bandeira codigo={delegacao.bandeira} /> {delegacao.nome}</span>
	{:else if ficha}
		<button class="com-bandeira nome-delegacao nome-delegacao--ficha" type="button" onclick={() => abrirFicha(sigla, delegacao.id)}
			><Bandeira codigo={delegacao.bandeira} /> {delegacao.nome}</button
		>
	{:else}
		<a class="com-bandeira nome-delegacao" href={`/comite/${sigla}/delegacao/${delegacao.id}`}
			><Bandeira codigo={delegacao.bandeira} /> {delegacao.nome}</a
		>
	{/if}
{/if}
