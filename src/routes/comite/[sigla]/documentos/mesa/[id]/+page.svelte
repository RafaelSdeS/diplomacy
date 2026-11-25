<script lang="ts">
	// Passo 58: um documento da mesa. O comitê lê a última publicação, ao vivo, e vê o que mudou
	// desde a anterior; a mesa escreve o rascunho com a prévia ao lado e publica. Se outra pessoa
	// da mesa salvou antes, a tela mostra a diferença e a pessoa escolhe: nada se perde calado.
	import { untrack } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { formatarHora } from '#lib/cronograma.ts';
	import { marcacaoParaHtml } from '#lib/marcacao.ts';
	import { diferencaPorPalavra } from '#lib/diferenca.ts';
	import { marcarPublicacaoLida } from '#lib/nao-lidas.ts';
	import { guardarRascunho, lerRascunho } from '#lib/rascunho.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import FileText from '@lucide/svelte/icons/file-text';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const sigla = $derived(data.comite.sigla);
	const doc = $derived(data.documento);

	// Leitura: marca a publicação como lida; se mudar com a página aberta, avisa.
	const versaoAoAbrir = untrack(() => data.documento.versao);
	$effect(() => {
		if (doc.versao) marcarPublicacaoLida(data.comite.id, doc.id, doc.versao);
	});
	let alteracoes = $state<Modal>();
	const diferenca = $derived(data.anterior ? diferencaPorPalavra(data.anterior.corpo, doc.corpo) : []);

	async function abrirPdf() {
		if (!doc.arquivo) return;
		const { data: url, error } = await supabase.storage.from('documentos-mesa').createSignedUrl(doc.arquivo, 3600);
		if (error) erro = mensagemDeErro(error);
		else open(url.signedUrl, '_blank', 'noopener');
	}

	// Escrita (mesa): o rascunho no banco, com a versão de quem abriu; o aparelho guarda o texto
	// em edição até salvar.
	const chave = (versao: number) => `doc-mesa:${untrack(() => data.documento.id)}:${versao}`;
	let versao = $state(untrack(() => data.rascunho?.versao ?? 0));
	let titulo = $state(untrack(() => data.rascunho?.titulo ?? ''));
	let corpo = $state(untrack(() => lerRascunho(chave(data.rascunho?.versao ?? 0)) || (data.rascunho?.corpo ?? '')));
	$effect(() => guardarRascunho(chave(versao), corpo));
	const salvo = $derived(!!data.rascunho && data.rascunho.versao === versao && data.rascunho.corpo === corpo && data.rascunho.titulo === titulo);
	const naoPublicado = $derived(!!data.rascunho && (!doc.versao || data.rascunho.titulo !== doc.titulo || data.rascunho.corpo !== doc.corpo));
	let conflito = $state<{ titulo: string; corpo: string; versao: number; autor: string; hora: string } | null>(null);
	let avisar = $state(true);
	let confirmando = $state(false);
	let erro = $state('');
	let mensagem = $state('');
	let ocupado = $state(false);

	async function salvar() {
		erro = mensagem = '';
		const { data: nova, error } = await supabase.rpc('salvar_documento_mesa', { p_documento: doc.id, p_titulo: titulo.trim(), p_corpo: corpo, p_versao: versao });
		if (error?.code === 'DM409') {
			const { data: r } = await supabase.from('documento_mesa_rascunho').select('titulo, corpo, versao, atualizado_em, autor:pessoa(nome)').eq('documento_id', doc.id).single();
			if (r) conflito = { titulo: r.titulo, corpo: r.corpo, versao: r.versao, autor: r.autor?.nome ?? t('Mesa'), hora: formatarHora(r.atualizado_em) };
			return false;
		}
		if (error) {
			erro = mensagemDeErro(error);
			return false;
		}
		guardarRascunho(chave(versao), '');
		versao = nova;
		await invalidate('app:documento-mesa');
		return true;
	}
	async function salvarComMensagem() {
		ocupado = true;
		try {
			if (await salvar()) mensagem = t('Rascunho salvo.');
		} finally {
			ocupado = false;
		}
	}
	// O conflito: manter o meu texto (salva por cima da versão nova) ou ficar com o salvo.
	async function manterOMeu() {
		versao = conflito!.versao;
		conflito = null;
		await salvarComMensagem();
	}
	function ficarComOSalvo() {
		guardarRascunho(chave(versao), '');
		({ titulo, corpo, versao } = conflito!);
		conflito = null;
	}
	async function publicar() {
		if (!doc.versao && !confirmando) {
			confirmando = true;
			return;
		}
		confirmando = false;
		ocupado = true;
		if (salvo || (await salvar())) {
			const { error } = await supabase.rpc('publicar_documento_mesa', { p_documento: doc.id, p_avisar: avisar });
			if (error) erro = mensagemDeErro(error);
			else mensagem = t('Publicado para o comitê.');
			await invalidate('app:documento-mesa');
		}
		ocupado = false;
	}
	async function ajustar(fixado: boolean, arquivo: string | null) {
		erro = mensagem = '';
		const { error } = await supabase.rpc('ajustar_documento_mesa', { p_documento: doc.id, p_fixado: fixado, p_arquivo: arquivo ?? undefined });
		if (error) erro = mensagemDeErro(error);
		await invalidate('app:documento-mesa');
	}
	async function anexar(evento: Event) {
		const entrada = evento.currentTarget as HTMLInputElement;
		const arquivo = entrada.files?.[0];
		if (!arquivo) return;
		ocupado = true;
		const caminho = `${data.comite.id}/${doc.id}.pdf`;
		const { error } = await supabase.storage.from('documentos-mesa').upload(caminho, arquivo, { upsert: true, contentType: 'application/pdf' });
		if (error) erro = mensagemDeErro(error);
		else await ajustar(doc.fixado, caminho);
		entrada.value = '';
		ocupado = false;
	}
	async function tirarPdf() {
		if (doc.arquivo) await supabase.storage.from('documentos-mesa').remove([doc.arquivo]);
		await ajustar(doc.fixado, null);
	}
	async function excluir() {
		if (!confirm(t('Excluir este documento? O comitê deixa de vê-lo.'))) return;
		const { error } = await supabase.from('documento_mesa').delete().eq('id', doc.id);
		if (error) erro = mensagemDeErro(error);
		else await goto(`/comite/${sigla}/documentos`);
	}
