<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';

	// Um número que abre o que ele conta (passo 33). <details> e não a Popover API, que
	// iPhones antigos não têm. Enter abre (o próprio <details>), Esc fecha.
	type Item = { texto: string; href?: string };
	type Props = { rotulo: string; itens: Item[]; vazio?: string };
	let { rotulo, itens, vazio }: Props = $props();
	// O estado vem do próprio elemento: o evento "toggle" chega depois, e um Esc logo
	// após abrir se perderia.
	let caixa = $state<HTMLDetailsElement>();
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && caixa?.open && (caixa.open = false)} />

<details class="contagem" bind:this={caixa}>
	<summary>{rotulo}</summary>
	<ul class="contagem-lista">
		{#each itens as item, i (i)}
			<li>{#if item.href}<a href={item.href}>{item.texto}</a>{:else}{item.texto}{/if}</li>
		{:else}
			<li class="suave">{vazio ?? t('Ninguém ainda.')}</li>
		{/each}
	</ul>
</details>
