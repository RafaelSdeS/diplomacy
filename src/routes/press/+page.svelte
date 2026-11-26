<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { dica } from '#lib/dica.ts';
	import { formatarQuando } from '#lib/cronograma.ts';
	import { TIPOS_NOTICIA } from '#lib/press.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const agora = new Date();
</script>

<svelte:head>
	<title>{tituloDaAba(t('Press'))}</title>
</svelte:head>

<p class="rotulo">
	{t('Press · Simulação')}
	<AoVivo eventoId={data.participacoes[0]?.evento_id} tabelas={['noticia']} dependencia="app:press" />
</p>
<h1>{t('Capa')}</h1>

<p class="acoes">
	<a class="botao botao--secundario" href="/press/coletiva" {@attach dica(t('Abre a pauta de perguntas da press às delegações.'))}>{t('Coletiva de imprensa')}</a>
	{#if data.minhaPress.length}<a class="botao botao--secundario" href="/press/entrevistas" {@attach dica(t('Pede entrevistas às delegações e mostra as respostas.'))}>{t('Entrevistas')}</a>{/if}
</p>

{#if data.minhaPress.length}
	<p class="acoes">
		<a class="botao" href="/press/escrever" {@attach dica(t('Abre o editor para escrever e publicar uma matéria.'))}>{t('Escrever matéria')}</a>
		{#each data.minhaPress as sigla (sigla)}
			<a class="botao botao--secundario" href={`/press/${sigla}`} {@attach dica(t('Abre a página do seu veículo, com as matérias publicadas.'))}>
{t('Meu veículo')} ({sigla})</a>
		{/each}
	</p>
{/if}

<section aria-labelledby="t-manchetes">
	<h2 id="t-manchetes">{t('Manchetes')}</h2>
	<ul class="capa">
		{#each data.noticias as n (n.id)}
			<li>
				<article class="cartao manchete" aria-labelledby={`m-${n.id}`}>
					{#if n.imagem}<img src={n.imagem} alt={n.imagem_descricao ?? ''} loading="lazy" />{/if}
					<p class="rotulo">
						{n.veiculo?.nome}
						{#if n.tipo === 'nota_urgente'}<span class="selo selo--erro">{t('Urgente')}</span>{/if}
					</p>
					<h3 id={`m-${n.id}`}><a href={`/press/${n.veiculo?.comite?.sigla}?n=${n.id}`}>{n.titulo}</a></h3>
					{#if n.linha_fina}<p>{n.linha_fina}</p>{/if}
					<p class="detalhe">{TIPOS_NOTICIA[n.tipo]} · {formatarQuando(n.publicada_em, agora)}</p>
				</article>
			</li>
		{:else}
			<li class="suave">{t('Nenhuma notícia ainda.')}</li>
		{/each}
	</ul>
</section>

<section aria-labelledby="t-veiculos">
	<h2 id="t-veiculos">{t('Veículos')}</h2>
	<ul class="lista">
		{#each data.veiculos as v (v.id)}
			<li><a href={`/press/${v.comite?.sigla}`}>{v.nome}</a> <span class="detalhe">{v.comite?.sigla}</span></li>
		{/each}
	</ul>
</section>
