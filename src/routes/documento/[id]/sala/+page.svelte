<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { goto, invalidate } from '$app/navigation';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import { formatarDocumento } from '#lib/formatacao.ts';
	import { doTopico } from '#lib/ordem.ts';
	import { dica } from '#lib/dica.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Confirmar from '#lib/ui/Confirmar.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import NomeDelegacao from '#lib/ui/NomeDelegacao.svelte';
	import TrilhaDoTopico from '#lib/ui/TrilhaDoTopico.svelte';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import Crosshair from '@lucide/svelte/icons/crosshair';
	import Eraser from '@lucide/svelte/icons/eraser';
	import Gavel from '@lucide/svelte/icons/gavel';
	import ListPlus from '@lucide/svelte/icons/list-plus';
	import PencilLine from '@lucide/svelte/icons/pencil-line';
	import Printer from '@lucide/svelte/icons/printer';
	import SpellCheck from '@lucide/svelte/icons/spell-check';
	import type { PageProps } from './$types';

	// Passo 63: o documento da sala. No working paper de cada item da agenda, os redatores dos
	// blocos (ou a delegação sem bloco) propõem; todas as delegações marcam posição num toque; quem
	// preside a sessão aceita ou rejeita depois do debate, como na agenda. A mesa transforma os
	// working papers em projeto, que nasce fechado (só correções de forma) e vai à fase de ação.
	// Passo 64: o texto limpo à esquerda e o resumo à direita; cada cláusula abre um painel.
	let { data }: PageProps = $props();

	type Proposta = (typeof data.propostas)[number];
	type Posicao = 'apoio' | 'ressalva' | 'contra';
	type Acao = 'alterar' | 'incluir' | 'retirar' | 'mover';
	const POSICOES: Record<Posicao, string> = { apoio: t('Apoio'), ressalva: t('Ressalva'), contra: t('Contra') };
	const DICA_POSICAO: Record<Posicao, string> = {
		apoio: t('Sua delegação concorda com esta proposta.'),
		ressalva: t('Sua delegação aceita, mas com reservas.'),
		contra: t('Sua delegação não aceita esta proposta.')
	};
	const SELO_POSICAO: Record<Posicao, string> = { apoio: 'selo--ok', ressalva: 'selo--alerta', contra: 'selo--erro' };
	const TIPO: Record<string, string> = { preambular: t('Preambular'), operativa: t('Operativa'), subitem: t('Subitem'), texto: t('Texto livre') };

	const d = $derived(data.documento);
	const sigla = $derived(data.comite.sigla);
	const ehWp = $derived(d.tipo === 'working_paper');
	const aberto = $derived(ehWp && d.status === 'rascunho');
	const ehMesa = $derived(
		data.participacoes.some((p) => (p.papel === 'mesa' && p.comite_id === d.comite_id) || p.papel === 'secretaria')
	);
	// Quem entra num bloco passa a escrita ao redator; sem bloco, a delegação é a própria redatora.
	const possoPropor = $derived(aberto && !!data.eu && (!data.meuBloco || data.meuBloco.redator));
	const possoFocar = $derived(aberto && (data.podePresidir || ehMesa));
	const decido = $derived(aberto && data.podePresidir);
	const corrijo = $derived(ehMesa && !ehWp && (d.status === 'enviado' || d.status === 'aprovado_mesa'));
	// A cláusula abre o painel quando há o que fazer nela: propor, marcar posição, decidir ou corrigir.
	const interativo = $derived(aberto || corrijo);
	const emAcao = $derived(!ehWp && (d.status === 'aprovado_mesa' || d.status === 'em_votacao'));
	const projeto = $derived(data.irmaos.find((x) => x.tipo === 'projeto'));
	const titulo = $derived(
		ehWp ? d.titulo : d.status === 'aprovado' ? t('Resolução do tópico {n}', { n: d.topico ?? 0 }) : t('Projeto de resolução')
	);

	const formatado = $derived(formatarDocumento(data.clausulas, data.comite, data.assinaturas.map((a) => a.nome_oficial)));
	// O nome de cada cláusula ("Operativa 2", "Subitem 2.a"), para o painel.
	const nomes = $derived(
		new Map<string, string>([
			...formatado.textos.map((x) => [x.id, TIPO.texto] as const),
			...formatado.preambulares.map((x) => [x.id, TIPO.preambular] as const),
			...formatado.operativas.flatMap((o) => [
				[o.id, `${TIPO.operativa} ${o.numero}`] as const,
				...o.subitens.map((s) => [s.id, `${TIPO.subitem} ${o.numero}.${s.letra}`] as const)
			])
		])
	);
	const trecho = (id: string | null) => {
		const c = data.clausulas.find((x) => x.id === id);
		return !c ? t('(cláusula retirada)') : c.texto.length > 60 ? `${c.texto.slice(0, 60)}…` : c.texto;
	};

	// As propostas: abertas no painel da cláusula; as decididas no histórico.
	const contar = (p: Proposta, x: Posicao) => p.posicoes.filter((q) => q.posicao === x).length;
	// O sinal de consenso, como na agenda: ninguém contra e o apoio de pelo menos metade das
	// delegações. É o termômetro; o consenso se forma no debate.
	const consenso = (p: Proposta) => !contar(p, 'contra') && contar(p, 'apoio') >= Math.ceil(data.totalDelegacoes / 2);
	const minha = (p: Proposta) => p.posicoes.find((q) => q.delegacao_id === data.eu)?.posicao as Posicao | undefined;
	const abertas = $derived(data.propostas.filter((p) => p.status === 'aberta'));
	const decididas = $derived(
		data.propostas.filter((p) => p.status !== 'aberta').sort((a, b) => (b.decidida_em ?? '').localeCompare(a.decidida_em ?? ''))
	);
	let filtro = $state<'todas' | 'consenso' | 'debate'>('todas');
	const visiveis = $derived(abertas.filter((p) => filtro === 'todas' || (filtro === 'consenso') === consenso(p)));
	// As propostas de uma cláusula (null: as cláusulas novas no fim do texto).
	const daClausula = (id: string | null, lista = abertas) => lista.filter((p) => (p.acao === 'incluir' ? p.depois_de : p.clausula_id) === id);
	const novasNoFim = $derived(daClausula(null, visiveis));
	const FILTROS = $derived([
		{ valor: 'todas', nome: t('Todas'), n: abertas.length, dica: t('Cada proposta ainda em aberto, com ou sem consenso.') },
		{ valor: 'consenso', nome: t('Com consenso'), n: abertas.filter(consenso).length, dica: t('Sem delegação contra e com o apoio de pelo menos metade da sala.') },
		{ valor: 'debate', nome: t('Em debate'), n: abertas.filter((p) => !consenso(p)).length, dica: t('As propostas que ainda não chegaram ao consenso.') }
	] as const);

	const descrever = (p: Proposta) =>
		p.acao === 'alterar'
			? t('Mudar para: "{texto}"', { texto: p.texto_novo ?? '' })
			: p.acao === 'retirar'
				? t('Retirar a cláusula')
				: p.acao === 'mover'
					? p.depois_de
						? t('Mover para depois de "{outra}"', { outra: trecho(p.depois_de) })
						: t('Mover para o começo')
					: t('Incluir ({tipo}): "{texto}"', { tipo: TIPO[p.tipo ?? 'operativa'], texto: p.texto_novo ?? '' });

	let erro = $state('');
	let mensagem = $state('');
	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, ok = '') {
		erro = mensagem = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		else mensagem = ok;
		await invalidate('app:sala');
		return !error;
	}
	const marcar = (p: Proposta, x: Posicao) =>
		executar(supabase.rpc('marcar_posicao_proposta', { p_proposta: p.id, p_posicao: (minha(p) === x ? null : x) as string }));
	const decidir = (p: Proposta, aceitar: boolean) =>
		executar(
			supabase.rpc('decidir_proposta', { p_proposta: p.id, p_aceitar: aceitar }),
			aceitar ? t('Proposta aceita: o texto mudou.') : t('Proposta rejeitada.')
		);

	// Passo 64: o painel à direita. A cláusula abre com o texto, os verbos (cada um troca o
	// painel pelo formulário dele) e as propostas; sem cláusula, as cláusulas novas do fim.
	type Modo = 'ver' | 'corrigir' | Acao;
	let painelAberto = $state(false);
	let alvoId = $state<string | null>(null);
	let modo = $state<Modo>('ver');
	const alvo = $derived(alvoId ? data.clausulas.find((c) => c.id === alvoId) : undefined);
	let texto = $state('');
	let tipo = $state<'preambular' | 'operativa'>('operativa');
	let depois = $state('');
	let motivo = $state('');
	let correcao = $state('');
	function abrir(id: string | null, novoModo: Modo = 'ver') {
		alvoId = id;
		mensagem = '';
		irPara(novoModo);
		painelAberto = true;
	}
	function irPara(novoModo: Modo) {
		modo = novoModo;
		erro = '';
		texto = novoModo === 'alterar' ? (alvo?.texto ?? '') : '';
		tipo = alvo?.tipo === 'preambular' ? 'preambular' : 'operativa';
		depois = '';
		motivo = '';
		correcao = alvo?.texto ?? '';
	}
	const TITULO = $derived<Record<Acao, string>>({
		alterar: t('Mudar o texto'),
		incluir: alvoId ? t('Incluir uma cláusula depois desta') : t('Propor uma cláusula nova'),
		mover: t('Mudar de lugar'),
		retirar: t('Retirar do texto')
	});
	async function propor(evento: SubmitEvent) {
		evento.preventDefault();
		const acao = modo as Acao;
		const ok = await executar(
			supabase.rpc('propor_no_documento', {
				p_documento: d.id,
				p_acao: acao,
				p_clausula: acao === 'incluir' ? undefined : (alvoId ?? undefined),
				p_texto: acao === 'alterar' || acao === 'incluir' ? texto : undefined,
				p_tipo: acao === 'incluir' ? tipo : undefined,
				p_depois: acao === 'incluir' ? (alvoId ?? undefined) : acao === 'mover' ? depois || undefined : undefined,
				p_motivo: motivo || undefined
			}),
			t('Proposta feita. A sala debate e marca a posição; quem preside decide.')
		);
		// Feita, o painel volta à cláusula, com a proposta na lista; a cláusula nova do fim fecha.
		if (ok) {
			if (alvoId) modo = 'ver';
			else painelAberto = false;
		}
	}
	const vizinhas = $derived(alvo ? data.clausulas.filter((c) => c.id !== alvo.id && c.tipo === alvo.tipo && c.pai_id === alvo.pai_id) : []);

	// A mesa faz as correções de forma no projeto.
	async function salvarCorrecao(evento: SubmitEvent) {
		evento.preventDefault();
		if (!alvo) return;
		const ok = await executar(
			supabase.rpc('corrigir_clausula', { p_clausula: alvo.id, p_texto: correcao, p_versao: alvo.versao }),
			t('Correção salva.')
		);
		if (ok) modo = 'ver';
	}

	// Assinaturas: o working paper aberto, qualquer delegação; o projeto, as membros, até a fase de ação.
	const assinei = $derived(data.assinaturas.some((a) => a.id === data.eu));
	const possoAssinar = $derived(!!data.eu && (ehWp ? d.status === 'rascunho' : d.status === 'enviado' && !data.observadora));
	const minimo = $derived(data.regras.assinaturas_projeto_min);
	const assinaturasQueContam = $derived(data.assinaturas.filter((a) => a.situacao === 'membro').length);

	async function transformar() {
		erro = mensagem = '';
		const { data: id, error } = await supabase.rpc('transformar_em_projeto', { p_comite: d.comite_id, p_topico: d.topico ?? 0 });
		if (error) erro = mensagemDeErro(error);
		else await goto(`/documento/${id}/sala`);
	}
	const situacao = $derived(
		ehWp
			? aberto
				? t('Aberto a propostas. Os redatores dos blocos (ou a delegação sem bloco) propõem; toda delegação marca a posição; quem preside a sessão aceita ou rejeita depois do debate.')
				: t('Este working paper virou o projeto do tópico e fica só para leitura.')
			: d.status === 'enviado'
				? t('O texto está fechado: só a mesa faz correções de forma. Com {n} assinaturas, a mesa o leva à fase de ação.', { n: minimo })
				: d.status === 'aprovado'
					? t('Aprovado: é a resolução do tópico.')
					: d.status === 'rejeitado'
						? t('Rejeitado na votação. Os working papers do tópico reabriram para propostas.')
						: t('Na fase de ação: a mesa pergunta se alguma delegação se opõe; com objeção, vai a voto.')
	);
