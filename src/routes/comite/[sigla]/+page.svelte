<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { bilingue, t } from '#lib/i18n.svelte.ts';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import { abrirFicha } from '#lib/ficha.svelte.ts';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import FileText from '@lucide/svelte/icons/file-text';
	import Gavel from '@lucide/svelte/icons/gavel';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';
	import Mail from '@lucide/svelte/icons/mail';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import Presentation from '@lucide/svelte/icons/presentation';
	import Scale from '@lucide/svelte/icons/scale';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import Siren from '@lucide/svelte/icons/siren';
	import Users from '@lucide/svelte/icons/users';
	import Vote from '@lucide/svelte/icons/vote';
	import GradeAtalhos, { type Atalho } from '#lib/ui/GradeAtalhos.svelte';
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const SITUACOES = bilingue({ membro: '', observadora: 'Observadora', suspensa: 'Suspensa' } as const);
	const sigla = $derived(data.comite.sigla);
	const ehMesa = $derived(
		data.participacoes.some((p) => p.papel === 'secretaria' || (p.papel === 'mesa' && p.comite_id === data.comite.id))
	);
	const minha = $derived(data.participacoes.find((p) => p.papel === 'delegado' && p.comite_id === data.comite.id)?.delegacao_id);

	// Passo 43: o que se faz no comitê, em atalhos que dizem para que servem.
	const atalhos = $derived(
		[
			ehMesa
				? { href: `/comite/${sigla}/sessao/presidencia`, rotulo: t('Painel'), descricao: t('Conduzir a sessão: palavra, pontos e votações'), icone: Gavel }
				: { href: `/comite/${sigla}/sessao`, rotulo: t('Sessão'), descricao: t('A sessão ao vivo: placa, pontos e votos'), icone: Gavel },
			// Passo 61: o caminho do comitê explicado, para quem chega.
			{ href: `/comite/${sigla}/como-funciona`, rotulo: t('Como funciona'), descricao: t('A ordem do comitê e o que cada um faz'), icone: CircleHelp },
			{ href: `/comite/${sigla}/sessao/agenda`, rotulo: t('Agenda'), descricao: t('A agenda de cada tópico'), icone: ListOrdered },
			{ href: `/comite/${sigla}/documentos`, rotulo: t('Documentos'), descricao: t('DPO, projetos, cartas e caderno'), icone: FileText },
			{ href: `/comite/${sigla}/blocos`, rotulo: t('Blocos'), descricao: t('Formar blocos e escrever documentos'), icone: Users },
			{ href: `/comite/${sigla}/dpo`, rotulo: t('DPO'), descricao: t('Documento de posição oficial'), icone: ScrollText },
			{ href: `/comite/${sigla}/cartas`, rotulo: t('Cartas'), descricao: t('Cartas diplomáticas'), icone: Mail },
			{ href: `/comite/${sigla}/mensagens`, rotulo: t('Mensagens'), descricao: t('Bilhetes e conversa com a mesa'), icone: MessagesSquare },
			minha ? { href: `/comite/${sigla}/caderno`, rotulo: t('Caderno'), descricao: t('Suas anotações sobre o debate'), icone: NotebookPen } : null,
			data.comite.crise_ligada && minha
				? { href: `/comite/${sigla}/crise`, rotulo: t('Notas de crise'), descricao: t('Notas da sua delegação à equipe de crise'), icone: Siren }
				: null,
			{ href: `/comite/${sigla}/votacoes`, rotulo: t('Votações'), descricao: t('Quem votou como, em cada votação'), icone: Vote },
			{ href: `/comite/${sigla}/regras`, rotulo: t('Regras de procedimento'), descricao: t('Quórum, maiorias, tempos e moções'), icone: Scale },
			ehMesa ? { href: `/telao/${sigla}`, rotulo: t('Telão'), descricao: t('Para o projetor da sala'), icone: Presentation } : null,
			data.comite.guia_url
				? { href: data.comite.guia_url, rotulo: t('Guia de estudos'), descricao: t('O guia do comitê (abre em outra aba)'), icone: BookOpen, externo: true }
				: null
		].filter((a): a is Atalho => !!a)
	);
</script>

<svelte:head>
	<title>{tituloDaAba(data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">{t('Comitê')} · {data.comite.sigla}</p>
<h1>{data.comite.nome}</h1>

<section aria-labelledby="t-topicos">
	<h2 id="t-topicos">{t('Tópicos')}</h2>
	<ol class="topicos">
		{#each data.comite.topicos as topico (topico)}
			<li>{topico}</li>
		{/each}
	</ol>
</section>

<GradeAtalhos nome={t('Atalhos do comitê')} {atalhos} />

<section aria-labelledby="t-mesa">
	<h2 id="t-mesa">{t('Mesa')}</h2>
	<ul class="mesa-do-comite">
		{#each data.mesa as membro (membro.id)}
			<li>{membro.pessoa?.nome}</li>
		{:else}
			<li class="suave">{t('A mesa ainda não foi definida.')}</li>
		{/each}
	</ul>
</section>

<section aria-labelledby="t-delegacoes">
	<h2 id="t-delegacoes">{t('Delegações')} ({data.delegacoes.length})</h2>
	<ul class="grade-delegacoes">
		{#each data.delegacoes as d (d.id)}
			<!-- O cartão todo é clicável (o botão cobre o cartão), mas o nome do botão é só o país.
			     Passo 55: abre a ficha, como o país em qualquer tela; a página fica a um clique dela. -->
			<li class:minha={d.id === minha}>
				<Bandeira codigo={d.bandeira} />
				<button class="grade-delegacoes-nome" type="button" onclick={() => abrirFicha(data.comite.sigla, d.id)}>{d.nome}</button>
				<span class="detalhe">{d.nome_oficial}{SITUACOES[d.situacao] ? ` · ${SITUACOES[d.situacao]}` : ''}</span>
			</li>
		{/each}
	</ul>
</section>
