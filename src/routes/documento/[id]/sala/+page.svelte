<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { goto, invalidate } from '$app/navigation';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import { formatarDocumento } from '#lib/formatacao.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Confirmar from '#lib/ui/Confirmar.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import NomeDelegacao from '#lib/ui/NomeDelegacao.svelte';
	import ListPlus from '@lucide/svelte/icons/list-plus';
	import PencilLine from '@lucide/svelte/icons/pencil-line';
	import type { PageProps } from './$types';

	// Passo 63: o documento da sala. No working paper de cada item da agenda, os redatores dos
	// blocos (ou a delegação sem bloco) propõem; todas as delegações marcam posição num toque; quem
	// preside a sessão aceita ou rejeita depois do debate, como na agenda. A mesa transforma os
	// working papers em projeto, que nasce fechado (só correções de forma) e vai à fase de ação.
	let { data }: PageProps = $props();

	type Proposta = (typeof data.propostas)[number];
	type Clausula = (typeof data.clausulas)[number];
	type Posicao = 'apoio' | 'ressalva' | 'contra';
	type Acao = 'alterar' | 'incluir' | 'retirar' | 'mover';
	const POSICOES: Record<Posicao, string> = { apoio: t('Apoio'), ressalva: t('Ressalva'), contra: t('Contra') };
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
	const projeto = $derived(data.irmaos.find((x) => x.tipo === 'projeto'));

	const formatado = $derived(formatarDocumento(data.clausulas, data.comite, data.assinaturas.map((a) => a.nome_oficial)));
	const trecho = (id: string | null) => {
		const c = data.clausulas.find((x) => x.id === id);
		return !c ? t('(cláusula retirada)') : c.texto.length > 60 ? `${c.texto.slice(0, 60)}…` : c.texto;
	};

	// As propostas: abertas ao lado da cláusula; as decididas no histórico.
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
	const daClausula = (id: string) => visiveis.filter((p) => (p.acao === 'incluir' ? p.depois_de : p.clausula_id) === id);
	const novasNoFim = $derived(visiveis.filter((p) => p.acao === 'incluir' && !p.depois_de));
	const FILTROS = $derived([
		{ valor: 'todas', nome: t('Todas'), n: abertas.length },
		{ valor: 'consenso', nome: t('Com consenso'), n: abertas.filter(consenso).length },
		{ valor: 'debate', nome: t('Em debate'), n: abertas.filter((p) => !consenso(p)).length }
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

	// Propor: numa cláusula (mudar, incluir depois, mover, retirar) ou uma cláusula nova no fim.
	let modalPropor = $state<Modal>();
	let alvo = $state<Clausula | null>(null);
	let acao = $state<Acao>('incluir');
	let texto = $state('');
	let tipo = $state<'preambular' | 'operativa'>('operativa');
	let depois = $state('');
	let motivo = $state('');
	function proporEm(c: Clausula | null, tipoNovo: 'preambular' | 'operativa' = 'operativa') {
		alvo = c;
		acao = c ? 'alterar' : 'incluir';
		texto = c?.texto ?? '';
		tipo = c?.tipo === 'preambular' ? 'preambular' : tipoNovo;
		depois = '';
		motivo = '';
		erro = '';
		modalPropor?.abrir();
	}
	async function propor(evento: SubmitEvent) {
		evento.preventDefault();
		const ok = await executar(
			supabase.rpc('propor_no_documento', {
				p_documento: d.id,
				p_acao: acao,
				p_clausula: acao === 'incluir' ? undefined : alvo?.id,
				p_texto: acao === 'alterar' || acao === 'incluir' ? texto : undefined,
				p_tipo: acao === 'incluir' ? tipo : undefined,
				p_depois: acao === 'incluir' ? alvo?.id : acao === 'mover' ? depois || undefined : undefined,
				p_motivo: motivo || undefined
			}),
			t('Proposta feita. A sala debate e marca a posição; quem preside decide.')
		);
		if (ok) modalPropor?.fechar();
	}
	const vizinhas = $derived(
		alvo ? data.clausulas.filter((c) => c.id !== alvo!.id && c.tipo === alvo!.tipo && c.pai_id === alvo!.pai_id) : []
	);

	// A mesa faz as correções de forma no projeto.
	let modalCorrigir = $state<Modal>();
	let corrigindo = $state<Clausula | null>(null);
	let correcao = $state('');
	function corrigir(c: Clausula) {
		corrigindo = c;
		correcao = c.texto;
		erro = '';
		modalCorrigir?.abrir();
	}
	async function salvarCorrecao(evento: SubmitEvent) {
		evento.preventDefault();
		if (!corrigindo) return;
		const ok = await executar(
			supabase.rpc('corrigir_clausula', { p_clausula: corrigindo.id, p_texto: correcao, p_versao: corrigindo.versao }),
			t('Correção salva.')
		);
		if (ok) modalCorrigir?.fechar();
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
							onclick={() => marcar(p, x as Posicao)}>{nome}</button
						>
					{/each}
				</span>
			{/if}
			{#if decido}
				<span class="acoes" role="group" aria-label={t('Decidir: {proposta}', { proposta: descrever(p) })}>
					{#if consenso(p)}
						<button class="botao botao--pequeno" type="button" onclick={() => decidir(p, true)}>{t('Aceitar')}</button>
					{:else}
						<Confirmar
							classe="botao botao--pequeno"
							rotulo={t('Aceitar')}
							pergunta={t('Aceitar sem o sinal de consenso?')}
							explicacao={t('Há delegação contra, ou o apoio não chega à metade. O consenso se forma no debate: aceite se a sala chegou a ele.')}
							acao={() => decidir(p, true)}
						/>
					{/if}
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => decidir(p, false)}>{t('Rejeitar')}</button>
				</span>
			{/if}
		</span>
	</li>
{/snippet}

{#snippet bloco(id: string, textoFormatado: string, numero = '')}
	{@const c = data.clausulas.find((x) => x.id === id)}
	{@const propostas = daClausula(id)}
	<div class={['clausula-sala', d.clausula_em_foco_id === id && 'clausula-sala--foco']}>
		<p class="clausula-sala-texto">
			{#if numero}<span class="numero">{numero}</span>{/if}
			{textoFormatado}
			{#if d.clausula_em_foco_id === id}<span class="selo selo--info">{t('em foco')}</span>{/if}
		</p>
		{#if c && (possoPropor || possoFocar || corrijo)}
			<p class="acoes">
				{#if possoPropor}
					<button
						class="botao botao--secundario botao--pequeno botao--icone"
						type="button"
						aria-label={t('Propor uma mudança em "{trecho}"', { trecho: trecho(id) })}
						title={t('Propor uma mudança nesta cláusula')}
						onclick={() => proporEm(c)}><PencilLine aria-hidden="true" size={14} strokeWidth={1.75} /></button
					>
				{/if}
				{#if possoFocar && d.clausula_em_foco_id !== id}
					<button
						class="botao botao--secundario botao--pequeno"
						type="button"
						title={t('A sala e o telão passam a debater esta cláusula.')}
						onclick={() => executar(supabase.rpc('focar_clausula', { p_documento: d.id, p_clausula: id }))}>{t('Pôr em foco')}</button
					>
				{/if}
				{#if corrijo}
					<button class="botao botao--secundario botao--pequeno" type="button" title={t('Só correções de forma: gramática e digitação.')} onclick={() => corrigir(c)}
						>{t('Corrigir')}</button
					>
				{/if}
			</p>
		{/if}
		{#if propostas.length}
			<ul class="lista propostas-sala" aria-label={t('Propostas para esta cláusula')}>
				{#each propostas as p (p.id)}{@render proposta(p)}{/each}
			</ul>
		{/if}
	</div>
{/snippet}

<svelte:head>
	<title>{tituloDaAba(ehWp ? d.titulo : t('Projeto de resolução'), sigla)}</title>
</svelte:head>

<p class="rotulo">
	{t('Comitê')} · {sigla}{d.topico ? ` · ${t('Tópico {n}', { n: d.topico })}` : ''}
	<AoVivo comiteId={d.comite_id} documentoId={d.id} dependencia="app:sala" />
</p>
<h1>{ehWp ? d.titulo : t('Projeto de resolução')}</h1>

{#if data.irmaos.length > 1}
	<nav class="abas-topicos" aria-label={t('Documentos do tópico')}>
		{#each data.irmaos as x (x.id)}
			<a class={['botao botao--pequeno', x.id !== d.id && 'botao--secundario']} href={`/documento/${x.id}/sala`} aria-current={x.id === d.id ? 'page' : undefined}
				>{x.tipo === 'projeto' ? t('Projeto') : x.titulo}</a
			>
		{/each}
	</nav>
{/if}

<p class="suave">{situacao}</p>
{#if ehWp && !aberto && projeto}<p><a class="botao botao--pequeno" href={`/documento/${projeto.id}/sala`}>{t('Abrir o projeto do tópico')}</a></p>{/if}
{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
{#if mensagem}<p class="sucesso" role="status">{mensagem}</p>{/if}

<div class="acoes">
	{#if possoPropor}
		<button class="botao" type="button" onclick={() => proporEm(null)}><ListPlus aria-hidden="true" size={18} strokeWidth={1.75} /> {t('Propor uma cláusula nova')}</button>
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
			<button class="botao" type="button" disabled title={t('Faltam assinaturas: {n} de {min}.', { n: assinaturasQueContam, min: minimo })}
				>{t('Levar à fase de ação')}</button
			>
			<span class="suave">{t('Faltam assinaturas: {n} de {min}.', { n: assinaturasQueContam, min: minimo })}</span>
		{/if}
	{/if}
</div>

{#if abertas.length}
	<div class="acoes" role="group" aria-label={t('Mostrar as propostas')}>
		{#each FILTROS as f (f.valor)}
			<button class={['botao botao--pequeno', filtro !== f.valor && 'botao--secundario']} type="button" aria-pressed={filtro === f.valor} onclick={() => (filtro = f.valor)}
				>{f.nome} <span class="selo">{f.n}</span></button
			>
		{/each}
	</div>
{/if}

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
		<section aria-labelledby="t-novas">
			<h2 id="t-novas">{t('Cláusulas novas propostas')}</h2>
			<ul class="lista propostas-sala">
				{#each novasNoFim as p (p.id)}{@render proposta(p)}{/each}
			</ul>
		</section>
	{/if}
	{#if formatado.signatarios}<p class="signatarios">{formatado.signatarios}</p>{/if}
</article>

<section class="cartao" aria-labelledby="t-assinaturas">
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
	{#if possoAssinar}
		<button
			class={['botao botao--pequeno', assinei && 'botao--secundario']}
			type="button"
			onclick={() =>
				executar(supabase.rpc('assinar', { p_documento: d.id, p_assinar: !assinei }), assinei ? t('Assinatura retirada.') : t('Documento assinado.'))}
			>{assinei ? t('Retirar a assinatura') : t('Assinar')}</button
		>
	{/if}
</section>

<p><a class="botao botao--secundario botao--pequeno" href={`/imprimir/documento/${d.id}`}>{t('Imprimir ou salvar como PDF')}</a></p>

{#if decididas.length}
	<details class="cartao">
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

<Modal bind:this={modalPropor} rotulo="propor-titulo" classe="modal-acao">
	<form class="formulario" onsubmit={propor}>
		<h3 id="propor-titulo">{alvo ? t('Proposta em "{trecho}"', { trecho: trecho(alvo.id) }) : t('Propor uma cláusula nova')}</h3>
		{#if data.meuBloco}<p class="suave">{t('Em nome do bloco {nome}.', { nome: data.meuBloco.bloco?.nome ?? '' })}</p>{/if}
		{#if alvo}
			<fieldset class="opcoes">
				<legend>{t('O que mudar')}</legend>
				<label class="opcao"><input type="radio" value="alterar" bind:group={acao} /> {t('Mudar o texto')}</label>
				<label class="opcao"><input type="radio" value="incluir" bind:group={acao} /> {t('Incluir uma cláusula depois desta')}</label>
				<label class="opcao"><input type="radio" value="mover" bind:group={acao} /> {t('Mudar de lugar')}</label>
				<label class="opcao"><input type="radio" value="retirar" bind:group={acao} /> {t('Retirar do texto')}</label>
			</fieldset>
		{/if}
		{#if acao === 'incluir'}
			<fieldset class="opcoes">
				<legend>{t('Tipo da cláusula nova')}</legend>
				<label class="opcao"><input type="radio" value="preambular" bind:group={tipo} /> {TIPO.preambular}</label>
				<label class="opcao"><input type="radio" value="operativa" bind:group={tipo} /> {TIPO.operativa}</label>
			</fieldset>
		{/if}
		{#if acao === 'alterar' || acao === 'incluir'}
			<label class="campo">
				{acao === 'alterar' ? t('Texto novo') : t('Texto da cláusula')}
				<textarea required maxlength="2000" rows="4" bind:value={texto}></textarea>
			</label>
		{:else if acao === 'mover'}
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
		{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
		<div class="acoes">
			<button class="botao">{t('Propor')}</button>
			<button class="botao botao--secundario" type="button" onclick={() => modalPropor?.fechar()}>{t('Cancelar')}</button>
		</div>
	</form>
</Modal>

<Modal bind:this={modalCorrigir} rotulo="corrigir-titulo" classe="modal-acao">
	<form class="formulario" onsubmit={salvarCorrecao}>
		<h3 id="corrigir-titulo">{t('Correção de forma')}</h3>
		<p class="suave">{t('Só gramática e digitação: o conteúdo do projeto não muda.')}</p>
		<label class="campo">
			{t('Texto')}
			<textarea required maxlength="2000" rows="4" bind:value={correcao}></textarea>
		</label>
		{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
		<div class="acoes">
			<button class="botao">{t('Salvar a correção')}</button>
			<button class="botao botao--secundario" type="button" onclick={() => modalCorrigir?.fechar()}>{t('Cancelar')}</button>
		</div>
	</form>
</Modal>
