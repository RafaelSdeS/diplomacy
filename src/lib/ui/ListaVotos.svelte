<script lang="ts">
	import { idioma, t } from '#lib/i18n.svelte.ts';
	import Check from '@lucide/svelte/icons/check';
	import Minus from '@lucide/svelte/icons/minus';
	import X from '@lucide/svelte/icons/x';
	import { agruparVotos, type Escolha } from '#lib/votacao.ts';
	import Bandeira from './Bandeira.svelte';

	// Como cada delegação votou, em grupos: ícone, título e contagem, nunca só cor.
	type Delegacao = { id: string; nome: string; bandeira: string | null; situacao?: string | null };
	type Props = {
		delegacoes: Delegacao[];
		votos: { delegacao_id: string; escolha: Escolha }[];
		tipo: string;
		presentes: Set<string>;
	};
	let { delegacoes, votos, tipo, presentes }: Props = $props();

	const grupos = $derived(agruparVotos(delegacoes, votos, tipo, presentes, idioma.atual === 'en' ? 'en' : 'pt-BR'));
	const TITULOS = $derived([
		{ chave: 'a_favor' as const, rotulo: t('A favor'), Icone: Check },
		{ chave: 'contra' as const, rotulo: t('Contra'), Icone: X },
		{ chave: 'abstencao' as const, rotulo: t('Abstenção'), Icone: Minus },
		{ chave: 'sem_voto' as const, rotulo: t('Não votaram'), Icone: null }
	]);
</script>

<div class="lista-votos">
	{#each TITULOS as { chave, rotulo, Icone } (chave)}
		{#if grupos[chave].length}
			<div class="lista-votos-grupo voto--{chave}">
				<p class="rotulo">
					{#if Icone}<Icone aria-hidden="true" size={14} />{/if}
					{rotulo} ({grupos[chave].length})
				</p>
				<ul aria-label={`${rotulo} (${grupos[chave].length})`}>
					{#each grupos[chave] as d (d.id)}
						<li class="com-bandeira"><Bandeira codigo={d.bandeira} /> {d.nome}</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/each}
</div>
