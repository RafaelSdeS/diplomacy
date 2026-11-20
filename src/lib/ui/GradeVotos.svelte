<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Minus from '@lucide/svelte/icons/minus';
	import X from '@lucide/svelte/icons/x';
	import { ESCOLHAS, type Escolha } from '#lib/votacao.ts';
	import Bandeira from './Bandeira.svelte';

	// Cada delegação com o voto dela: ícone e texto, nunca só a cor.
	type Delegacao = { id: string; nome: string; bandeira: string | null };
	type Props = { delegacoes: Delegacao[]; votos: { delegacao_id: string; escolha: Escolha }[] };
	let { delegacoes, votos }: Props = $props();

	const votoDe = $derived(new Map(votos.map((v) => [v.delegacao_id, v.escolha])));
	const ICONES = { a_favor: Check, contra: X, abstencao: Minus };
</script>

<ul class="grade-votos">
	{#each delegacoes as d (d.id)}
		{@const escolha = votoDe.get(d.id)}
		{@const Icone = escolha ? ICONES[escolha] : null}
		<li class="voto voto--{escolha ?? 'pendente'}">
			<span class="com-bandeira"><Bandeira codigo={d.bandeira} /> {d.nome}</span>
			<span class="voto-escolha">
				{#if Icone}<Icone aria-hidden="true" size={16} />{/if}
				{escolha ? ESCOLHAS[escolha] : 'Aguardando'}
			</span>
		</li>
	{/each}
</ul>
