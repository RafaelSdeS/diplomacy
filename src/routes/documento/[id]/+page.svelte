<script lang="ts">
	import { tick } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { caixa, mensagemDoEnvio } from '#lib/caixa.ts';
	import { formatarDocumento, nomeDoDocumento, STATUS_DOCUMENTO } from '#lib/formatacao.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import { sugerirVerbos } from '#lib/verbos.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const STATUS_CLAUSULA: Record<string, { rotulo: string; selo: string }> = {
		proposta: { rotulo: 'Proposta', selo: '' },
		em_discussao: { rotulo: 'Em discussão', selo: 'selo--info' },
		acordada: { rotulo: 'Acordada', selo: 'selo--ok' }
	};

	const d = $derived(data.documento);
	const eu = $derived(data.participacoes.find((p) => p.comite_id === d.comite_id && p.papel === 'delegado'));
	const souMembro = $derived(!!d.bloco?.membros.some((m) => m.delegacao?.id === eu?.delegacao_id));
	const ehMesa = $derived(
		data.participacoes.some((p) => (p.papel === 'mesa' && p.comite_id === d.comite_id) || p.papel === 'secretaria')
	);

	// Relógio para as rodadas.
	let agora = $state(Date.now());
	$effect(() => {
		const relogio = setInterval(() => (agora = Date.now()), 15_000);
		return () => clearInterval(relogio);
	});
	const rodadaAtual = $derived(data.rodadas.find((r) => Date.parse(r.fim) > agora));
	const rodadasAcabaram = $derived(
		data.rodadas.length >= d.max_rodadas && data.rodadas.every((r) => Date.parse(r.fim) <= agora)
	);
	const editavel = $derived(d.status === 'rascunho' && !rodadasAcabaram);

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
		...formatado.textos.map((t) => ({ id: t.id, rotulo: 'Texto' })),
		...formatado.preambulares.map((p) => ({ id: p.id, rotulo: 'Preambular' })),
		...formatado.operativas.flatMap((o) => [
			{ id: o.id, rotulo: `Operativa ${o.numero}` },
			...o.subitens.map((s) => ({ id: s.id, rotulo: `${o.numero}.${s.letra}` }))
		])
	]);
	const acordadas = $derived(data.clausulas.filter((c) => c.status === 'acordada').length);
	const minimoAssinaturas = $derived(d.tipo === 'working_paper' ? 0 : data.regras.assinaturas_projeto_min);
	const assinei = $derived(data.assinaturas.some((a) => a.id === eu?.delegacao_id));

	let selecionada = $state<string | null>(null);
	const clausula = $derived(selecionada ? porId.get(selecionada) : undefined);
	const rotulo = $derived(ordem.find((o) => o.id === selecionada)?.rotulo ?? '');
	const propostas = $derived(data.propostas.filter((p) => p.clausula_id === selecionada && p.status === 'aberta'));
	const comentarios = $derived(data.comentarios.filter((c) => c.clausula_id === selecionada));
	const pedidos = $derived(data.reaberturas.filter((r) => r.clausula_id === selecionada));

	let erro = $state('');
	let mensagem = $state('');
	let edicao = $state('');
	let versaoEditada = $state(0);
	let proposta = $state('');
	let comentario = $state('');
	let novoTipo = $state('operativa');
	let novoTexto = $state('');
	let novoPai = $state('');
	let minutos = $state(15);
	let aprovacao = $state('consenso');
	let paraTrazer = $state<string[]>([]);

	// O campo de edição acompanha a cláusula escolhida e a versão dela.
	$effect(() => {
		if (clausula && clausula.versao !== versaoEditada) {
			edicao = clausula.texto;
			versaoEditada = clausula.versao;
		}
	});
	const sugestoes = $derived(sugerirVerbos(novoTexto, novoTipo, data.comite.idioma));

	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, ok = '') {
		erro = mensagem = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		else mensagem = ok;
		await invalidate('app:documento');
		return !error;
	}

	async function escolher(id: string) {
		selecionada = id;
		versaoEditada = 0;
		await tick();
		// No celular a conversa fica abaixo da lista: rola até ela.
		document.getElementById('conversa')?.scrollIntoView({ block: 'start' });
	}

	// Os campos são limpos já no envio: quem digita a próxima cláusula enquanto a
	// anterior é gravada não perde o texto. Se der erro, o texto volta.
	async function enviarLimpando(campo: { ler: () => string; escrever: (v: string) => void }, acao: (texto: string) => PromiseLike<{ error: { code?: string; message?: string } | null }>, ok = '') {
		const texto = campo.ler();
		campo.escrever('');
		if (!(await executar(acao(texto), ok)) && !campo.ler()) campo.escrever(texto);
	}

	function adicionar(evento: SubmitEvent) {
		evento.preventDefault();
		const tipo = novoTipo;
		const pai = novoPai;
		void enviarLimpando({ ler: () => novoTexto, escrever: (v) => (novoTexto = v) }, (texto) =>
			supabase.rpc('adicionar_clausula', {
				p_documento: d.id,
				p_tipo: tipo,
				p_texto: texto,
				p_pai: tipo === 'subitem' ? pai : undefined
			})
		);
	}

	const ACOES_EMENDA: Record<string, string> = { acrescentar: 'Acrescenta', suprimir: 'Suprime', modificar: 'Modifica' };
	let emendaAcao = $state('acrescentar');
	let emendaClausula = $state('');
	let emendaTexto = $state('');
	async function proporEmenda(evento: SubmitEvent) {
		evento.preventDefault();
		const ok = await executar(
			supabase.rpc('propor_emenda', {
				p_documento: d.id,
				p_acao: emendaAcao,
				p_clausula: emendaAcao === 'acrescentar' ? (null as unknown as string) : emendaClausula,
				p_texto: emendaAcao === 'suprimir' ? (null as unknown as string) : emendaTexto
			}),
			'Emenda proposta. Ela precisa de mais assinaturas para ir a voto.'
		);
		if (ok) emendaTexto = '';
	}

	async function salvarTexto() {
		await executar(
			supabase.rpc('editar_clausula', { p_clausula: clausula!.id, p_texto: edicao, p_versao: versaoEditada }),
			'Texto salvo.'
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
			rotulo: 'Proposta de alteração'
		});
		({ erro, mensagem } = mensagemDoEnvio(resultado, 'Proposta enviada ao redator.'));
		if (erro && !proposta) proposta = texto;
		await invalidate('app:documento');
	}

	function comentar(evento: SubmitEvent) {
		evento.preventDefault();
		const id = clausula!.id;
		void enviarLimpando({ ler: () => comentario, escrever: (v) => (comentario = v) }, (texto) =>
			supabase.rpc('comentar', { p_clausula: id, p_texto: texto })
		);
	}

	async function trazer() {
		if (await executar(supabase.rpc('importar_clausulas', { p_documento: d.id, p_clausulas: paraTrazer }), 'Cláusulas trazidas.'))
			paraTrazer = [];
	}
