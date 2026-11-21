<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { formatarHora } from '#lib/cronograma.ts';
	import { nomeDoDocumento, STATUS_DOCUMENTO } from '#lib/formatacao.ts';
	import { STATUS_DPO } from '#lib/impressao.ts';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const sigla = $derived(data.comite.sigla);
	const agora = Date.now();
	// A rodada aberta de cada documento (a mais recente que ainda não acabou).
	const rodadaAte = $derived(
		new Map(data.rodadas.filter((r) => Date.parse(r.fim) > agora).map((r) => [r.documento_id, r.fim] as const))
	);
	const meusDpos = $derived(data.dpos.filter((d) => d.delegacao?.id === data.minha));
	const dosMeusBlocos = $derived(data.documentos.filter((d) => data.meusBlocos.includes(d.bloco_id)));
	const doComite = $derived(data.documentos.filter((d) => !data.meusBlocos.includes(d.bloco_id)));
	const dposParaAvaliar = $derived(data.ehMesa ? data.dpos.filter((d) => d.status === 'enviado') : []);
	const docsParaAvaliar = $derived(data.ehMesa ? data.documentos.filter((d) => d.status === 'enviado') : []);
	const dposDoComite = $derived(data.dpos.filter((d) => d.delegacao?.id !== data.minha && (d.status === 'aprovado' || !data.ehMesa)));
	const situacaoDoDpo = (topico: number) => meusDpos.find((d) => d.topico === topico);
</script>

<svelte:head>
	<title>{tituloDaAba(t('Documentos'), sigla)}</title>
</svelte:head>

<p class="rotulo">{t('Comitê')} · {sigla}</p>
<h1>{t('Documentos')}</h1>

<div class="cartoes">
	{#if data.ehMesa}
		<section class="cartao cartao--destaque cartao--largo" aria-labelledby="t-avaliar">
			<h2 id="t-avaliar">{t('Para avaliar')}</h2>
			<ul class="lista">
				{#each dposParaAvaliar as dpo (dpo.id)}
					<li>
						<span class="com-bandeira"><Bandeira codigo={dpo.delegacao?.bandeira} /> {t('DPO de {delegacao}', { delegacao: dpo.delegacao?.nome ?? '' })} · {t('Tópico')} {dpo.topico}</span>
						<a href={`/comite/${sigla}/dpo`}>{t('Ler e avaliar')}</a>
					</li>
				{/each}
				{#each docsParaAvaliar as d (d.id)}
					<li>
						<span>{nomeDoDocumento(d)} <span class="detalhe">{d.bloco?.nome}</span></span>
						<a href={`/documento/${d.id}`}>{t('Ler e avaliar')}</a>
					</li>
				{/each}
				{#if !dposParaAvaliar.length && !docsParaAvaliar.length}
					<li class="suave">{t('Nada esperando a mesa.')}</li>
				{/if}
			</ul>
		</section>
	{/if}

	{#if data.minha}
		<section class="cartao" aria-labelledby="t-meu-dpo">
			<h2 id="t-meu-dpo">{t('Seu DPO')}</h2>
			<ul class="lista">
				{#each data.comite.topicos as titulo, i (titulo)}
					{@const dpo = situacaoDoDpo(i + 1)}
					<li>
						<span>
							{t('Tópico')} {i + 1}: {titulo}
							{#if dpo}<span class="selo {STATUS_DPO[dpo.status].selo}">{STATUS_DPO[dpo.status].rotulo}</span>{/if}
						</span>
						<a href={`/comite/${sigla}/dpo`}>{dpo ? t('Abrir') : t('Escrever')}</a>
					</li>
				{/each}
			</ul>
		</section>

		<section class="cartao" aria-labelledby="t-meus-docs">
			<h2 id="t-meus-docs">{t('Dos seus blocos')}</h2>
			<ul class="lista">
				{#each dosMeusBlocos as d (d.id)}
					<li>
						<span>
							<a href={`/documento/${d.id}`}>{nomeDoDocumento(d)}</a>
							<span class="detalhe">
								{d.bloco?.nome}
								{#if rodadaAte.get(d.id)}· {t('rodada até {hora}', { hora: formatarHora(rodadaAte.get(d.id)!) })}{/if}
							</span>
						</span>
						{#if STATUS_DOCUMENTO[d.status]}<span class="selo {STATUS_DOCUMENTO[d.status].selo}">{STATUS_DOCUMENTO[d.status].rotulo}</span>{/if}
					</li>
				{:else}
					<li class="suave">{data.meusBlocos.length ? t('O seu bloco ainda não tem documentos.') : t('Sua delegação ainda não está num bloco.')}</li>
				{/each}
			</ul>
			<p><a href={`/comite/${sigla}/blocos`}>{t('Blocos e novos documentos')}</a></p>
		</section>
	{/if}

	<section class="cartao" aria-labelledby="t-cartas">
		<h2 id="t-cartas">{t('Cartas')}</h2>
		<ul class="lista">
			{#each data.cartas as c (c.id)}
				<li><span>{c.titulo} <span class="detalhe">{c.remetente?.nome}</span></span></li>
			{:else}
				<li class="suave">{t('Nenhuma carta ainda.')}</li>
			{/each}
		</ul>
		<p><a href={`/comite/${sigla}/cartas`}>{t('Ler e escrever cartas')}</a></p>
	</section>

	{#if data.minha}
		<section class="cartao" aria-labelledby="t-caderno">
			<h2 id="t-caderno">{t('Caderno da delegação')}</h2>
			<p class="suave">{t('Suas anotações sobre as outras delegações e o debate.')}</p>
			<p><a href={`/comite/${sigla}/caderno`}>{t('Abrir o caderno')}</a></p>
		</section>
	{/if}

	<section class="cartao cartao--largo" aria-labelledby="t-do-comite">
		<h2 id="t-do-comite">{t('Do comitê')}</h2>
		<ul class="lista">
			{#each doComite as d (d.id)}
				<li>
					<span><a href={`/documento/${d.id}`}>{nomeDoDocumento(d)}</a> <span class="detalhe">{d.bloco?.nome}</span></span>
					{#if STATUS_DOCUMENTO[d.status]}<span class="selo {STATUS_DOCUMENTO[d.status].selo}">{STATUS_DOCUMENTO[d.status].rotulo}</span>{/if}
				</li>
			{/each}
			{#each dposDoComite as dpo (dpo.id)}
				<li>
					<span class="com-bandeira"><Bandeira codigo={dpo.delegacao?.bandeira} /> {t('DPO de {delegacao}', { delegacao: dpo.delegacao?.nome ?? '' })} · {t('Tópico')} {dpo.topico}</span>
					<a href={`/comite/${sigla}/dpo`}>{t('Ler')}</a>
				</li>
			{/each}
			{#if !doComite.length && !dposDoComite.length}
				<li class="suave">{t('Nenhum documento aberto ao comitê ainda.')}</li>
			{/if}
		</ul>
	</section>
</div>
