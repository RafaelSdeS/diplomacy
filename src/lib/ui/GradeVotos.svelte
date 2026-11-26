<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import Check from '@lucide/svelte/icons/check';
	import Minus from '@lucide/svelte/icons/minus';
	import X from '@lucide/svelte/icons/x';
	import { ESCOLHAS, type Escolha } from '#lib/votacao.ts';
	import Bandeira from './Bandeira.svelte';
	import NomeDelegacao from './NomeDelegacao.svelte';

	// Cada delegação com o voto dela: ícone e texto, nunca só a cor.
	type Delegacao = { id: string; nome: string; bandeira: string | null };
	// Passo 55: com `sigla` (o painel), o país abre a ficha; sem ela (o telão), não tem ação.
	// Passo 51: `compacta` (o painel com a votação aberta) põe o voto numa linha, com texto curto;
	// o leitor de tela continua ouvindo o texto completo.
	type Props = { delegacoes: Delegacao[]; votos: { delegacao_id: string; escolha: Escolha }[]; encerrada?: boolean; sigla?: string; compacta?: boolean };
	let { delegacoes, votos, encerrada = false, sigla, compacta = false }: Props = $props();
	const CURTO = (): Record<string, string> => ({ a_favor: t('A favor'), contra: t('Contra'), abstencao: t('Abst.'), pendente: t('Falta') });

	const votoDe = $derived(new Map(votos.map((v) => [v.delegacao_id, v.escolha])));
	const ICONES = { a_favor: Check, contra: X, abstencao: Minus };
</script>

<ul class={['grade-votos', compacta && 'grade-votos--compacta']}>
	{#each delegacoes as d (d.id)}
		{@const escolha = votoDe.get(d.id)}
		{@const Icone = escolha ? ICONES[escolha] : null}
		<li class="voto voto--{escolha ?? 'pendente'}">
			{#if sigla}<NomeDelegacao {sigla} delegacao={d} />{:else}<span class="com-bandeira"><Bandeira codigo={d.bandeira} /> {d.nome}</span>{/if}
			<span class="voto-escolha">
				{#if Icone}<Icone aria-hidden="true" size={16} />{/if}
				{#if compacta}
					<span aria-hidden="true">{CURTO()[escolha ?? 'pendente']}</span>
					<span class="so-leitor">{escolha ? ESCOLHAS[escolha] : t('Aguardando')}</span>
				{:else}
					{escolha ? ESCOLHAS[escolha] : encerrada ? t('Não votou') : t('Aguardando')}
				{/if}
			</span>
		</li>
	{/each}
</ul>
