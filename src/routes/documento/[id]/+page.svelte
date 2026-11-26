<script lang="ts">
	// A folha usa o peso 400 e o itálico; só esta rota baixa os arquivos.
	import '@fontsource/spectral/latin-400.css';
	import '@fontsource/spectral/latin-400-italic.css';
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { contador } from '#lib/contador.ts';
	import { locale, t } from '#lib/i18n.svelte.ts';
	import { tick } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { caixa, mensagemDoEnvio } from '#lib/caixa.ts';
	import { formatarDocumento, nomeDoDocumento, STATUS_DOCUMENTO } from '#lib/formatacao.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import NomeDelegacao from '#lib/ui/NomeDelegacao.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import Quando from '#lib/ui/Quando.svelte';
	import { separarVerbo, sugerirVerbos } from '#lib/verbos.ts';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Plus from '@lucide/svelte/icons/plus';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const STATUS_CLAUSULA: Record<string, { rotulo: string; selo: string }> = {
		proposta: { rotulo: t('Proposta'), selo: '' },
		em_discussao: { rotulo: t('Em discussão'), selo: 'selo--info' },
		acordada: { rotulo: t('Acordada'), selo: 'selo--ok' }
	};

	const d = $derived(data.documento);
	const eu = $derived(data.participacoes.find((p) => p.comite_id === d.comite_id && p.papel === 'delegado'));
	const souMembro = $derived(!!d.bloco?.membros.some((m) => m.delegacao?.id === eu?.delegacao_id));
	const ehMesa = $derived(
		data.participacoes.some((p) => (p.papel === 'mesa' && p.comite_id === d.comite_id) || p.papel === 'secretaria')
	);

	// Passo 63: o editor do bloco fica para a resolução de crise; os outros documentos dos blocos
	// ficaram só para leitura (o trabalho é no working paper da sala). As rodadas saíram.
	const legado = $derived(d.tipo !== 'resolucao_crise');
	const editavel = $derived(d.status === 'rascunho' && !legado);

	const porId = $derived(new Map(data.clausulas.map((c) => [c.id, c])));
	const formatado = $derived(
		formatarDocumento(
			data.clausulas,
			data.comite,
			data.assinaturas.map((a) => a.nome_oficial)
		)
	);
	// A ordem da lista é a do documento: textos livres, preambulares, operativas e subitens.
	const ordem = $derived([
		...formatado.textos.map((x) => ({ id: x.id, rotulo: t('Texto') })),
		...formatado.preambulares.map((p) => ({ id: p.id, rotulo: t('Preambular') })),
		...formatado.operativas.flatMap((o) => [
			{ id: o.id, rotulo: `Operativa ${o.numero}` },
			...o.subitens.map((s) => ({ id: s.id, rotulo: `${o.numero}.${s.letra}` }))
		])
	]);
	const acordadas = $derived(data.clausulas.filter((c) => c.status === 'acordada').length);
	const minimoAssinaturas = $derived(d.tipo === 'working_paper' ? 0 : data.regras.assinaturas_projeto_min);
	const assinei = $derived(data.assinaturas.some((a) => a.id === eu?.delegacao_id));
	const faltam = $derived(Math.max(0, minimoAssinaturas - data.assinaturas.length));
	const TIPO_CLAUSULA: Record<string, string> = { texto: t('Texto livre'), preambular: t('Preambular'), operativa: t('Operativa'), subitem: t('Subitem') };
	// O envio pergunta antes, e no projeto escolhe consenso ou votação ali.
	let modalEnvio = $state<Modal>();
	async function enviar() {
		const ok = await executar(
			supabase.rpc('enviar_documento', { p_documento: d.id, p_aprovacao: d.tipo === 'working_paper' ? undefined : aprovacao }),
			t('Documento enviado à mesa.')
		);
		if (ok) modalEnvio?.fechar();
	}

	let selecionada = $state<string | null>(null);
	const clausula = $derived(selecionada ? porId.get(selecionada) : undefined);
	const rotulo = $derived(ordem.find((o) => o.id === selecionada)?.rotulo ?? '');
	const propostas = $derived(data.propostas.filter((p) => p.clausula_id === selecionada && p.status === 'aberta'));
	const pedidos = $derived(data.reaberturas.filter((r) => r.clausula_id === selecionada));

	let erro = $state('');
	let mensagem = $state('');
	let edicao = $state('');
	let versaoEditada = $state(0);
	let proposta = $state('');
	let comentario = $state('');
	let novoTipo = $state('operativa');
	let novoTexto = $state('');
	let aprovacao = $state('consenso');

	// O campo de edição acompanha a cláusula escolhida e a versão dela.
	$effect(() => {
		if (clausula && clausula.versao !== versaoEditada) {
			edicao = clausula.texto;
			versaoEditada = clausula.versao;
		}
	});

	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, ok = '') {
		erro = mensagem = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		else mensagem = ok;
		await invalidate('app:documento');
		return !error;
	}

	// Passo 57: a cláusula abre no lugar, logo abaixo do texto (de novo, fecha).
	function escolher(id: string) {
		selecionada = selecionada === id ? null : id;
		versaoEditada = 0;
		marcarVisto(id);
	}

	// Editar no lugar: Enter salva, Esc cancela, Shift+Enter quebra a linha.
	let editando = $state<string | null>(null);
	async function editar(id: string) {
		selecionada = id;
		editando = id;
		edicao = porId.get(id)!.texto;
		versaoEditada = porId.get(id)!.versao;
		await tick();
		document.getElementById(`edicao-${id}`)?.focus();
	}
	async function salvarEdicao() {
		await salvarTexto();
		if (!erro) editando = null;
	}
	function teclaEdicao(evento: KeyboardEvent, salvar: () => unknown, cancelar: () => void) {
		if (evento.key === 'Enter' && !evento.shiftKey) {
			evento.preventDefault();
			void salvar();
		} else if (evento.key === 'Escape') {
			evento.preventDefault();
			evento.stopPropagation();
			cancelar();
		}
	}
	// Alt + ↑ e Alt + ↓ mudam a ordem (dentro do mesmo tipo; o banco garante).
	function teclaBloco(evento: KeyboardEvent, id: string) {
		if (!evento.altKey || !data.souRedator || !editavel || (evento.key !== 'ArrowUp' && evento.key !== 'ArrowDown')) return;
		evento.preventDefault();
		void executar(supabase.rpc('mover_clausula', { p_clausula: id, p_para_cima: evento.key === 'ArrowUp' }));
	}

	// Inserir onde se quer: depois de `depois` (ou no fim), já em edição. Enter salva e abre a
	// próxima do mesmo tipo logo abaixo.
	let nova = $state<{ depois: string | null; tipo: string; pai: string | null } | null>(null);
	async function inserir(depois: string | null, tipo: string, pai: string | null = null) {
		nova = { depois, tipo, pai };
		novoTipo = tipo;
		novoTexto = '';
		await tick();
		document.getElementById('nova-clausula')?.focus();
	}
	async function salvarNova() {
		const n = nova;
		const texto = novoTexto;
		if (!n || !texto.trim()) return;
		novoTexto = '';
		erro = mensagem = '';
		const { data: id, error } = await supabase.rpc('adicionar_clausula', {
			p_documento: d.id,
			p_tipo: n.tipo,
			p_texto: texto,
			p_pai: n.pai ?? undefined,
			p_depois: n.depois ?? undefined
		});
		if (error) {
			erro = mensagemDeErro(error);
			if (!novoTexto) novoTexto = texto;
			return;
		}
		await invalidate('app:documento');
		await inserir(id, n.tipo, n.pai);
	}
	// O último bloco de uma operativa (ela ou o último subitem), para inserir depois dele.
	const fimDaOperativa = (id: string) => formatado.operativas.find((o) => o.id === id)?.subitens.at(-1)?.id ?? id;

	// Passo 57: a posição num toque (apoio, ressalva, contra), uma por delegação; a mesa também.
	const POSICOES = { apoio: t('Apoio'), ressalva: t('Ressalva'), contra: t('Contra') } as const;
	type Posicao = keyof typeof POSICOES;
	const SELO_POSICAO: Record<Posicao, string> = { apoio: 'selo--ok', ressalva: 'selo--alerta', contra: 'selo--erro' };
	const membros = $derived(new Map((d.bloco?.membros ?? []).map((m) => [m.delegacao?.id ?? '', m.delegacao])));
	const podeOpinar = $derived(souMembro || ehMesa);
	const minhaVoz = $derived(souMembro ? (eu?.delegacao_id ?? null) : null);
	const posicoesDe = (id: string) => data.posicoes.filter((p) => p.clausula_id === id);
	const minhaPosicao = (id: string) => (podeOpinar ? posicoesDe(id).find((p) => p.delegacao_id === minhaVoz)?.posicao : undefined);
	const nomeDaVoz = (delegacao: string | null) => (delegacao ? (membros.get(delegacao)?.nome ?? '') : t('Mesa'));
	let porque = $state<string | null>(null);
	async function marcar(id: string, posicao: Posicao) {
		const nova = minhaPosicao(id) === posicao ? null : posicao;
		const ok = await executar(supabase.rpc('marcar_posicao', { p_clausula: id, p_posicao: nova as string }));
		// Ressalva ou contra: o convite para dizer o porquê (pode pular).
		porque = ok && (nova === 'ressalva' || nova === 'contra') ? id : null;
	}

	// Comentários: os ativos, os resolvidos e os estacionados de cada cláusula.
	const comentariosDe = (id: string) => data.comentarios.filter((c) => c.clausula_id === id);
	const ativos = (id: string) => comentariosDe(id).filter((c) => !c.resolvido && !c.estacionado);
	// O que é novo fica marcado no aparelho (sem "lido" no banco): por cláusula, a hora em que
	// a pessoa a abriu por último.
	let vistos = $state<Record<string, number>>({});
	$effect(() => {
		try {
			vistos = JSON.parse(localStorage.getItem(`vistos:${d.id}`) ?? '{}');
		} catch {
			vistos = {};
		}
	});
	function marcarVisto(...ids: string[]) {
		for (const id of ids) vistos[id] = Date.now();
		localStorage.setItem(`vistos:${d.id}`, JSON.stringify(vistos));
	}
	const novos = (id: string) => ativos(id).filter((c) => c.delegacao_id !== minhaVoz && Date.parse(c.criado_em) > (vistos[id] ?? 0));
	const comNovidade = $derived(data.clausulas.filter((c) => novos(c.id).length));

	// Os campos são limpos já no envio: quem digita a próxima cláusula enquanto a
	// anterior é gravada não perde o texto. Se der erro, o texto volta.
	async function enviarLimpando(campo: { ler: () => string; escrever: (v: string) => void }, acao: (texto: string) => PromiseLike<{ error: { code?: string; message?: string } | null }>, ok = '') {
		const texto = campo.ler();
		campo.escrever('');
		if (!(await executar(acao(texto), ok)) && !campo.ler()) campo.escrever(texto);
	}


	async function salvarTexto() {
		await executar(
			supabase.rpc('editar_clausula', { p_clausula: clausula!.id, p_texto: edicao, p_versao: versaoEditada }),
			t('Texto salvo.')
		);
		versaoEditada = 0; // recarrega a versão nova (ou a de quem salvou antes)
	}

	// Pela caixa de saída: sem internet, a proposta fica no aparelho e vai sozinha depois.
	async function propor(evento: SubmitEvent) {
		evento.preventDefault();
		const texto = proposta;
		const idProposta = crypto.randomUUID();
		proposta = '';
		const resultado = await caixa.enviar({
			id: idProposta,
			rpc: 'propor_alteracao',
			args: { p_clausula: clausula!.id, p_texto: texto, p_id: idProposta },
			rotulo: t('Proposta de alteração')
		});
		({ erro, mensagem } = mensagemDoEnvio(resultado, t('Proposta enviada ao redator.')));
		if (erro && !proposta) proposta = texto;
		await invalidate('app:documento');
	}

	function comentar(evento: SubmitEvent) {
		evento.preventDefault();
		const id = clausula!.id;
		porque = null;
		void enviarLimpando({ ler: () => comentario, escrever: (v) => (comentario = v) }, (texto) =>
			supabase.rpc('comentar', { p_clausula: id, p_texto: texto })
		);
	}