</script>

{#snippet avisos()}
	{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
	{#if mensagem}<p class="sucesso" role="status">{mensagem}</p>{/if}
{/snippet}

{#snippet proposta(p: Proposta)}
	<li>
		<span>
			<strong>{descrever(p)}</strong>
			<span class="detalhe">
				{#if p.delegacao}<NomeDelegacao {sigla} delegacao={p.delegacao} />{/if}{#if p.bloco}{` · ${p.bloco.nome}`}{/if}{#if p.motivo}{` · ${p.motivo}`}{/if}
			</span>
			{#each Object.entries(POSICOES) as [x, nome] (x)}
				{@const n = contar(p, x as Posicao)}
				{#if n}<span class="selo {SELO_POSICAO[x as Posicao]}">{nome} {n}</span>{/if}
			{/each}
			{#if consenso(p)}<span class="selo selo--ok">{t('consenso')}</span>{/if}
		</span>
		<span class="acoes">
			{#if data.eu && aberto}
				<span class="acoes" role="group" aria-label={t('Sua posição sobre: {proposta}', { proposta: descrever(p) })}>
					{#each Object.entries(POSICOES) as [x, nome] (x)}
						<button
							class={['botao botao--pequeno', minha(p) !== x && 'botao--secundario']}
							type="button"
							aria-pressed={minha(p) === x}
							{@attach dica(DICA_POSICAO[x as Posicao])}
							onclick={() => marcar(p, x as Posicao)}>{nome}</button
						>
					{/each}
				</span>
			{/if}
			{#if decido}
				<span class="acoes" role="group" aria-label={t('Decidir: {proposta}', { proposta: descrever(p) })}>
					{#if consenso(p)}
						<button class="botao botao--pequeno" type="button" onclick={() => decidir(p, true)} {@attach dica(t('A mudança proposta passa a valer no texto.'))}>{t('Aceitar')}</button>
					{:else}
						<Confirmar
							classe="botao botao--pequeno"
							rotulo={t('Aceitar')}
							pergunta={t('Aceitar sem o sinal de consenso?')}
							explicacao={t('Há delegação contra, ou o apoio não chega à metade. O consenso se forma no debate: aceite se a sala chegou a ele.')}
							acao={() => decidir(p, true)}
						/>
					{/if}
					<button
						class="botao botao--secundario botao--pequeno"
						type="button"
						{@attach dica(t('A proposta sai do debate, e o texto fica como está.'))}
						onclick={() => decidir(p, false)}>{t('Rejeitar')}</button
					>
				</span>
			{/if}
		</span>
	</li>
{/snippet}

<!-- Passo 64: a cláusula é uma linha limpa, com no máximo dois selos; clicar abre o painel. -->
{#snippet linha(textoFormatado: string, numero: string, propostas: Proposta[], foco: boolean)}
	<span class="clausula-sala-texto">{#if numero}<span class="numero">{numero}</span>{/if}{textoFormatado}</span>
	{#if foco || propostas.length}
		<span class="linha-item-selos">
			{#if foco}<span class="selo selo--info">{t('em foco')}</span>{/if}
			{#if propostas.length}
				<span class={['selo', propostas.some(consenso) && 'selo--ok']}>{propostas.length === 1 ? t('1 proposta') : t('{n} propostas', { n: propostas.length })}</span>
			{/if}
		</span>
	{/if}
{/snippet}

{#snippet bloco(id: string, textoFormatado: string, numero = '')}
	{@const foco = d.clausula_em_foco_id === id}
	{#if interativo}
		<button class={['linha-item', foco && 'linha-item--foco']} type="button" aria-haspopup="dialog" onclick={() => abrir(id)}>
			{@render linha(textoFormatado, numero, daClausula(id, visiveis), foco)}
		</button>
	{:else}
		<p class={['linha-item', foco && 'linha-item--foco']}>{@render linha(textoFormatado, numero, [], foco)}</p>
	{/if}
{/snippet}

<svelte:head>
	<title>{tituloDaAba(titulo, sigla)}</title>
</svelte:head>

<p class="rotulo">
	{t('Comitê')} · {sigla}{d.topico ? ` · ${t('Tópico {n}', { n: d.topico })}` : ''}
	<AoVivo comiteId={d.comite_id} documentoId={d.id} dependencia="app:sala" />
</p>
<h1>{titulo}</h1>
{#if d.topico}<TrilhaDoTopico {sigla} mesa={ehMesa} compacta {...doTopico(data.ordem, d.topico)} />{/if}

{#if data.irmaos.length > 1}
	<nav class="abas-topicos" aria-label={t('Documentos do tópico')}>
		{#each data.irmaos as x (x.id)}
			<a class={['botao botao--pequeno', x.id !== d.id && 'botao--secundario']} href={`/documento/${x.id}/sala`} aria-current={x.id === d.id ? 'page' : undefined}
				{@attach dica(x.tipo === 'projeto' ? t('O projeto de resolução do tópico, feito dos working papers.') : t('Um working paper do tópico, de um item da agenda.'))}
				>{x.tipo === 'projeto' ? t('Projeto') : x.titulo}</a
			>
		{/each}
	</nav>
{/if}

{#if !painelAberto}{@render avisos()}{/if}

<!-- A ação principal de cada papel, sem rolar. -->
<div class="acoes">
	{#if possoPropor}
		<button class="botao" type="button" aria-haspopup="dialog" onclick={() => abrir(null, 'incluir')} {@attach dica(t('Sugerir um texto novo, que a sala debate antes de entrar.'))}
			><ListPlus aria-hidden="true" size={18} strokeWidth={1.75} /> {t('Propor uma cláusula nova')}</button
		>
	{/if}
	{#if possoAssinar}
		<button
			class={['botao', assinei && 'botao--secundario']}
			type="button"
			{@attach dica(assinei ? t('Sua delegação deixa de apoiar o documento.') : t('Sua delegação mostra acordo com o texto e apoia o documento.'))}
			onclick={() =>
				executar(supabase.rpc('assinar', { p_documento: d.id, p_assinar: !assinei }), assinei ? t('Assinatura retirada.') : t('Documento assinado.'))}
			>{assinei ? t('Retirar a assinatura') : t('Assinar')}</button
		>
	{/if}
	{#if ehMesa && aberto}
		<Confirmar
			classe="botao botao--secundario"
			rotulo={t('Transformar em projeto')}
			pergunta={t('Transformar os working papers do tópico {n} em projeto?', { n: d.topico ?? 0 })}
			explicacao={t('O app junta os working papers do tópico: primeiro os preâmbulos, depois as operativas, na ordem dos itens. As assinaturas passam junto, e as propostas ainda em debate ficam de fora.')}
			acao={transformar}
		/>
	{/if}
	{#if ehMesa && !ehWp && d.status === 'enviado'}
		{#if assinaturasQueContam >= minimo}
			<Confirmar
				classe="botao"
				rotulo={t('Levar à fase de ação')}
				pergunta={t('Levar o projeto à fase de ação?')}
				explicacao={t('As assinaturas deixam de mudar. Um signatário lê o projeto, e a mesa pergunta se alguma delegação se opõe.')}
				acao={() => executar(supabase.rpc('aprovar_documento', { p_documento: d.id, p_aprovar: true }), t('O projeto está na fase de ação.'))}
			/>
		{:else}
			<button class="botao" type="button" {@attach dica(t('Faltam assinaturas: {n} de {min}.', { n: assinaturasQueContam, min: minimo }), true)}
				>{t('Levar à fase de ação')}</button
			>
		{/if}
	{/if}
	<!-- Passo 64: da fase de ação à resolução, a um clique. -->
	{#if emAcao && ehMesa}
		<a class="botao" href={`/comite/${sigla}/sessao/presidencia?projetos`} {@attach dica(t('Abre os projetos na Presidência: consenso ou votação.'))}
			><Gavel aria-hidden="true" size={18} strokeWidth={1.75} /> {t('Conduzir a fase de ação')}</a
		>
	{:else if emAcao}
		<a class="botao botao--secundario" href={`/comite/${sigla}/sessao`} {@attach dica(t('A fase de ação acontece na sessão.'))}>{t('Acompanhar na Sessão')}</a>
	{/if}
	{#if d.status === 'aprovado'}
		<a class="botao" href={`/imprimir/documento/${d.id}`} {@attach dica(t('O documento formatado, pronto para imprimir ou guardar.'))}
			><Printer aria-hidden="true" size={18} strokeWidth={1.75} /> {t('Imprimir ou salvar como PDF')}</a
		>
		<a class="botao botao--secundario" href={`/comite/${sigla}/votacoes`} {@attach dica(t('Abre os resultados das votações do comitê.'))}>{t('Votações')}</a>
	{/if}
	{#if ehWp && !aberto && projeto}
		<a class="botao" href={`/documento/${projeto.id}/sala`} {@attach dica(t('Este working paper já virou projeto: o debate segue lá.'))}>{t('Abrir o projeto do tópico')}</a>
	{/if}
</div>

<div class="editor-topico">
	<article class="cartao folha documento-sala" aria-label={t('Texto do documento')}>
		{#each formatado.textos as x (x.id)}{@render bloco(x.id, x.texto)}{/each}
		{#each formatado.preambulares as x (x.id)}{@render bloco(x.id, x.texto)}{/each}
		{#if formatado.preambulares.length || formatado.operativas.length}<p class="linha-do-comite">{formatado.linhaDoComite}</p>{/if}
		{#each formatado.operativas as o (o.id)}
			{@render bloco(o.id, o.texto, `${o.numero}.`)}
			{#each o.subitens as s (s.id)}{@render bloco(s.id, s.texto, `${s.letra})`)}{/each}
		{/each}
		{#if !data.clausulas.length}
			<p class="suave">{aberto ? t('Nenhuma cláusula ainda. Os redatores propõem as primeiras.') : t('Nenhuma cláusula.')}</p>
		{/if}
		{#if novasNoFim.length}
			<button class="linha-item linha-item--novas" type="button" aria-haspopup="dialog" onclick={() => abrir(null)}>
				<span>{novasNoFim.length === 1 ? t('1 cláusula nova proposta') : t('{n} cláusulas novas propostas', { n: novasNoFim.length })}</span>
				{#if novasNoFim.some(consenso)}<span class="selo selo--ok">{t('consenso')}</span>{/if}
			</button>
		{/if}
		{#if formatado.signatarios}<p class="signatarios">{formatado.signatarios}</p>{/if}
	</article>

	<aside class="editor-lado" aria-label={t('Resumo do documento')}>
		<p class="suave">{situacao}</p>
		{#if abertas.length}
			<section aria-labelledby="t-propostas">
				<h2 id="t-propostas">{t('Propostas abertas')}</h2>
				<div class="acoes" role="group" aria-label={t('Mostrar as propostas')}>
					{#each FILTROS as f (f.valor)}
						<button class={['botao botao--pequeno', filtro !== f.valor && 'botao--secundario']} type="button" aria-pressed={filtro === f.valor} onclick={() => (filtro = f.valor)}
							{@attach dica(f.dica)}
							>{f.nome} <span class="selo">{f.n}</span></button
						>
					{/each}
				</div>
			</section>
		{/if}
		<section aria-labelledby="t-assinaturas">
			<h2 id="t-assinaturas">{t('Assinaturas')} <span class="selo">{data.assinaturas.length}</span></h2>
			<p class="suave">
				{ehWp
					? t('Assinar mostra acordo com o texto. Quando o working paper vira projeto, as assinaturas passam junto (menos as das observadoras).')
					: t('O projeto precisa de {n} assinaturas de delegações membros para ir à fase de ação.', { n: minimo })}
			</p>
			{#if data.assinaturas.length}
				<ul class="lista lista--compacta">
					{#each data.assinaturas as a (a.id)}<li><NomeDelegacao {sigla} delegacao={a} /></li>{/each}
				</ul>
			{/if}
		</section>
		{#if decididas.length}
			<details>
				<summary>{t('Decididas ({n})', { n: decididas.length })}</summary>
				<ul class="lista lista--compacta">
					{#each decididas as p (p.id)}
						<li>
							<span>
								{descrever(p)}
								<span class="detalhe">{#if p.delegacao}<NomeDelegacao {sigla} delegacao={p.delegacao} />{/if}</span>
							</span>
							<span class="selo {p.status === 'aceita' ? 'selo--ok' : 'selo--erro'}">{p.status === 'aceita' ? t('aceita') : t('rejeitada')}</span>
						</li>
					{/each}
				</ul>
			</details>
		{/if}
		{#if d.status !== 'aprovado'}
			<p><a class="botao botao--secundario botao--pequeno" href={`/imprimir/documento/${d.id}`} {@attach dica(t('O documento formatado, pronto para imprimir ou guardar.'))}>{t('Imprimir ou salvar como PDF')}</a></p>
		{/if}
	</aside>
</div>

<!-- Passo 64: o painel da cláusula, à direita (no celular, a tela toda). Cobre o resumo e deixa o texto à vista. -->
<Modal lateral aberto={painelAberto} onclose={() => (painelAberto = false)} rotulo="painel-titulo">
	{#if modo === 'ver'}
		<h3 id="painel-titulo">{alvoId ? (nomes.get(alvoId) ?? t('(cláusula retirada)')) : t('Cláusulas novas propostas')}</h3>
		{#if alvo}<p class="painel-texto">{alvo.texto}</p>{/if}
		{@render avisos()}
		{#if alvo && (possoPropor || possoFocar || corrijo)}
			<div class="acoes" role="group" aria-label={t('O que fazer nesta cláusula')}>
				{#if possoPropor}
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => irPara('alterar')} {@attach dica(t('Propõe um texto novo para esta cláusula.'))}
						><PencilLine aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Mudar o texto')}</button
					>
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => irPara('incluir')} {@attach dica(t('Propõe uma cláusula nova logo depois desta.'))}
						><ListPlus aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Incluir depois')}</button
					>
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => irPara('mover')} {@attach dica(t('Propõe outra posição para esta cláusula.'))}
						><ArrowUpDown aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Mudar de lugar')}</button
					>
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => irPara('retirar')} {@attach dica(t('Propõe tirar esta cláusula do texto.'))}
						><Eraser aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Retirar')}</button
					>
				{/if}
				{#if possoFocar && d.clausula_em_foco_id !== alvo.id}
					<button
						class="botao botao--secundario botao--pequeno"
						type="button"
						{@attach dica(t('A sala e o telão passam a debater esta cláusula.'))}
						onclick={() => executar(supabase.rpc('focar_clausula', { p_documento: d.id, p_clausula: alvo.id }))}
						><Crosshair aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Pôr em foco')}</button
					>
				{/if}
				{#if corrijo}
					<button class="botao botao--secundario botao--pequeno" type="button" {@attach dica(t('Só correções de forma: gramática e digitação.'))} onclick={() => irPara('corrigir')}
						><SpellCheck aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Corrigir')}</button
					>
				{/if}
			</div>
		{/if}
		{#if aberto}
			<h4>{t('Propostas abertas')}</h4>
			<ul class="lista" aria-label={t('Propostas para esta cláusula')}>
				{#each daClausula(alvoId) as p (p.id)}{@render proposta(p)}{:else}<li class="suave">{t('Nenhuma proposta aberta.')}</li>{/each}
			</ul>
		{/if}
		<form method="dialog" class="acoes"><button class="botao botao--secundario">{t('Fechar')}</button></form>
	{:else if modo === 'corrigir'}
		<form class="formulario" onsubmit={salvarCorrecao}>
			<p class="rotulo">{nomes.get(alvoId ?? '')}</p>
			<h3 id="painel-titulo">{t('Correção de forma')}</h3>
			<p class="suave">{t('Só gramática e digitação: o conteúdo do projeto não muda.')}</p>
			<label class="campo">
				{t('Texto')}
				<textarea required maxlength="2000" rows="6" bind:value={correcao}></textarea>
			</label>
			{@render avisos()}
			<div class="acoes">
				<button class="botao">{t('Salvar a correção')}</button>
				<button class="botao botao--secundario" type="button" onclick={() => irPara('ver')}>{t('Voltar')}</button>
			</div>
		</form>
	{:else}
		<form class="formulario" onsubmit={propor}>
			{#if alvoId}<p class="rotulo">{nomes.get(alvoId)}</p>{/if}
			<h3 id="painel-titulo">{TITULO[modo as Acao]}</h3>
			{#if alvo && modo !== 'alterar'}<p class="painel-texto">{alvo.texto}</p>{/if}
			{#if data.meuBloco}<p class="suave">{t('Em nome do bloco {nome}.', { nome: data.meuBloco.bloco?.nome ?? '' })}</p>{/if}
			{#if modo === 'incluir'}
				<fieldset class="opcoes">
					<legend>{t('Tipo da cláusula nova')}</legend>
					<label class="opcao"><input type="radio" value="preambular" bind:group={tipo} /> {TIPO.preambular}</label>
					<label class="opcao"><input type="radio" value="operativa" bind:group={tipo} /> {TIPO.operativa}</label>
				</fieldset>
			{/if}
			{#if modo === 'alterar' || modo === 'incluir'}
				<label class="campo">
					{modo === 'alterar' ? t('Texto novo') : t('Texto da cláusula')}
					<textarea required maxlength="2000" rows="6" bind:value={texto}></textarea>
				</label>
			{:else if modo === 'mover'}
				<label class="campo">
					{t('Para depois de')}
					<select bind:value={depois}>
						<option value="">{t('Para o começo')}</option>
						{#each vizinhas as c (c.id)}<option value={c.id}>{trecho(c.id)}</option>{/each}
					</select>
				</label>
			{/if}
			<label class="campo">
				{t('Por quê (opcional)')}
				<input maxlength="280" bind:value={motivo} />
			</label>
			{@render avisos()}
			<div class="acoes">
				<button class="botao">{t('Propor')}</button>
				<button class="botao botao--secundario" type="button" onclick={() => (alvoId ? irPara('ver') : (painelAberto = false))}>{alvoId ? t('Voltar') : t('Cancelar')}</button>
			</div>
		</form>
	{/if}
</Modal>
