<script lang="ts">
	import Coffee from '@lucide/svelte/icons/coffee';
	import Flag from '@lucide/svelte/icons/flag';
	import Gavel from '@lucide/svelte/icons/gavel';
	import { TIPOS_ITEM } from '#lib/cronograma.ts';

	// Passo 41: o tipo do item do cronograma, com ícone e texto; "outro" não aparece.
	let { tipo }: { tipo?: string } = $props();
	const ICONES = { sessao: Gavel, intervalo: Coffee, cerimonia: Flag };
	const Icone = $derived(tipo && tipo in ICONES ? ICONES[tipo as keyof typeof ICONES] : null);
</script>

{#if Icone && tipo}<span class="etiqueta"><Icone aria-hidden="true" size={14} /> {TIPOS_ITEM[tipo]}</span>{/if}