</script>

<svelte:head>
	<title>{tituloDaAba(doc.titulo, sigla)}</title>
</svelte:head>

<p class="rotulo">
	<a href={`/comite/${sigla}/documentos`}>{t('Documentos')}</a> · {t('Da mesa')}
	<AoVivo comiteId={data.comite.id} canais={data.ehMesa ? [`mesa:${data.comite.id}`] : []} tabelas={['documento_mesa', 'documento_mesa_rascunho']} dependencia="app:documento-mesa" />
</p>
<h1>{data.ehMesa ? titulo || doc.titulo : doc.titulo}</h1>

{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
{#if mensagem}<p class="sucesso" role="status">{mensagem}</p>{/if}

{#snippet situacao()}
	<p class="doc-mesa-situacao">
		{#if doc.versao}
			<span>{t('Atualizado às {hora}', { hora: formatarHora(doc.publicado_em!) })}</span>
			{#if !data.ehMesa && doc.versao > versaoAoAbrir}<span class="selo selo--info" role="status">{t('Atualizado agora')}</span>{/if}
			{#if data.anterior}
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => alteracoes?.abrir()}>{t('Ver alterações')}</button>
			{/if}
		{:else}
			<span class="selo">{t('Ainda não publicado')}</span>
		{/if}
		{#if doc.arquivo}
			<button class="botao botao--secundario botao--pequeno" type="button" onclick={abrirPdf}><FileText aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Abrir o PDF')}</button>
		{/if}
	</p>
{/snippet}

{#if data.ehMesa && data.rascunho}
	{@render situacao()}
	{#if conflito}
		<section class="cartao cartao--destaque" aria-labelledby="t-conflito">
			<h2 id="t-conflito">{t('{nome} salvou este documento às {hora}', { nome: conflito.autor, hora: conflito.hora })}</h2>
			<p>{t('O seu texto não foi salvo. Veja o que muda do texto salvo para o seu e escolha.')}</p>
			<p class="folha diferenca">{#each diferencaPorPalavra(conflito.corpo, corpo) as d, i (i)}{#if d.tipo === 'entrou'}<ins>{d.texto}</ins>{:else if d.tipo === 'saiu'}<del>{d.texto}</del>{:else}{d.texto}{/if}{/each}</p>
			<div class="acoes">
				<button class="botao" type="button" onclick={manterOMeu}>{t('Manter o meu texto')}</button>
				<button class="botao botao--secundario" type="button" onclick={ficarComOSalvo}>{t('Ficar com o texto salvo')}</button>
			</div>
		</section>
	{/if}
	<form class="formulario" aria-label={t('Escrever o documento')} onsubmit={(e) => (e.preventDefault(), void salvarComMensagem())}>
		<label class="campo">{t('Título')} <input required maxlength="200" bind:value={titulo} /></label>
		<div class="dpo-escrita">
			<label class="campo">
				{t('Texto')}
				<span class="suave">{t('# título, - lista, **negrito**, [texto](https://link)')}</span>
				<textarea rows="16" maxlength="50000" bind:value={corpo}></textarea>
			</label>
			<div class="dpo-previa folha" role="region" aria-label={t('Prévia')}>
				<p class="rotulo">{t('Prévia')}</p>
				{#if corpo.trim()}{@html marcacaoParaHtml(corpo)}{:else}<p class="suave">{t('O texto aparece aqui.')}</p>{/if}
			</div>
		</div>
		<p class="suave">
			{salvo ? t('Salvo.') : t('Alterações só neste aparelho: salve para a mesa ver.')}
			{#if naoPublicado && doc.versao}{t('O comitê ainda lê a publicação anterior.')}{/if}
		</p>
		<div class="acoes">
			<button class="botao botao--secundario" disabled={ocupado || salvo}>{t('Salvar rascunho')}</button>
			{#if confirmando}
				<button class="botao" type="button" disabled={ocupado} onclick={publicar}>{t('Confirmar: publicar para o comitê')}</button>
				<button class="botao botao--secundario" type="button" onclick={() => (confirmando = false)}>{t('Cancelar')}</button>
			{:else}
				<button class="botao" type="button" disabled={ocupado || !titulo.trim() || (!naoPublicado && salvo)} onclick={publicar}
					>{doc.versao ? t('Publicar alterações') : t('Publicar')}</button
				>
			{/if}
			<label class="opcao"><input type="checkbox" bind:checked={avisar} /> {t('Avisar o comitê')}</label>
		</div>
	</form>
	<section class="cartao" aria-labelledby="t-ajustes">
		<h2 id="t-ajustes">{t('Ajustes')}</h2>
		<div class="acoes">
			<label class="opcao"><input type="checkbox" checked={doc.fixado} onchange={(e) => ajustar(e.currentTarget.checked, doc.arquivo)} /> {t('Fixar no topo')}</label>
			<label class="botao botao--secundario botao--pequeno">
				<FileText aria-hidden="true" size={16} strokeWidth={1.75} />
				{doc.arquivo ? t('Trocar o PDF') : t('Anexar um PDF')}
				<input class="so-leitor" type="file" accept="application/pdf" disabled={ocupado} onchange={anexar} />
			</label>
			{#if doc.arquivo}<button class="botao botao--secundario botao--pequeno" type="button" onclick={tirarPdf}>{t('Tirar o PDF')}</button>{/if}
			<button class="botao botao--secundario botao--pequeno" type="button" onclick={excluir}>{t('Excluir')}</button>
		</div>
	</section>
{:else}
	{@render situacao()}
	<article class="folha doc-mesa" aria-label={doc.titulo}>
		{#if doc.corpo.trim()}{@html marcacaoParaHtml(doc.corpo)}{:else}<p class="suave">{t('Sem texto: veja o PDF.')}</p>{/if}
	</article>
{/if}

<Modal bind:this={alteracoes} nome={t('Alterações')} classe="modal-largo">
	<h3>{t('Alterações')}</h3>
	<p class="suave">{t('Desde a publicação anterior: o que entrou está sublinhado; o que saiu, riscado.')}</p>
	<p class="folha diferenca">{#each diferenca as d, i (i)}{#if d.tipo === 'entrou'}<ins>{d.texto}</ins>{:else if d.tipo === 'saiu'}<del>{d.texto}</del>{:else}{d.texto}{/if}{/each}</p>
	<form method="dialog" class="acoes"><button class="botao botao--secundario">{t('Fechar')}</button></form>
</Modal>