</script>

<svelte:head>
	<title>{tituloDaAba(nomeDoDocumento(d))}</title>
</svelte:head>

<p class="rotulo">
	<a href={`/comite/${data.comite.sigla}/blocos`}>{t('Comitê')} · {data.comite.sigla}</a> · {t('Bloco')} {d.bloco?.nome}
	<AoVivo comiteId={d.comite_id} documentoId={d.id} dependencia="app:documento" />
</p>
<h1>{nomeDoDocumento(d)}</h1>
<p class="cabecalho-documento">
	<span class="selo {STATUS_DOCUMENTO[d.status].selo}">{STATUS_DOCUMENTO[d.status].rotulo}</span>
	{#if d.ponto_pauta}<span class="suave">{t('Subtópico')}: {d.ponto_pauta.texto}</span>{/if}
	{#if d.aprovacao}<span class="suave">{d.aprovacao === 'consenso' ? t('Aprovação por consenso') : t('Aprovação por votação')}</span>{/if}
	<span class="suave">{t('{n} de {total} acordadas', { n: acordadas, total: data.clausulas.length })}</span>
</p>
{#if legado}
	<p class="aviso" role="note">{t('Documento antigo do bloco, só para leitura: o working paper e o projeto agora são da sala.')}</p>
{/if}

<!-- Passo 57: as assinaturas à vista, fixas no topo ao rolar, com a ação principal. -->
<section class="faixa-assinaturas" aria-label={t('Assinaturas')}>
	<div class="faixa-quem">
		{#each data.assinaturas as a (a.id)}<NomeDelegacao sigla={data.comite.sigla} delegacao={a} />{:else}<span class="suave">{t('Ninguém assinou ainda.')}</span>{/each}
	</div>
	<div class="faixa-contagem">
		{#if minimoAssinaturas}
			<label for="contagem-assinaturas">{t('{n} de {min} assinaturas', { n: data.assinaturas.length, min: minimoAssinaturas })}</label>
			<progress id="contagem-assinaturas" max={minimoAssinaturas} value={Math.min(data.assinaturas.length, minimoAssinaturas)}></progress>
			{#if faltam && d.status === 'rascunho'}
				<span class="suave">{faltam === 1 ? t('Falta 1 assinatura para enviar à mesa') : t('Faltam {n} assinaturas para enviar à mesa', { n: faltam })}</span>
			{/if}
		{:else}
			<span>{data.assinaturas.length === 1 ? t('1 assinatura') : t('{n} assinaturas', { n: data.assinaturas.length })}</span>
		{/if}
	</div>
	<div class="acoes">
		{#if souMembro && editavel}
			<button
				class={['botao', assinei && 'botao--secundario']}
				type="button"
				onclick={() => executar(supabase.rpc('assinar', { p_documento: d.id, p_assinar: !assinei }))}>{assinei ? t('Retirar a assinatura') : t('Assinar')}</button
			>
		{/if}
		{#if data.souRedator && editavel}
			<button class="botao" type="button" disabled={faltam > 0 || !data.clausulas.length} onclick={() => modalEnvio?.abrir()}>{t('Enviar à mesa')}</button>
		{/if}
		{#if ehMesa && d.status === 'enviado'}
			<button
				class="botao"
				type="button"
				onclick={() => executar(supabase.rpc('aprovar_documento', { p_documento: d.id, p_aprovar: true }), t('Documento aprovado.'))}>{t('Aprovar')}</button
			>
			<button
				class="botao botao--secundario"
				type="button"
				onclick={() => executar(supabase.rpc('aprovar_documento', { p_documento: d.id, p_aprovar: false }), t('Documento devolvido ao bloco.'))}
				>{t('Devolver ao bloco')}</button
			>
		{/if}
		<details class="mais-opcoes">
			<summary class="botao botao--secundario botao--pequeno">{t('Mais opções')}</summary>
			<div class="mais-opcoes-corpo">
				<a class="botao botao--secundario botao--pequeno" href={`/imprimir/documento/${d.id}`}>{t('Imprimir ou salvar como PDF')}</a>
			</div>
		</details>
	</div>
</section>

{#if data.souRedator && comNovidade.length}
	<p class="telegrama" role="status">
		{t('{n} comentários novos em {m} cláusulas', { n: comNovidade.reduce((soma, c) => soma + novos(c.id).length, 0), m: comNovidade.length })}
		<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => marcarVisto(...comNovidade.map((c) => c.id))}
			>{t('Marcar como vistos')}</button
		>
	</p>
{/if}
{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

<!-- Passo 57: o documento como fica no fim, e cada cláusula abre no lugar. -->
<article class="cartao folha documento-vivo" aria-label={t('Documento formatado')}>
	<p class="rotulo">{data.comite.sigla}{d.topico ? ` · ${t('Tópico {n}', { n: d.topico })}` : ''}</p>
	<h2>{d.titulo}</h2>
	{#each formatado.textos as x (x.id)}{@render bloco(x.id, x.texto, 'texto')}{/each}
	{#each formatado.preambulares as x (x.id)}{@render bloco(x.id, x.texto, 'preambular')}{/each}
	{#if formatado.preambulares.length || formatado.operativas.length}<p class="linha-do-comite">{formatado.linhaDoComite}</p>{/if}
	{#each formatado.operativas as o (o.id)}
		{@render bloco(o.id, o.texto, 'operativa', `${o.numero}.`)}
		{#each o.subitens as s (s.id)}{@render bloco(s.id, s.texto, 'subitem', `${s.letra})`)}{/each}
	{/each}
	{#if !data.clausulas.length}<p class="suave">{t('Nenhuma cláusula ainda.')}</p>{/if}
	{#if data.souRedator && editavel}
		{#if nova && nova.depois === null}{@render novaClausula()}{/if}
		<div class="inserir inserir--fim" role="group" aria-label={t('Acrescentar no fim')}>
			{#if d.tipo === 'working_paper'}
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => inserir(null, 'texto')}
					><Plus aria-hidden="true" size={14} /> {TIPO_CLAUSULA.texto}</button
				>
			{/if}
			<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => inserir(null, 'preambular')}
				><Plus aria-hidden="true" size={14} /> {TIPO_CLAUSULA.preambular}</button
			>
			<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => inserir(null, 'operativa')}
				><Plus aria-hidden="true" size={14} /> {TIPO_CLAUSULA.operativa}</button
			>
		</div>
	{/if}
	{#if formatado.signatarios}<p class="signatarios">{formatado.signatarios}</p>{/if}
</article>

{#snippet verbos(texto: string, tipo: string, usar: (verbo: string) => void)}
	{@const lista = sugerirVerbos(texto, tipo, data.comite.idioma)}
	{#if lista.length}
		<div class="acoes" role="group" aria-label={t('Verbos sugeridos')}>
			{#each lista as verbo (verbo)}
				<button
					class="botao botao--secundario botao--pequeno"
					type="button"
					onclick={() => usar(`${verbo} ${texto.trimStart().split(/\s+/).slice(1).join(' ')}`.trimEnd() + ' ')}>{verbo}</button
				>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet novaClausula()}
	<div class="bloco-clausula bloco-clausula--nova">
		<label class="campo">
			{t('Nova cláusula: {tipo}', { tipo: TIPO_CLAUSULA[nova!.tipo] })}
			<textarea
				id="nova-clausula"
				rows="2"
				maxlength="2000"
				bind:value={novoTexto}
				{@attach contador(novoTexto)}
				onkeydown={(e) => teclaEdicao(e, salvarNova, () => (nova = null))}
			></textarea>
		</label>
		{@render verbos(novoTexto, nova!.tipo, (v) => (novoTexto = v))}
		<p class="suave">{t('Enter salva e abre a próxima; Esc cancela.')}</p>
		<div class="acoes">
			<button class="botao botao--pequeno" type="button" disabled={!novoTexto.trim()} onclick={salvarNova}>{t('Salvar')}</button>
			<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => (nova = null)}>{t('Cancelar')}</button>
		</div>
	</div>
{/snippet}

{#snippet bloco(id: string, texto: string, tipo: string, marca = '')}
	{@const c = porId.get(id)!}
	{@const rotulo = ordem.find((o) => o.id === id)?.rotulo ?? ''}
	{@const partes = separarVerbo(texto, tipo, data.comite.idioma)}
	<div
		class={['bloco-clausula', `bloco-clausula--${tipo}`, selecionada === id && 'aberto', id === d.clausula_em_foco_id && 'em-foco']}
		role="presentation"
		onkeydown={(e) => teclaBloco(e, id)}
	>
		{#if editando === id && editavel && data.souRedator && c.status !== 'acordada'}
			<label class="campo">
				{t('Texto de {clausula}', { clausula: rotulo })}
				<textarea
					id={`edicao-${id}`}
					rows="3"
					maxlength="2000"
					bind:value={edicao}
					{@attach contador(edicao)}
					onkeydown={(e) => teclaEdicao(e, salvarEdicao, () => (editando = null))}
				></textarea>
			</label>
			{@render verbos(edicao, tipo, (v) => (edicao = v))}
			<div class="acoes">
				<button class="botao botao--pequeno" type="button" onclick={salvarEdicao}>{t('Salvar')}</button>
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => (editando = null)}>{t('Cancelar')}</button>
			</div>
		{:else}
			<button
				class="bloco-texto"
				type="button"
				aria-expanded={selecionada === id}
				onclick={() => (data.souRedator && editavel && c.status !== 'acordada' ? editar(id) : escolher(id))}
			>
				<span class="so-leitor">{rotulo}</span>
				{#if marca}<span class="bloco-marca" aria-hidden="true">{marca}</span>{/if}
				<span><span class="verbo">{partes[0]}</span>{partes[1]}</span>
			</button>
			<span class="bloco-sinais">
				{#if c.status !== 'proposta'}<span class="selo {STATUS_CLAUSULA[c.status].selo}">{STATUS_CLAUSULA[c.status].rotulo}</span>{/if}
				{#if id === d.clausula_em_foco_id}<span class="selo selo--alerta">{t('Em foco')}</span>{/if}
				{#each Object.entries(POSICOES) as [p, nome] (p)}
					{@const quem = posicoesDe(id).filter((x) => x.posicao === p)}
					{#if quem.length}<span class="selo {SELO_POSICAO[p as Posicao]}" title={quem.map((x) => nomeDaVoz(x.delegacao_id)).join(', ')}>{nome} {quem.length}</span>{/if}
				{/each}
				{#if ativos(id).length}
					<span class="selo" title={t('Comentários')}><MessageSquare aria-hidden="true" size={12} /> {ativos(id).length}</span>
				{/if}
				{#if novos(id).length}<span class="selo selo--info">{t('novo')}</span>{/if}
				{#if data.propostas.some((p) => p.clausula_id === id && p.status === 'aberta')}<span class="selo">{t('Com proposta')}</span>{/if}
			</span>
		{/if}
		{#if selecionada === id}{@render painel(c, rotulo)}{/if}
	</div>
	{#if data.souRedator && editavel}
		{#if nova && nova.depois === id}{@render novaClausula()}{/if}
		{#if tipo !== 'texto' || d.tipo === 'working_paper'}
			<div class="inserir" role="group" aria-label={t('Inserir depois de {clausula}', { clausula: rotulo })}>
				{#if tipo === 'texto'}
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => inserir(id, 'texto')}
						><Plus aria-hidden="true" size={14} /> {TIPO_CLAUSULA.texto}</button
					>
				{:else if tipo === 'preambular'}
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => inserir(id, 'preambular')}
						><Plus aria-hidden="true" size={14} /> {TIPO_CLAUSULA.preambular}</button
					>
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => inserir(id, 'operativa')}
						><Plus aria-hidden="true" size={14} /> {TIPO_CLAUSULA.operativa}</button
					>
				{:else}
					{@const operativa = tipo === 'operativa' ? id : c.pai_id!}
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => inserir(fimDaOperativa(operativa), 'operativa')}
						><Plus aria-hidden="true" size={14} /> {TIPO_CLAUSULA.operativa}</button
					>
					<button
						class="botao botao--secundario botao--pequeno"
						type="button"
						onclick={() => inserir(tipo === 'subitem' ? id : fimDaOperativa(operativa), 'subitem', operativa)}
						><Plus aria-hidden="true" size={14} /> {TIPO_CLAUSULA.subitem}</button
					>
				{/if}
			</div>
		{/if}
	{/if}
{/snippet}

{#snippet painel(c: (typeof data.clausulas)[number], rotulo: string)}
	<section class="bloco-painel" aria-label={rotulo}>
		{#if c.origem_id}<p class="suave">{t('Veio de um working paper')}</p>{/if}
		{#if data.souRedator && editavel && c.status !== 'acordada'}
			<div class="acoes">
				{#if c.status === 'proposta'}
					<button
						class="botao botao--secundario botao--pequeno"
						type="button"
						onclick={() => executar(supabase.rpc('marcar_clausula', { p_clausula: c.id, p_status: 'em_discussao' }))}>{t('Pôr em discussão')}</button
					>
				{/if}
				<button
					class="botao botao--secundario botao--pequeno"
					type="button"
					onclick={() => executar(supabase.rpc('marcar_clausula', { p_clausula: c.id, p_status: 'acordada' }))}>{t('Marcar como acordada')}</button
				>
				<button
					class="botao botao--secundario botao--pequeno"
					type="button"
					onclick={() => executar(supabase.rpc('focar_clausula', { p_documento: d.id, p_clausula: c.id }))}>{t('Pôr em foco')}</button
				>
				<button
					class="botao botao--secundario botao--pequeno"
					type="button"
					title="Alt + ↑"
					onclick={() => executar(supabase.rpc('mover_clausula', { p_clausula: c.id, p_para_cima: true }))}>{t('Subir')}</button
				>
				<button
					class="botao botao--secundario botao--pequeno"
					type="button"
					title="Alt + ↓"
					onclick={() => executar(supabase.rpc('mover_clausula', { p_clausula: c.id, p_para_cima: false }))}>{t('Descer')}</button
				>
				<button
					class="botao botao--secundario botao--pequeno"
					type="button"
					onclick={async () => {
						if (await executar(supabase.rpc('remover_clausula', { p_clausula: c.id }))) selecionada = editando = null;
					}}>{t('Remover')}</button
				>
			</div>
		{/if}
		{#if c.status === 'acordada' && souMembro && editavel}
			<p>
				{t('Acordada e travada. Para reabrir, {n} delegações precisam pedir ({pedidos} até agora).', {
					n: data.regras.reabrir_clausula_min_delegacoes,
					pedidos: pedidos.length
				})}
			</p>
			<button
				class="botao botao--secundario botao--pequeno"
				type="button"
				disabled={pedidos.some((p) => p.delegacao_id === eu?.delegacao_id)}
				onclick={() => executar(supabase.rpc('pedir_reabertura', { p_clausula: c.id }), t('Pedido de reabertura registrado.'))}
				>{t('Pedir reabertura')}</button
			>
		{/if}
		{#if podeOpinar}
			<!-- A posição num toque: apoio, ressalva ou contra (de novo, desmarca). -->
			<div class="acoes" role="group" aria-label={t('Sua posição')}>
				{#each Object.entries(POSICOES) as [p, nome] (p)}
					<button
						class={['botao botao--pequeno', minhaPosicao(c.id) !== p && 'botao--secundario']}
						type="button"
						aria-pressed={minhaPosicao(c.id) === p}
						onclick={() => marcar(c.id, p as Posicao)}>{nome}</button
					>
				{/each}
			</div>
			<form class="comentar-linha" onsubmit={comentar}>
				<label class="so-leitor" for={`comentario-${c.id}`}>{porque === c.id ? t('Diga o porquê (opcional)') : t('Comentário')}</label>
				<input
					id={`comentario-${c.id}`}
					required
					maxlength="280"
					placeholder={porque === c.id ? t('Diga o porquê (opcional)') : t('Comentar esta cláusula')}
					bind:value={comentario}
				/>
				<button class="botao botao--secundario botao--pequeno">{t('Comentar')}</button>
				{#if porque === c.id}<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => (porque = null)}>{t('Pular')}</button>{/if}
			</form>
		{/if}
		<ul class="lista lista--compacta" aria-label={t('Comentários')}>
			{#each ativos(c.id) as k (k.id)}
				<li>
					<span>
						<strong>{#if k.delegacao_id && membros.get(k.delegacao_id)}<NomeDelegacao sigla={data.comite.sigla} delegacao={membros.get(k.delegacao_id)} />{:else}{t('Mesa')}{/if}</strong>
						{k.texto} <span class="suave"><Quando iso={k.criado_em} /></span>
					</span>
					{#if data.souRedator}
						<span class="acoes">
							<button
								class="botao botao--secundario botao--pequeno"
								type="button"
								aria-label={t('Resolver o comentário "{texto}"', { texto: k.texto.slice(0, 30) })}
								onclick={() => executar(supabase.rpc('resolver_comentario', { p_comentario: k.id, p_resolvido: true }))}>{t('Resolvido')}</button
							>
							<button
								class="botao botao--secundario botao--pequeno"
								type="button"
								aria-label={`${t('Estacionar')}: "${k.texto.slice(0, 30)}"`}
								onclick={() => executar(supabase.rpc('estacionar_comentario', { p_comentario: k.id, p_estacionado: true }))}>{t('Estacionar')}</button
							>
						</span>
					{/if}
				</li>
			{:else}
				<li class="suave">{t('Nenhum comentário.')}</li>
			{/each}
		</ul>
		{#each [['resolvido', t('Resolvidos')], ['estacionado', t('Estacionados')]] as const as [campo, titulo] (campo)}
			{@const lista = comentariosDe(c.id).filter((k) => k[campo])}
			{#if lista.length}
				<details>
					<summary>{titulo} ({lista.length})</summary>
					<ul class="lista lista--compacta">
						{#each lista as k (k.id)}<li><span><strong>{nomeDaVoz(k.delegacao_id)}</strong> {k.texto}</span></li>{/each}
					</ul>
				</details>
			{/if}
		{/each}
		{#if propostas.length || (souMembro && !data.souRedator && editavel && c.status !== 'acordada')}
			<h3 class="rotulo">{t('Propostas de alteração')}</h3>
			<ul class="lista lista--compacta">
				{#each propostas as p (p.id)}
					<li>
						<span>{p.texto_novo} <span class="detalhe">{p.delegacao?.nome}</span></span>
						{#if data.souRedator && editavel}
							<span class="acoes">
								<button
									class="botao botao--pequeno"
									type="button"
									aria-label={`Aceitar a proposta de ${p.delegacao?.nome}`}
									onclick={() => executar(supabase.rpc('responder_proposta', { p_proposta: p.id, p_aceitar: true }), t('Proposta aceita.'))}
									>{t('Aceitar')}</button
								>
								<button
									class="botao botao--secundario botao--pequeno"
									type="button"
									aria-label={`Recusar a proposta de ${p.delegacao?.nome}`}
									onclick={() => executar(supabase.rpc('responder_proposta', { p_proposta: p.id, p_aceitar: false }))}>{t('Recusar')}</button
								>
							</span>
						{/if}
					</li>
				{:else}
					<li class="suave">{t('Nenhuma proposta aberta.')}</li>
				{/each}
			</ul>
			{#if souMembro && !data.souRedator && editavel && c.status !== 'acordada'}
				<form class="formulario" onsubmit={propor}>
					<label class="campo">
						{t('Sua proposta de texto')}
						<textarea required maxlength="2000" rows="2" bind:value={proposta} {@attach contador(proposta)}></textarea>
					</label>
					<button class="botao botao--secundario botao--pequeno">{t('Propor alteração')}</button>
				</form>
			{/if}
		{/if}
	</section>
{/snippet}

<Modal bind:this={modalEnvio} rotulo="envio-titulo" classe="modal-acao">
	<h3 id="envio-titulo">{t('Enviar à mesa?')}</h3>
	<p>{t('Depois do envio, o texto fica com a mesa e não se edita mais.')}</p>
	{#if d.tipo !== 'working_paper'}
		<fieldset class="opcoes">
			<legend>{t('Aprovação')}</legend>
			<label class="opcao"><input type="radio" value="consenso" bind:group={aprovacao} /> {t('Por consenso')}</label>
			<label class="opcao"><input type="radio" value="votacao" bind:group={aprovacao} /> {t('Por votação')}</label>
		</fieldset>
	{/if}
	<div class="acoes">
		<button class="botao" type="button" onclick={enviar}>{t('Enviar à mesa')}</button>
		<button class="botao botao--secundario" type="button" onclick={() => modalEnvio?.fechar()}>{t('Cancelar')}</button>
	</div>
</Modal>