</script>

<svelte:head>
	<title>{nomeDoDocumento(d)} · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">
	<a href={`/comite/${data.comite.sigla}/blocos`}>Comitê · {data.comite.sigla}</a> · Bloco {d.bloco?.nome}
	<AoVivo comiteId={d.comite_id} documentoId={d.id} dependencia="app:documento" />
</p>
<h1>{nomeDoDocumento(d)}</h1>
<p class="cabecalho-documento">
	<span class="selo {STATUS_DOCUMENTO[d.status].selo}">{STATUS_DOCUMENTO[d.status].rotulo}</span>
	{#if d.ponto_pauta}<span class="suave">Subtópico: {d.ponto_pauta.texto}</span>{/if}
	{#if d.aprovacao}<span class="suave">Aprovação por {d.aprovacao === 'consenso' ? 'consenso' : 'votação'}</span>{/if}
</p>

<div class="progresso">
	<label for="progresso">{acordadas} de {data.clausulas.length} acordadas</label>
	<progress id="progresso" max={Math.max(data.clausulas.length, 1)} value={acordadas}></progress>
</div>
<p class="suave" aria-live="polite">
	{#if rodadaAtual}
		Rodada {rodadaAtual.numero} de {d.max_rodadas} · termina às {new Date(rodadaAtual.fim).toLocaleTimeString('pt-BR', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'America/Sao_Paulo'
		})}
	{:else if rodadasAcabaram}
		As {d.max_rodadas} rodadas terminaram: o documento só pode ser enviado à mesa.
	{:else}
		{data.rodadas.length} de {d.max_rodadas} rodadas feitas.
	{/if}
</p>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

<div class="editor">
	<section class="cartao" aria-labelledby="t-clausulas">
		<h2 id="t-clausulas">Cláusulas</h2>
		<ol class="lista lista-clausulas">
			{#each ordem as item (item.id)}
				{@const c = porId.get(item.id)!}
				<li
					aria-current={item.id === selecionada ? 'true' : undefined}
					class:em-foco={item.id === d.clausula_em_foco_id}
					class:subitem={c.tipo === 'subitem'}
				>
					<button class="clausula" type="button" onclick={() => escolher(item.id)}>
						<span class="rotulo">{item.rotulo}</span>
						<span>{c.texto}</span>
						<span class="detalhe">
							<span class="selo {STATUS_CLAUSULA[c.status].selo}">{STATUS_CLAUSULA[c.status].rotulo}</span>
							{#if item.id === d.clausula_em_foco_id}<span class="selo selo--alerta">Em foco</span>{/if}
							{#if data.propostas.some((p) => p.clausula_id === item.id && p.status === 'aberta')}
								<span class="selo">Com proposta</span>
							{/if}
						</span>
					</button>
				</li>
			{:else}
				<li class="suave">Nenhuma cláusula ainda.</li>
			{/each}
		</ol>

		{#if data.souRedator && editavel}
			<form class="formulario formulario--largo" onsubmit={adicionar} aria-label="Nova cláusula">
				<label class="campo">
					Tipo da cláusula
					<select bind:value={novoTipo}>
						{#if d.tipo === 'working_paper'}<option value="texto">Texto livre (notícia, link, contexto)</option>{/if}
						<option value="preambular">Preambular</option>
						<option value="operativa">Operativa</option>
						{#if formatado.operativas.length}<option value="subitem">Subitem de uma operativa</option>{/if}
					</select>
				</label>
				{#if novoTipo === 'subitem'}
					<label class="campo">
						Operativa
						<select bind:value={novoPai} required>
							{#each formatado.operativas as o (o.id)}
								<option value={o.id}>{o.numero}. {o.texto.slice(0, 60)}</option>
							{/each}
						</select>
					</label>
				{/if}
				<label class="campo">
					Texto da cláusula
					<textarea required maxlength="2000" rows="3" bind:value={novoTexto}></textarea>
				</label>
				{#if sugestoes.length}
					<div class="acoes" role="group" aria-label="Verbos sugeridos">
						{#each sugestoes as verbo (verbo)}
							<button
								class="botao botao--secundario botao--pequeno"
								type="button"
								onclick={() => (novoTexto = `${verbo} ${novoTexto.trimStart().split(/\s+/).slice(1).join(' ')}`.trimEnd() + ' ')}
								>{verbo}</button
							>
						{/each}
					</div>
				{/if}
				<button class="botao">Acrescentar cláusula</button>
			</form>
		{/if}
	</section>

	<section class="cartao" id="conversa" aria-labelledby="t-conversa">
		<h2 id="t-conversa">{clausula ? rotulo : 'Conversa da cláusula'}</h2>
		{#if !clausula}
			<p class="suave">Escolha uma cláusula para ver a conversa, propor alterações e comentar.</p>
		{:else}
			<p class="detalhe">
				<span class="selo {STATUS_CLAUSULA[clausula.status].selo}">{STATUS_CLAUSULA[clausula.status].rotulo}</span>
				{#if clausula.origem_id}<span class="suave">Veio de um working paper</span>{/if}
			</p>

			{#if data.souRedator && editavel && clausula.status !== 'acordada'}
				<label class="campo">
					Texto
					<textarea rows="4" maxlength="2000" bind:value={edicao}></textarea>
				</label>
				<div class="acoes">
					<button class="botao" type="button" onclick={salvarTexto}>Salvar texto</button>
					{#if clausula.status === 'proposta'}
						<button
							class="botao botao--secundario"
							type="button"
							onclick={() => executar(supabase.rpc('marcar_clausula', { p_clausula: clausula.id, p_status: 'em_discussao' }))}
							>Pôr em discussão</button
						>
					{/if}
					<button
						class="botao botao--secundario"
						type="button"
						onclick={() => executar(supabase.rpc('marcar_clausula', { p_clausula: clausula.id, p_status: 'acordada' }))}
						>Marcar como acordada</button
					>
					<button
						class="botao botao--secundario"
						type="button"
						onclick={() => executar(supabase.rpc('focar_clausula', { p_documento: d.id, p_clausula: clausula.id }))}
						>Pôr em foco</button
					>
				</div>
				<div class="acoes">
					<button
						class="botao botao--secundario botao--pequeno"
						type="button"
						onclick={() => executar(supabase.rpc('mover_clausula', { p_clausula: clausula.id, p_para_cima: true }))}
						>Subir</button
					>
					<button
						class="botao botao--secundario botao--pequeno"
						type="button"
						onclick={() => executar(supabase.rpc('mover_clausula', { p_clausula: clausula.id, p_para_cima: false }))}
						>Descer</button
					>
					<button
						class="botao botao--secundario botao--pequeno"
						type="button"
						onclick={async () => {
							if (await executar(supabase.rpc('remover_clausula', { p_clausula: clausula.id }))) selecionada = null;
						}}>Remover</button
					>
				</div>
			{:else}
				<p class="texto-clausula">{clausula.texto}</p>
			{/if}

			{#if clausula.status === 'acordada' && souMembro && editavel}
				<p>
					Acordada e travada. Para reabrir, {data.regras.reabrir_clausula_min_delegacoes} delegações precisam pedir
					({pedidos.length} até agora).
				</p>
				<button
					class="botao botao--secundario"
					type="button"
					disabled={pedidos.some((p) => p.delegacao_id === eu?.delegacao_id)}
					onclick={() => executar(supabase.rpc('pedir_reabertura', { p_clausula: clausula.id }), 'Pedido de reabertura registrado.')}
					>Pedir reabertura</button
				>
			{/if}

			<h3>Propostas de alteração</h3>
			<ul class="lista">
				{#each propostas as p (p.id)}
					<li>
						<span>
							{p.texto_novo}
							<span class="detalhe">{p.delegacao?.nome}</span>
						</span>
						{#if data.souRedator && editavel}
							<span class="acoes">
								<button
									class="botao botao--pequeno"
									type="button"
									aria-label={`Aceitar a proposta de ${p.delegacao?.nome}`}
									onclick={() => executar(supabase.rpc('responder_proposta', { p_proposta: p.id, p_aceitar: true }), 'Proposta aceita.')}
									>Aceitar</button
								>
								<button
									class="botao botao--secundario botao--pequeno"
									type="button"
									aria-label={`Recusar a proposta de ${p.delegacao?.nome}`}
									onclick={() => executar(supabase.rpc('responder_proposta', { p_proposta: p.id, p_aceitar: false }))}
									>Recusar</button
								>
							</span>
						{/if}
					</li>
				{:else}
					<li class="suave">Nenhuma proposta aberta.</li>
				{/each}
			</ul>
			{#if souMembro && !data.souRedator && editavel && clausula.status !== 'acordada'}
				<form class="formulario" onsubmit={propor}>
					<label class="campo">
						Sua proposta de texto
						<textarea required maxlength="2000" rows="3" bind:value={proposta}></textarea>
					</label>
					<button class="botao">Propor alteração</button>
				</form>
			{/if}

			<h3>Comentários</h3>
			<ul class="lista">
				{#each comentarios.filter((c) => !c.estacionado) as c (c.id)}
					<li>
						<span>{c.texto}</span>
						{#if data.souRedator}
							<button
								class="botao botao--secundario botao--pequeno"
								type="button"
								aria-label={`Estacionar o comentário "${c.texto.slice(0, 30)}"`}
								onclick={() => executar(supabase.rpc('estacionar_comentario', { p_comentario: c.id, p_estacionado: true }))}
								>Estacionar</button
							>
						{/if}
					</li>
				{:else}
					<li class="suave">Nenhum comentário.</li>
				{/each}
			</ul>
			{#if comentarios.some((c) => c.estacionado)}
				<details>
					<summary>Estacionados ({comentarios.filter((c) => c.estacionado).length})</summary>
					<ul class="lista">
						{#each comentarios.filter((c) => c.estacionado) as c (c.id)}
							<li>{c.texto}</li>
						{/each}
					</ul>
				</details>
			{/if}
			{#if souMembro}
				<form class="formulario" onsubmit={comentar}>
					<label class="campo">
						Comentário
						<textarea required maxlength="1000" rows="2" bind:value={comentario}></textarea>
					</label>
					<button class="botao botao--secundario">Comentar</button>
				</form>
			{/if}
		{/if}
	</section>
</div>

<section aria-labelledby="t-andamento">
	<h2 id="t-andamento">Rodadas, assinaturas e envio</h2>
	{#if data.souRedator && editavel && !rodadaAtual && data.rodadas.length < d.max_rodadas}
		<div class="acoes">
			<label class="campo campo--curto">
				Minutos da rodada
				<input type="number" min="1" max="120" bind:value={minutos} />
			</label>
			<button
				class="botao botao--secundario"
				type="button"
				onclick={() => executar(supabase.rpc('abrir_rodada', { p_documento: d.id, p_minutos: minutos }), 'Rodada aberta.')}
				>Abrir a rodada {data.rodadas.length + 1}</button
			>
		</div>
	{/if}

	<p>
		Signatários ({data.assinaturas.length}{minimoAssinaturas ? ` de no mínimo ${minimoAssinaturas}` : ''}):
		{data.assinaturas.map((a) => a.nome).join(', ') || 'nenhum'}
	</p>
	{#if souMembro && d.status === 'rascunho'}
		<button
			class="botao botao--secundario"
			type="button"
			onclick={() => executar(supabase.rpc('assinar', { p_documento: d.id, p_assinar: !assinei }))}
		>
			{assinei ? 'Retirar a assinatura' : 'Assinar'}
		</button>
	{/if}

	{#if data.souRedator && d.status === 'rascunho'}
		<div class="acoes">
			{#if d.tipo !== 'working_paper'}
				<label class="campo">
					Aprovação
					<select bind:value={aprovacao}>
						<option value="consenso">Por consenso</option>
						<option value="votacao">Por votação</option>
					</select>
				</label>
			{/if}
			<button
				class="botao"
				type="button"
				onclick={() =>
					executar(
						supabase.rpc('enviar_documento', {
							p_documento: d.id,
							p_aprovacao: d.tipo === 'working_paper' ? undefined : aprovacao
						}),
						'Documento enviado à mesa.'
					)}>Enviar à mesa</button
			>
		</div>
	{/if}

	{#if ehMesa && d.status === 'enviado'}
		<div class="acoes">
			<button
				class="botao"
				type="button"
				onclick={() => executar(supabase.rpc('aprovar_documento', { p_documento: d.id, p_aprovar: true }), 'Documento aprovado.')}
				>Aprovar</button
			>
			<button
				class="botao botao--secundario"
				type="button"
				onclick={() => executar(supabase.rpc('aprovar_documento', { p_documento: d.id, p_aprovar: false }), 'Documento devolvido ao bloco.')}
				>Devolver ao bloco</button
			>
		</div>
	{/if}
</section>

{#if data.souRedator && editavel && d.tipo !== 'working_paper' && data.workingPapers.length}
	<section aria-labelledby="t-fusao">
		<h2 id="t-fusao">Trazer cláusulas de working papers</h2>
		<div class="propostas">
			{#each data.workingPapers as wp (wp.id)}
				<fieldset class="cartao opcoes">
					<legend>{nomeDoDocumento(wp)}</legend>
					{#each wp.clausulas as c (c.id)}
						<label class="opcao"><input type="checkbox" value={c.id} bind:group={paraTrazer} /> {c.texto}</label>
					{/each}
				</fieldset>
			{/each}
		</div>
		<button class="botao botao--secundario" type="button" disabled={!paraTrazer.length} onclick={trazer}>
			Trazer {paraTrazer.length || ''} cláusulas para este documento
		</button>
	</section>
{/if}

{#if d.tipo !== 'working_paper' && (d.status === 'aprovado_mesa' || data.emendas.length)}
	<section class="cartao" aria-labelledby="t-emendas">
		<h2 id="t-emendas">Emendas</h2>
		<p class="suave">
			Cada emenda acrescenta, suprime ou modifica uma parte do projeto e precisa de {data.regras.assinaturas_emenda}
			signatários para ir a voto. Aprovada, entra no projeto.
		</p>
		<ul class="lista">
			{#each data.emendas as e (e.id)}
				{@const assinou = e.assinaturas.some((a) => a.delegacao_id === eu?.delegacao_id)}
				<li>
					<span>
						{ACOES_EMENDA[e.acao]}{e.clausula_id ? `: "${data.clausulas.find((c) => c.id === e.clausula_id)?.texto ?? 'cláusula removida'}"` : ''}{e.texto
							? ` → "${e.texto}"`
							: ''}
						<span class="detalhe">
							{e.delegacao?.nome} · {e.assinaturas.length} de {data.regras.assinaturas_emenda} assinaturas
							{#if e.status !== 'proposta'}· <span class="selo {e.status === 'aprovada' ? 'selo--ok' : 'selo--erro'}">{e.status === 'aprovada' ? 'Aprovada' : 'Rejeitada'}</span>{/if}
						</span>
					</span>
					{#if eu && e.status === 'proposta' && !assinou}
						<button
							class="botao botao--secundario botao--pequeno"
							type="button"
							aria-label={`Assinar a emenda de ${e.delegacao?.nome}`}
							onclick={() => executar(supabase.rpc('assinar_emenda', { p_emenda: e.id }), 'Emenda assinada.')}>Assinar</button
						>
					{/if}
				</li>
			{:else}
				<li class="suave">Nenhuma emenda ainda.</li>
			{/each}
		</ul>
		{#if eu && d.status === 'aprovado_mesa'}
			<form class="formulario" aria-label="Nova emenda" onsubmit={proporEmenda}>
				<label class="campo">
					A emenda
					<select bind:value={emendaAcao}>
						<option value="acrescentar">Acrescenta uma operativa</option>
						<option value="modificar">Modifica uma cláusula</option>
						<option value="suprimir">Suprime uma cláusula</option>
					</select>
				</label>
				{#if emendaAcao !== 'acrescentar'}
					<label class="campo">
						Cláusula
						<select required bind:value={emendaClausula}>
							{#each data.clausulas.filter((c) => c.tipo !== 'texto') as c (c.id)}<option value={c.id}>{c.texto}</option>{/each}
						</select>
					</label>
				{/if}
				{#if emendaAcao !== 'suprimir'}
					<label class="campo">
						Texto da emenda
						<textarea required rows="3" maxlength="2000" bind:value={emendaTexto}></textarea>
					</label>
				{/if}
				<button class="botao botao--secundario">Propor emenda</button>
			</form>
		{/if}
	</section>
{/if}

<details class="documento-pronto">
	<summary>Ver como documento</summary>
	<article class="cartao folha" aria-label="Documento formatado">
		<p class="rotulo">{data.comite.sigla}</p>
		<h2>{d.titulo}</h2>
		{#each formatado.textos as t (t.id)}<p>{t.texto}</p>{/each}
		{#each formatado.preambulares as p (p.id)}<p class="preambular">{p.texto}</p>{/each}
		<p class="linha-do-comite">{formatado.linhaDoComite}</p>
		{#each formatado.operativas as o (o.id)}
			<p class="operativa">{o.numero}. {o.texto}</p>
			{#each o.subitens as s (s.id)}<p class="subitem-doc">{s.letra}) {s.texto}</p>{/each}
		{/each}
		{#if formatado.signatarios}<p class="signatarios">{formatado.signatarios}</p>{/if}
	</article>
	<p><a href={`/imprimir/documento/${d.id}`}>Imprimir ou salvar como PDF</a></p>
</details>
