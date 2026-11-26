<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { dica } from '#lib/dica.ts';
	import { fecharPrevia, previa, type TipoPrevia } from '#lib/ficha.svelte.ts';
	import { formatarDocumento, nomeDoDocumento, STATUS_DOCUMENTO } from '#lib/formatacao.ts';
	import { STATUS_DPO } from '#lib/impressao.ts';
	import { supabase } from '#lib/supabase.ts';
	import Modal from './Modal.svelte';
	import Quando from './Quando.svelte';

	// Passo 47: a consulta curta de um documento, por cima da tela. Lê só o que a RLS deixa;
	// o documento completo (para compartilhar, imprimir ou editar) fica a um clique.
	type Conteudo = {
		rotulo: string;
		titulo: string;
		detalhe?: string | null;
		quando?: string;
		selo?: { rotulo: string; selo: string };
		texto: string;
		href?: string;
		link?: string;
		externo?: boolean;
	};

	async function carregar(tipo: TipoPrevia, id: string): Promise<Conteudo | null> {
		if (tipo === 'dpo') {
			const { data, error } = await supabase
				.from('dpo')
				.select('topico, texto, status, arquivo, enviado_em, delegacao(nome)')
				.eq('id', id)
				.maybeSingle();
			if (error) throw error;
			if (!data) return null;
			// Passo 53: o DPO é um PDF, que abre numa aba (a CSP não deixa embutir). Os textos de antes
			// do passo 53 aparecem como texto.
			const pdf = data.arquivo ? await supabase.storage.from('dpos').createSignedUrl(data.arquivo, 3600) : null;
			if (pdf?.error) throw pdf.error;
			return {
				rotulo: `${t('DPO')} · ${t('Tópico')} ${data.topico}`,
				titulo: t('DPO de {delegacao}', { delegacao: data.delegacao?.nome ?? '' }),
				selo: STATUS_DPO[data.status],
				quando: data.enviado_em ?? undefined,
				texto: pdf ? t('O DPO é um arquivo PDF. Abra para ler.') : data.texto,
				href: pdf?.data.signedUrl,
				link: t('Abrir o PDF'),
				externo: true
			};
		}
		if (tipo === 'carta') {
			const { data, error } = await supabase
				.from('carta')
				.select('titulo, corpo, enviada_em, remetente:delegacao(nome), bloco_remetente:bloco(nome)')
				.eq('id', id)
				.maybeSingle();
			if (error) throw error;
			return (
				data && {
					rotulo: t('Carta'),
					titulo: data.titulo,
					detalhe: `${t('De')} ${data.bloco_remetente?.nome ?? data.remetente?.nome ?? ''}`,
					quando: data.enviada_em,
					texto: data.corpo,
					href: `/imprimir/carta/${id}`,
					link: t('Imprimir ou salvar como PDF')
				}
			);
		}
		if (tipo === 'noticia') {
			const { data, error } = await supabase
				.from('noticia')
				.select('titulo, linha_fina, texto, publicada_em, veiculo(nome, comite(sigla))')
				.eq('id', id)
				.maybeSingle();
			if (error) throw error;
			return (
				data && {
					rotulo: data.veiculo?.nome ?? t('Matéria'),
					titulo: data.titulo,
					detalhe: data.linha_fina,
					quando: data.publicada_em,
					texto: data.texto,
					href: `/press/${data.veiculo?.comite?.sigla}?n=${id}`,
					link: t('Abrir no veículo')
				}
			);
		}
		const [{ data, error }, clausulas] = await Promise.all([
			supabase.from('documento').select('tipo, numero, titulo, status, bloco(nome, comite(nome_oficial, idioma))').eq('id', id).maybeSingle(),
			supabase.from('clausula').select('id, tipo, pai_id, ordem, texto').eq('documento_id', id)
		]);
		if (error || clausulas.error) throw error ?? clausulas.error;
		if (!data?.bloco?.comite) return null;
		const f = formatarDocumento(clausulas.data, data.bloco.comite, []);
		const operativas = f.operativas.flatMap((o) => [`${o.numero}. ${o.texto}`, ...o.subitens.map((s) => `${s.letra}) ${s.texto}`)]);
		return {
			rotulo: data.bloco.nome,
			titulo: nomeDoDocumento(data),
			selo: STATUS_DOCUMENTO[data.status],
			texto: [
				...f.textos.map((c) => c.texto),
				...f.preambulares.map((c) => c.texto),
				...(operativas.length ? [f.linhaDoComite, ...operativas] : [])
			].join('\n\n'),
			href: `/documento/${id}`,
			link: t('Abrir o documento completo')
		};
	}

	let modal = $state<Modal>();
	let conteudo = $state<Conteudo | null>(null);
	let erro = $state('');

	$effect(() => {
		const { tipo, id } = previa;
		if (!id || !modal) return;
		conteudo = null;
		erro = '';
		modal.abrir();
		carregar(tipo, id)
			.then((c) => {
				if (previa.id !== id) return;
				conteudo = c;
				if (!c) erro = t('Não foi possível carregar o documento.');
			})
			.catch(() => (erro = t('Não foi possível carregar o documento.')));
	});
</script>

<Modal bind:this={modal} classe="modal-ficha" rotulo="previa-titulo" onclose={fecharPrevia}>
	{#if conteudo}
		<p class="rotulo">{conteudo.rotulo}</p>
		<h3 id="previa-titulo">{conteudo.titulo}</h3>
		<p class="suave">
			{#if conteudo.selo}<span class="selo {conteudo.selo.selo}">{conteudo.selo.rotulo}</span>{/if}
			{#if conteudo.detalhe}{conteudo.detalhe}{/if}
			{#if conteudo.quando}· <Quando iso={conteudo.quando} />{/if}
		</p>
		<p class="ficha-texto">{conteudo.texto}</p>
	{:else}
		<h3 id="previa-titulo">{t('Documento')}</h3>
		{#if erro}
			<p class="erro">{erro}</p>
		{:else}
			<!-- Passo 51: o lugar do conteúdo, em CSS, enquanto ele chega. -->
			<div class="esqueleto" role="status"><span class="so-leitor">{t('Carregando…')}</span><span></span><span></span><span></span></div>
		{/if}
	{/if}
	<div class="acoes">
		{#if conteudo?.href && conteudo.externo}
			<a class="botao" href={conteudo.href} target="_blank" rel="noopener" {@attach dica(t('Abre o arquivo numa aba nova.'))}>{conteudo.link}</a>
		{:else if conteudo?.href}
			<a class="botao botao--secundario" href={conteudo.href} onclick={() => modal?.fechar()} {@attach dica(t('Fecha a prévia e abre a página completa.'))}>{conteudo.link}
</a>
		{/if}
		<form method="dialog"><button class="botao">{t('Fechar')}</button></form>
	</div>
</Modal>
