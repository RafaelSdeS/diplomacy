<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { bilingue, locale, t } from '#lib/i18n.svelte.ts';
	import { invalidateAll } from '$app/navigation';
	import { STATUS_DPO } from '#lib/impressao.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import { ESCOLHAS } from '#lib/votacao.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const SITUACOES = bilingue({ membro: 'Membro', observadora: 'Observadora', suspensa: 'Suspensa' } as const);

	const d = $derived(data.delegacao);
	// A pessoa é delegada de outra delegação do comitê: pode mandar bilhete e bloquear.
	const eu = $derived(data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado'));
	const outra = $derived(!!eu?.delegacao_id && eu.delegacao_id !== d.id);
	const bloqueei = $derived(data.bloqueios.some((b) => b.delegacao_id === eu?.delegacao_id && b.bloqueada_id === d.id));
	const iniciais = (nome: string) =>
		nome
			.split(/\s+/)
			.map((p) => p[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();
	const quando = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });

	let erro = $state('');
	async function bloquear() {
		erro = '';
		const { error } = await supabase.rpc('bloquear_bilhetes', { p_comite: data.comite.id, p_delegacao: d.id, p_bloquear: !bloqueei });
		if (error) erro = mensagemDeErro(error);
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>{tituloDaAba(d.nome, data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">{t('Comitê')} · {data.comite.sigla}</p>
<header class="delegacao-cabecalho">
	<span class="delegacao-bandeira"><Bandeira codigo={d.bandeira} /></span>
	<div>
		<h1>{d.nome}</h1>
		<p class="versalete">{d.nome_oficial}</p>
		<p><span class="selo">{SITUACOES[d.situacao]}</span></p>
	</div>
</header>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}

{#if outra}
	<div class="acoes">
		<a class="botao" href={`/comite/${data.comite.sigla}/mensagens?para=${d.id}`}>{t('Mandar bilhete')}</a>
		<button class="botao botao--secundario" type="button" onclick={bloquear}>
			{bloqueei ? t('Desbloquear bilhetes') : t('Bloquear bilhetes')}
		</button>
	</div>
{/if}

<section aria-labelledby="t-delegados">
	<h2 id="t-delegados">{data.delegados.length === 1 ? t('Delegado') : t('Delegados')}</h2>
	<ul class="delegados">
		{#each data.delegados as p (p.id)}
			<li class="cartao">
				{#if p.foto}
					<img class="foto" src={p.foto} alt="" width="64" height="64" />
				{:else}
					<span class="foto foto--iniciais" aria-hidden="true">{iniciais(p.nome)}</span>
				{/if}
				<div>
					<p class="destaque">{p.nome}</p>
					{#if p.bio}<p class="suave">{p.bio}</p>{/if}
				</div>
			</li>
		{:else}
			<li class="suave">{t('Nenhum delegado nesta delegação ainda.')}</li>
		{/each}
	</ul>
</section>

<section aria-labelledby="t-documentos">
	<h2 id="t-documentos">{t('Documentos')}</h2>
	<ul class="lista">
		{#each data.dpos as dpo (dpo.id)}
			<li>
				<span>{t('DPO')} · {t('Tópico')} {dpo.topico} <span class="selo {STATUS_DPO[dpo.status].selo}">{STATUS_DPO[dpo.status].rotulo}</span></span>
				<a href={`/imprimir/dpo/${dpo.id}`}>{t('Ler')}</a>
			</li>
		{/each}
		{#each data.cartas as c (c.id)}
			<li>
				<span>{t('Carta')} · {c.titulo} <span class="detalhe">{quando(c.enviada_em)}</span></span>
				<a href={`/imprimir/carta/${c.id}`}>{t('Ler')}</a>
			</li>
		{/each}
		{#if !data.dpos.length && !data.cartas.length}
			<li class="suave">{t('Nenhum documento aberto desta delegação.')}</li>
		{/if}
	</ul>
</section>

{#if data.citacoes.length}
	<section aria-labelledby="t-press">
		<h2 id="t-press">{t('Na press')}</h2>
		<ul class="lista">
			{#each data.citacoes as n (n.id)}
				<li>
					<a href={`/press/${n.veiculo?.comite?.sigla}?n=${n.id}`}>{n.titulo}</a>
					<span class="detalhe">{n.veiculo?.nome}</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if data.votos.length}
	<section aria-labelledby="t-votos">
		<h2 id="t-votos">{t('Votos recentes')}</h2>
		<ul class="lista">
			{#each data.votos as v (v.votacao.id)}
				<li>
					<span>{v.votacao.objeto}</span>
					<span class="selo">{ESCOLHAS[v.escolha]}</span>
				</li>
			{/each}
		</ul>
		<p><a href={`/comite/${data.comite.sigla}/votacoes`}>{t('Todas as votações do comitê')}</a></p>
	</section>
{/if}
