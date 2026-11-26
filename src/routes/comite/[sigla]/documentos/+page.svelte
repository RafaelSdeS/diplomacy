<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { abrirPrevia } from '#lib/ficha.svelte.ts';
	import { lerLidas, seloDaPublicacao } from '#lib/nao-lidas.ts';
	import { goto } from '$app/navigation';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import { formatarHora } from '#lib/cronograma.ts';
	import { nomeDoDocumento, STATUS_DOCUMENTO } from '#lib/formatacao.ts';
	import { STATUS_DPO } from '#lib/impressao.ts';
	import { doTopico } from '#lib/ordem.ts';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import NomeDelegacao from '#lib/ui/NomeDelegacao.svelte';
	import GradeAtalhos, { type Atalho } from '#lib/ui/GradeAtalhos.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import TrilhaDoTopico from '#lib/ui/TrilhaDoTopico.svelte';
	import Mail from '@lucide/svelte/icons/mail';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import Users from '@lucide/svelte/icons/users';
	import type { PageProps } from './$types';

	// Passo 56: a aba Documentos pela ordem do tópico, sem rolar. Em cima, só o que espera a
	// pessoa ("Para você"); depois, cada tópico com a trilha e uma linha por etapa, que abre a
	// lista num modal; por fim, os DPOs e as cartas, uma linha cada.
	let { data }: PageProps = $props();

	const sigla = $derived(data.comite.sigla);
	const agora = Date.now();
	type Documento = (typeof data.documentos)[number];
	// A rodada aberta de cada documento (a mais recente que ainda não acabou).
	const rodadaAte = $derived(
		new Map(data.rodadas.filter((r) => Date.parse(r.fim) > agora).map((r) => [r.documento_id, r.fim] as const))
	);
	const meusDpos = $derived(data.dpos.filter((d) => d.delegacao?.id === data.minha));
	const dosMeusBlocos = $derived(data.documentos.filter((d) => data.meusBlocos.includes(d.bloco_id)));
	const paraAvaliar = $derived(
		data.ehMesa ? data.documentos.filter((d) => d.status === 'enviado').length : 0
	);
	// O que espera a delegação: o DPO por fazer, a rodada aberta e a assinatura que falta.
	const dposPorFazer = $derived(
		data.minha
			? data.comite.topicos
					.map((_, i) => ({ topico: i + 1, dpo: meusDpos.find((d) => d.topico === i + 1) }))
					.filter(({ dpo }) => dpo?.status !== 'enviado' && dpo?.status !== 'aprovado')
			: []
	);
	const emRodada = $derived(dosMeusBlocos.filter((d) => rodadaAte.has(d.id)));
	const semMinhaAssinatura = $derived(
		dosMeusBlocos.filter((d) => d.status === 'rascunho' && !rodadaAte.has(d.id) && !d.assinaturas.some((a) => a.delegacao?.id === data.minha))
	);
	const nadaParaVoce = $derived(!paraAvaliar && !dposPorFazer.length && !emRodada.length && !semMinhaAssinatura.length);
	// Passo 53: enviado, o DPO é do comitê.
	const dposVisiveis = $derived(data.dpos.filter((d) => d.status === 'enviado' || d.status === 'aprovado'));

	// As listas de cada etapa, por tópico, num modal.
	type Etapa = 'working_paper' | 'projeto' | 'resolucao';
	const ROTULO = (): Record<Etapa, string> => ({ working_paper: t('Working papers'), projeto: t('Projetos'), resolucao: t('Resoluções') });
	const daEtapa = (topico: number, etapa: Etapa) =>
		data.documentos.filter(
			(d) =>
				d.topico === topico &&
				(etapa === 'resolucao' ? d.tipo === 'projeto' && d.status === 'aprovado' : d.tipo === etapa && !(etapa === 'projeto' && d.status === 'aprovado'))
		);
	let lista = $state<{ topico: number; etapa: Etapa } | null>(null);
	let modalLista = $state<Modal>();
	let modalAvaliar = $state<Modal>();
	let modalDpos = $state<Modal>();
	let modalSeus = $state<Modal>();
	// Passo 58: os documentos da mesa, com "Novo" e "Alterado" pela publicação lida no aparelho.
	let modalDaMesa = $state<Modal>();
	const lidas = $derived(lerLidas(data.comite.id));
	const SELO = (): Record<string, string> => ({ novo: t('Novo'), alterado: t('Alterado') });
	const seloDaMesa = (d: (typeof data.daMesa)[number]) => (d.versao ? seloDaPublicacao(lidas, d.id, d.versao) : null);
	let tituloNovo = $state('');
	let erroNovo = $state('');
	async function criarDaMesa(evento: SubmitEvent) {
		evento.preventDefault();
		const { data: id, error } = await supabase.rpc('criar_documento_mesa', { p_comite: data.comite.id, p_titulo: tituloNovo.trim() });
		if (error) erroNovo = mensagemDeErro(error);
		else await goto(`/comite/${sigla}/documentos/mesa/${id}`);
	}
	function abrirLista(topico: number, etapa: Etapa) {
		lista = { topico, etapa };
		modalLista?.abrir();
	}

	// Passo 51: as ações da área em cartões, como na aba Comitê.
	const atalhos = $derived(
		[
			{ href: `/comite/${sigla}/dpo`, rotulo: t('DPO'), descricao: data.minha ? t('Enviar o seu DPO e ler os do comitê') : t('Ler os DPOs do comitê'), icone: ScrollText },
			{ href: `/comite/${sigla}/blocos`, rotulo: t('Blocos'), descricao: t('Formar blocos e escrever documentos'), icone: Users },
			{ href: `/comite/${sigla}/cartas`, rotulo: t('Cartas'), descricao: t('Ler e escrever cartas diplomáticas'), icone: Mail },
			data.minha ? { href: `/comite/${sigla}/caderno`, rotulo: t('Caderno'), descricao: t('Suas anotações sobre as outras delegações e o debate'), icone: NotebookPen } : null
		].filter((a): a is Atalho => !!a)
	);
