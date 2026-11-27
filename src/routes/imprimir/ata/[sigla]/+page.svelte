<script lang="ts">
	import { APP, marca } from '#lib/titulo.svelte.ts';
	import { locale, t } from '#lib/i18n.svelte.ts';
	import { descreverPonto, situacaoDoPonto } from '#lib/sessao.ts';
	import { textoResultado } from '#lib/votacao.ts';
	import BotaoImprimir from '#lib/ui/BotaoImprimir.svelte';
	import ListaVotos from '#lib/ui/ListaVotos.svelte';
	import type { PageProps } from './$types';

	// Passo 65: a ata da sessão, pronta para imprimir ou salvar como PDF. Só a mesa chega aqui.
	let { data }: PageProps = $props();
	const a = $derived(data.ata);

	const FUSO = 'America/Sao_Paulo';
	const hora = (iso: string) => new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', timeZone: FUSO });
	const dia = (iso: string) => new Date(iso).toLocaleDateString(locale(), { dateStyle: 'full', timeZone: FUSO });

	const nomeDe = $derived(new Map((a?.delegacoes ?? []).map((d) => [d.id, d.nome])));
	const presentes = $derived(new Set((a?.presenca ?? []).map((p) => p.delegacao_id)));
	const ausentes = $derived((a?.delegacoes ?? []).filter((d) => !presentes.has(d.id)));
	const SITUACAO = $derived<Record<string, string>>({ presente: t('Presente'), presente_e_votando: t('Presente e votando') });

	type Proposta = NonNullable<typeof a>['propostas'][number];
	const mudanca = (p: Proposta) =>
		p.acao === 'alterar'
			? t('Mudar para: "{texto}"', { texto: p.texto_novo ?? '' })
			: p.acao === 'incluir'
				? t('Incluir: "{texto}"', { texto: p.texto_novo ?? '' })
				: p.acao === 'retirar'
					? t('Retirar: "{texto}"', { texto: p.clausula?.texto ?? '' })
					: t('Mover: "{texto}"', { texto: p.clausula?.texto ?? '' });
</script>

<svelte:head>
	<title>{a ? t('Ata da sessão {n}', { n: a.sessao.numero }) : t('Atas das sessões')} · {data.sigla}</title>
</svelte:head>

<div class="impressao">
	<BotaoImprimir voltar={`/comite/${data.sigla}`} />
	{#if data.sessoes.length > 1}
		<nav class="abas-topicos nao-imprimir" aria-label={t('Atas das sessões')}>
			{#each data.sessoes as n (n)}
				<a class={['botao botao--pequeno', n !== a?.sessao.numero && 'botao--secundario']} href={`?sessao=${n}`} aria-current={n === a?.sessao.numero ? 'page' : undefined}
					>{t('Sessão {n}', { n })}</a
				>
			{/each}
		</nav>
	{/if}
	<article class="a4" aria-label={t('Ata da sessão')}>
		<p class="rotulo">{marca.evento ?? APP} · {data.sigla} · {data.nome}</p>
		{#if !a}
			<h1>{t('Atas das sessões')}</h1>
			<p>{t('Nenhuma sessão ainda.')}</p>
		{:else}
			<h1>{t('Ata da sessão {n}', { n: a.sessao.numero })}</h1>
			<p>
				{dia(a.sessao.inicio)} · {hora(a.sessao.inicio)}{a.sessao.fim ? `–${hora(a.sessao.fim)}` : ` (${t('em andamento')})`}
				· {t('Presidência')}: {a.sessao.presidencia_delegacao_id ? nomeDe.get(a.sessao.presidencia_delegacao_id) : t('Mesa')}
			</p>

			<h2>{t('Presença')}</h2>
			<p>{t('{n} de {total} presentes', { n: presentes.size, total: a.delegacoes.length })}</p>
			<ul>
				{#each a.presenca as p (p.delegacao_id)}<li>{nomeDe.get(p.delegacao_id)} · {SITUACAO[p.situacao]} · {hora(p.marcada_em)}</li>{/each}
			</ul>
			{#if ausentes.length}<p>{t('Ausentes')}: {ausentes.map((d) => d.nome).join(', ')}.</p>{/if}

			<h2>{t('Pontos e moções')}</h2>
			{#if a.pontos.length}
				<ol>
					{#each a.pontos as p (p.id)}<li>{hora(p.criado_em)} · {p.delegacao?.nome ?? t('Mesa')} · {descreverPonto(p)} · {situacaoDoPonto(p)}</li>{/each}
				</ol>
			{:else}
				<p>{t('Nenhum ponto ou moção.')}</p>
			{/if}

			<h2>{t('Votações')}</h2>
			{#each a.votacoes as v (v.id)}
				<h3>{hora(v.encerrada_em!)} · {v.objeto}</h3>
				<p>{textoResultado(v)}</p>
				{#if v.nominal}<ListaVotos delegacoes={a.delegacoes} votos={v.votos} tipo={v.tipo} {presentes} />{/if}
			{:else}
				<p>{t('Nenhuma votação.')}</p>
			{/each}

			<h2>{t('Propostas decididas nos working papers')}</h2>
			{#if a.propostas.length}
				<ol>
					{#each a.propostas as p (p.id)}
						<li>
							{hora(p.decidida_em!)} · {p.documento?.titulo} · {mudanca(p)} · {p.delegacao?.nome} ·
							<strong>{p.status === 'aceita' ? t('aceita') : t('recusada')}</strong>
						</li>
					{/each}
				</ol>
			{:else}
				<p>{t('Nenhuma proposta decidida.')}</p>
			{/if}
		{/if}
	</article>
</div>
