<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';

	// Um número que abre o que ele conta (passo 33). <details> e não a Popover API, que
	// iPhones antigos não têm. Enter abre (o próprio <details>), Esc fecha.
	type Item = { texto: string; href?: string };
	type Props = { rotulo: string; itens: Item[]; vazio?: string };
	let { rotulo, itens, vazio }: Props = $props();
	let aberto = $state(false);
</script>

<svelte:window onkeydown={(e) => aberto && e.key === 'Escape' && (aberto = false)} />

<details class="contagem" bind:open={aberto}>
	<summary>{rotulo}</summary>
	<ul class="contagem-lista">
		{#each itens as item, i (i)}
			<li>{#if item.href}<a href={item.href}>{item.texto}</a>{:else}{item.texto}{/if}</li>
		{:else}
			<li class="suave">{vazio ?? t('Ninguém ainda.')}</li>
		{/each}
	</ul>
</details>
