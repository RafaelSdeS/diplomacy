<script lang="ts">
	import type House from '@lucide/svelte/icons/house';

	// Passo 51 (lote 0): as ações de uma área em cartões com ícone, nome e uma linha de
	// descrição, no desenho que funcionou na aba Comitê. Vale para as outras abas.
	export type Atalho = { href: string; rotulo: string; descricao: string; icone: typeof House; externo?: boolean };
	let { atalhos, nome }: { atalhos: Atalho[]; nome: string } = $props();
</script>

<nav aria-label={nome}>
	<ul class="grade-atalhos">
		{#each atalhos as a (a.href)}
			<li>
				<a href={a.href} target={a.externo ? '_blank' : undefined} rel={a.externo ? 'noopener' : undefined}>
					<a.icone aria-hidden="true" size={24} strokeWidth={1.5} />
					<span class="grade-atalhos-nome">{a.rotulo}</span>
					<span class="grade-atalhos-descricao">{a.descricao}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>
