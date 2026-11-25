<script lang="ts">
	// Passo 56: a ordem do tópico, à vista: agenda → working papers → projeto → resolução. Cada
	// etapa diz se está feita, é a atual ou vem depois, com a contagem e o lugar de fazer. A
	// atual tem uma linha com o que fazer agora, por papel. Compacta (Sessão, Agora): só os
	// ícones, e a etapa atual por extenso.
	import { t } from '#lib/i18n.svelte.ts';
	import { ETAPAS, estadoDaEtapa, etapaAtual, oQueFazer, ROTULO_ETAPA, type Doc, type Etapa } from '#lib/ordem.ts';
	import Check from '@lucide/svelte/icons/check';
	import FileText from '@lucide/svelte/icons/file-text';
	import Gavel from '@lucide/svelte/icons/gavel';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';
	import ScrollText from '@lucide/svelte/icons/scroll-text';

	type Props = {
		sigla: string;
		topico: number;
		adotada: boolean;
		propostas: number;
		documentos: Doc[];
		mesa?: boolean;
		compacta?: boolean;
		/** Na aba Documentos, as etapas depois da agenda abrem a lista num modal. */
		onetapa?: (etapa: Exclude<Etapa, 'agenda'>) => void;
	};
	let { sigla, topico, adotada, propostas, documentos, mesa = false, compacta = false, onetapa }: Props = $props();

	const doTopico = $derived(documentos.filter((d) => d.topico === topico));
	const atual = $derived(etapaAtual({ adotada, documentos: doTopico }));
	const ICONES = { agenda: ListOrdered, working_papers: FileText, projeto: ScrollText, resolucao: Gavel };
	const quantos = (tipo: string) => doTopico.filter((d) => d.tipo === tipo).length;
	const contagem = $derived<Record<Etapa, string>>({
		agenda: adotada ? t('adotada') : propostas === 1 ? t('1 proposta') : t('{n} propostas', { n: propostas }),
		working_papers: quantos('working_paper') === 1 ? t('1 working paper') : t('{n} working papers', { n: quantos('working_paper') }),
		projeto: quantos('projeto') === 1 ? t('1 projeto') : t('{n} projetos', { n: quantos('projeto') }),
		resolucao: atual === 'encerrado' ? t('aprovada') : t('nenhuma ainda')
	});
	const destino = $derived<Record<Etapa, string>>({
		agenda: `/comite/${sigla}/sessao/agenda?topico=${topico}`,
		working_papers: `/comite/${sigla}/documentos`,
		projeto: `/comite/${sigla}/documentos`,
		resolucao: `/comite/${sigla}/votacoes`
	});
</script>

<nav class={['trilha-topico', compacta && 'trilha-topico--compacta']} aria-label={t('Ordem do tópico {n}', { n: topico })}>
	<ol>
		{#each ETAPAS as etapa (etapa)}
			{@const estado = estadoDaEtapa(etapa, atual)}
			{@const Icone = estado === 'feita' ? Check : ICONES[etapa]}
			<li class="trilha-etapa trilha-etapa--{estado}">
				{#snippet conteudo()}
					<Icone aria-hidden="true" size={16} strokeWidth={1.75} />
					<span class={compacta && estado !== 'atual' ? 'so-leitor' : undefined}>{ROTULO_ETAPA()[etapa]}</span>
					{#if !compacta}<span class="detalhe">{contagem[etapa]}</span>{/if}
				{/snippet}
				{#if onetapa && etapa !== 'agenda'}
					<button type="button" aria-current={estado === 'atual' ? 'step' : undefined} onclick={() => onetapa(etapa)}>{@render conteudo()}</button>
				{:else}
					<a href={destino[etapa]} aria-current={estado === 'atual' ? 'step' : undefined} title={compacta ? ROTULO_ETAPA()[etapa] : undefined}
						>{@render conteudo()}</a
					>
				{/if}
			</li>
		{/each}
	</ol>
	<p class="trilha-agora">{oQueFazer(atual, mesa)}</p>
</nav>