</script>

{#snippet documento(d: Documento)}
	<li>
		<span>
			<button class="abre-ficha" type="button" onclick={() => abrirPrevia('documento', d.id)}>{nomeDoDocumento(d)}</button>
			<span class="detalhe">
				{d.bloco?.nome}
				{#if d.assinaturas.length}
					· <span class="bandeiras" aria-label={t('Signatários: {nomes}', { nomes: d.assinaturas.map((a) => a.delegacao?.nome).join(', ') })}
						>{#each d.assinaturas as a (a.delegacao?.id)}<Bandeira codigo={a.delegacao?.bandeira} />{/each}</span
					>
				{/if}
			</span>
		</span>
		{#if STATUS_DOCUMENTO[d.status]}<span class="selo {STATUS_DOCUMENTO[d.status].selo}">{STATUS_DOCUMENTO[d.status].rotulo}</span>{/if}
		{#if data.minha && d.assinaturas.some((a) => a.delegacao?.id === data.minha)}<span class="selo selo--ok">{t('assinado por você')}</span>{/if}
	</li>
{/snippet}

<svelte:head>
	<title>{tituloDaAba(t('Documentos'), sigla)}</title>
</svelte:head>

<p class="rotulo">{t('Comitê')} · {sigla}</p>
<h1>{t('Documentos')}</h1>

<GradeAtalhos nome={t('Atalhos de documentos')} {atalhos} />

<div class="cartoes">
	{#if data.ehMesa || data.minha}
		<section class={['cartao', !nadaParaVoce && 'cartao--destaque']} aria-labelledby="t-para-voce">
			<h2 id="t-para-voce">{t('Para você')}</h2>
			<ul class="lista lista--compacta">
				{#if paraAvaliar}
					<li>
						<span>{paraAvaliar === 1 ? t('1 documento espera a avaliação da mesa') : t('{n} documentos esperam a avaliação da mesa', { n: paraAvaliar })}</span>
						<button class="botao botao--pequeno" type="button" onclick={() => modalAvaliar?.abrir()}>{t('Ler e avaliar')}</button>
					</li>
				{/if}
				{#if dposPorFazer.length}
					<li>
						<span>{t('Seu DPO')} <span class="suave">· {t('Tópico')} {dposPorFazer.map((d) => d.topico).join(', ')}</span></span>
						<a class="botao botao--secundario botao--pequeno" href={`/comite/${sigla}/dpo`}>{t('Abrir')}</a>
					</li>
				{/if}
				{#each emRodada as d (d.id)}
					<li>
						<span>{nomeDoDocumento(d)} <span class="detalhe">{t('rodada até {hora}', { hora: formatarHora(rodadaAte.get(d.id)!) })}</span></span>
						<a class="botao botao--pequeno" href={`/documento/${d.id}`}>{t('Abrir')}</a>
					</li>
				{/each}
				{#if semMinhaAssinatura.length === 1}
					<li>
						<span>{nomeDoDocumento(semMinhaAssinatura[0])} <span class="detalhe">{t('falta a assinatura da sua delegação')}</span></span>
						<a class="botao botao--secundario botao--pequeno" href={`/documento/${semMinhaAssinatura[0].id}`}>{t('Abrir')}</a>
					</li>
				{:else if semMinhaAssinatura.length}
					<!-- Uma linha só, para não rolar: os documentos ficam na aba Blocos. -->
					<li>
						<span>{t('{n} documentos sem a sua assinatura', { n: semMinhaAssinatura.length })}</span>
						<a class="botao botao--secundario botao--pequeno" href={`/comite/${sigla}/blocos`}>{t('Abrir')}</a>
					</li>
				{/if}
				{#if nadaParaVoce}<li class="suave">{t('Nada esperando você agora.')}</li>{/if}
			</ul>
		</section>
	{/if}

	<section class="cartao no-evento" aria-label={t('Seus documentos, DPOs e cartas')}>
		{#if data.ehMesa || data.daMesa.length}
			{@const primeiro = data.daMesa[0]}
			<article class="linha-evento" aria-labelledby="t-da-mesa">
				<h3 id="t-da-mesa">{t('Da mesa')} <span class="selo">{data.daMesa.length}</span></h3>
				<div class="linha-evento-resumo">
					{#if primeiro}
						<p class="linha-evento-texto">
							<a href={`/comite/${sigla}/documentos/mesa/${primeiro.id}`}>{primeiro.titulo}</a>
							{@render seloMesa(primeiro)}
						</p>
					{:else}
						<p class="suave">{t('Nada publicado pela mesa ainda.')}</p>
					{/if}
				</div>
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => modalDaMesa?.abrir()}>{t('Ver todos')}</button>
			</article>
		{/if}
		<!-- Passo 61: o que é do bloco não some ao assinar: uma linha fixa, que abre a lista. -->
		{#if data.minha}
			<article class="linha-evento" aria-labelledby="t-seus">
				<h3 id="t-seus">{t('Seus documentos')} <span class="selo">{dosMeusBlocos.length}</span></h3>
				<div class="linha-evento-resumo">
					<p class="suave">{data.meusBlocos.length ? t('dos seus blocos') : t('Sua delegação ainda não está num bloco.')}</p>
				</div>
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => modalSeus?.abrir()}>{t('Ver todos')}</button>
			</article>
		{/if}
		<article class="linha-evento" aria-labelledby="t-dpos">
			<h3 id="t-dpos">{t('DPOs')} <span class="selo">{t('{n} de {total}', { n: dposVisiveis.length, total: data.totalDelegacoes })}</span></h3>
			<div class="linha-evento-resumo"></div>
			<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => modalDpos?.abrir()}>{t('Ver todos')}</button>
		</article>
		<article class="linha-evento" aria-labelledby="t-cartas">
			<h3 id="t-cartas">{t('Cartas')} <span class="selo">{data.cartas.length}</span></h3>
			<div class="linha-evento-resumo">
				{#if data.cartas[0]}
					<p class="linha-evento-texto">
						<button class="abre-ficha" type="button" onclick={() => abrirPrevia('carta', data.cartas[0].id)}>{data.cartas[0].titulo}</button>
						<span class="detalhe">{data.cartas[0].remetente?.nome}</span>
					</p>
				{:else}
					<p class="suave">{t('Nenhuma carta ainda.')}</p>
				{/if}
			</div>
			<a class="botao botao--secundario botao--pequeno" href={`/comite/${sigla}/cartas`}>{t('Ver todas')}</a>
		</article>
	</section>

	{#each data.comite.topicos as titulo, i (titulo)}
		{@const topico = i + 1}
		{@const resumo = doTopico(data.ordem, topico)}
		<article class="cartao" aria-labelledby={`t-topico-${topico}`}>
			<h2 id={`t-topico-${topico}`}>{t('Tópico {n}', { n: topico })} <span class="detalhe">{titulo}</span></h2>
			<!-- Cada etapa da trilha abre a lista dela; a agenda leva à aba Agenda. -->
			<TrilhaDoTopico {sigla} mesa={data.ehMesa} {...resumo} onetapa={(etapa) => abrirLista(topico, etapa === 'working_papers' ? 'working_paper' : etapa)} />
		</article>
	{/each}

</div>

<Modal bind:this={modalLista} nome={lista ? `${ROTULO()[lista.etapa]} · ${t('Tópico {n}', { n: lista.topico })}` : ''} classe="modal-acao">
	{#if lista}
		<h3>{ROTULO()[lista.etapa]} · {t('Tópico {n}', { n: lista.topico })}</h3>
		<ul class="lista">
			{#each daEtapa(lista.topico, lista.etapa) as d (d.id)}{@render documento(d)}{:else}<li class="suave">{t('Nada nesta etapa ainda.')}</li>{/each}
		</ul>
	{/if}
	<form method="dialog" class="acoes"><button class="botao botao--secundario">{t('Fechar')}</button></form>
</Modal>

<Modal bind:this={modalAvaliar} nome={t('Para avaliar')} classe="modal-acao">
	<h3>{t('Para avaliar')}</h3>
	<ul class="lista">
		{#each data.documentos.filter((d) => d.status === 'enviado') as d (d.id)}
			<li>
				<span>{nomeDoDocumento(d)} <span class="detalhe">{d.bloco?.nome}</span></span>
				<a class="botao botao--secundario botao--pequeno" href={`/documento/${d.id}`}>{t('Ler e avaliar')}</a>
			</li>
		{/each}
	</ul>
	<form method="dialog" class="acoes"><button class="botao botao--secundario">{t('Fechar')}</button></form>
</Modal>

{#snippet seloMesa(d: (typeof data.daMesa)[number])}
	{#if !d.versao}<span class="selo">{t('rascunho')}</span>{:else if seloDaMesa(d)}<span class="selo selo--info">{SELO()[seloDaMesa(d)!]}</span>{/if}
	{#if d.fixado}<span class="detalhe">{t('fixado')}</span>{/if}
{/snippet}

<Modal bind:this={modalDaMesa} nome={t('Da mesa')} classe="modal-acao">
	<h3>{t('Da mesa')}</h3>
	<ul class="lista">
		{#each data.daMesa as d (d.id)}
			<li>
				<span><a href={`/comite/${sigla}/documentos/mesa/${d.id}`}>{d.titulo}</a> {@render seloMesa(d)}</span>
				{#if d.publicado_em}<span class="detalhe">{t('Atualizado às {hora}', { hora: formatarHora(d.publicado_em) })}</span>{/if}
			</li>
		{:else}
			<li class="suave">{t('Nada publicado pela mesa ainda.')}</li>
		{/each}
	</ul>
	{#if data.ehMesa}
		<form class="formulario" aria-label={t('Novo documento da mesa')} onsubmit={criarDaMesa}>
			<label class="campo">{t('Novo documento da mesa')} <input required maxlength="200" placeholder={t('Título')} bind:value={tituloNovo} /></label>
			{#if erroNovo}<p class="erro">{erroNovo}</p>{/if}
			<button class="botao">{t('Criar e escrever')}</button>
		</form>
	{/if}
	<form method="dialog" class="acoes"><button class="botao botao--secundario">{t('Fechar')}</button></form>
</Modal>

<Modal bind:this={modalSeus} nome={t('Seus documentos')} classe="modal-acao">
	<h3>{t('Seus documentos')}</h3>
	<ul class="lista">
		{#each dosMeusBlocos as d (d.id)}
			{@render documento(d)}
		{:else}
			<li class="suave">{t('O seu bloco ainda não tem documentos.')}</li>
		{/each}
	</ul>
	<form method="dialog" class="acoes"><button class="botao botao--secundario">{t('Fechar')}</button></form>
</Modal>

<Modal bind:this={modalDpos} nome={t('DPOs')} classe="modal-acao">
	<h3>{t('DPOs')}</h3>
	<ul class="lista">
		{#each dposVisiveis as dpo (dpo.id)}
			<li>
				<span><NomeDelegacao {sigla} delegacao={dpo.delegacao} /> · {t('Tópico')} {dpo.topico} <span class="selo {STATUS_DPO[dpo.status].selo}">{STATUS_DPO[dpo.status].rotulo}</span></span>
				<button
					class="botao botao--secundario botao--pequeno"
					type="button"
					aria-label={`${t('Ler')}: ${t('DPO de {delegacao}', { delegacao: dpo.delegacao?.nome ?? '' })}, ${t('Tópico')} ${dpo.topico}`}
					onclick={() => abrirPrevia('dpo', dpo.id)}>{t('Ler')}</button
				>
			</li>
		{:else}
			<li class="suave">{t('Nenhum DPO enviado ainda.')}</li>
		{/each}
	</ul>
	<form method="dialog" class="acoes"><button class="botao botao--secundario">{t('Fechar')}</button></form>
</Modal>
