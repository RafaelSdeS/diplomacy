<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { contador } from '#lib/contador.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { goto, invalidate } from '$app/navigation';
	import { nomeDoDocumento, STATUS_DOCUMENTO, TIPOS_DOCUMENTO } from '#lib/formatacao.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import { TABELAS_BLOCOS } from '#lib/tempo-real.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import NomeDelegacao from '#lib/ui/NomeDelegacao.svelte';
	import AcaoEmModal from '#lib/ui/AcaoEmModal.svelte';
	import Escolha from '#lib/ui/Escolha.svelte';
	import Users from '@lucide/svelte/icons/users';
	import Modal from '#lib/ui/Modal.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let novoBloco = $state<AcaoEmModal>();
	// Passo 51: trocar o redator. Quem entra vem antes de quem sai (o bloco precisa de um redator).
	type Bloco = (typeof data.blocos)[number];
	const redatoresDe = (b: Bloco) => b.membros.filter((m) => m.redator && m.delegacao).map((m) => m.delegacao!.id);
	const souRedator = (b: Bloco) => !!eu?.delegacao_id && redatoresDe(b).includes(eu.delegacao_id);
	let redatores = $state<Record<string, string[]>>({});
	async function salvarRedatores(b: Bloco) {
		const novos = redatores[b.id];
		if (!novos) return;
		const antes = redatoresDe(b);
		for (const id of novos.filter((x) => !antes.includes(x)))
			if (!(await executar(supabase.rpc('definir_redator', { p_bloco: b.id, p_delegacao: id, p_redator: true })))) break;
		for (const id of antes.filter((x) => !novos.includes(x)))
			if (!(await executar(supabase.rpc('definir_redator', { p_bloco: b.id, p_delegacao: id, p_redator: false })))) break;
		delete redatores[b.id];
	}
	// Passo 51 (lote dos blocos): o redator passa a redação a outro membro e deixa de ser redator.
	let passando = $state<Bloco | null>(null);
	let para = $state('');
	async function passarRedacao() {
		if (!passando || !para || !eu?.delegacao_id) return;
		const b = passando;
		if (
			(await executar(supabase.rpc('definir_redator', { p_bloco: b.id, p_delegacao: para, p_redator: true }))) &&
			(await executar(supabase.rpc('definir_redator', { p_bloco: b.id, p_delegacao: eu.delegacao_id, p_redator: false })))
		)
			passando = null;
	}

	const eu = $derived(data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado'));
	const souDo = (bloco: (typeof data.blocos)[number]) => bloco.membros.some((m) => m.delegacao?.id === eu?.delegacao_id);
	const meuBloco = $derived(data.blocos.find(souDo)); // um bloco por vez (passo 62)
	const meusBlocos = $derived(new Set(data.blocos.filter(souDo).map((b) => b.id)));
	const outrosDocumentos = $derived(data.documentos.filter((d) => !d.bloco_id || !meusBlocos.has(d.bloco_id)));
	const observadora = $derived(
		data.blocos.flatMap((b) => b.membros).find((m) => m.delegacao?.id === eu?.delegacao_id)?.delegacao?.situacao ===
			'observadora'
	);

	let nomeBloco = $state('');
	let erro = $state('');
	// Formulário de novo documento (um por vez, no bloco escolhido).
	let novoEm = $state<string | null>(null);
	let tipo = $state('working_paper');
	let titulo = $state('');
	let topico = $state(1);
	let subtopico = $state('');
	let atualizacao = $state('');
	// Passo 56: working paper e projeto só em tópico com a agenda adotada; o working paper é
	// sobre um item da agenda (o primeiro vem escolhido).
	const precisaAgenda = $derived(tipo === 'projeto' || tipo === 'working_paper');
	const itens = $derived(data.subtopicos.filter((s) => s.topico === topico));
	$effect(() => {
		if (precisaAgenda && !data.topicosAdotados.includes(topico) && data.topicosAdotados.length)
			topico = data.topicosAdotados[0];
	});
	$effect(() => {
		if (!itens.some((s) => s.id === subtopico)) subtopico = itens[0]?.id ?? '';
	});

	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>) {
		erro = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		await invalidate('app:blocos');
		return !error;
	}

	async function criarBloco(evento: SubmitEvent) {
		evento.preventDefault();
		if (await executar(supabase.rpc('criar_bloco', { p_comite: data.comite.id, p_nome: nomeBloco }))) {
			nomeBloco = '';
			novoBloco?.fechar();
		}
	}

	async function criarDocumento(evento: SubmitEvent) {
		evento.preventDefault();
		erro = '';
		const { data: id, error } = await supabase.rpc('criar_documento', {
			p_bloco: novoEm!,
			p_tipo: tipo,
			p_titulo: titulo,
			p_topico: topico,
			p_ponto_pauta: subtopico || undefined,
			p_atualizacao: tipo === 'resolucao_crise' && atualizacao ? atualizacao : undefined
		});
		if (error) {
			erro = mensagemDeErro(error);
			return;
		}
		await goto(`/documento/${id}`);
	}
</script>

<svelte:head>
	<title>{tituloDaAba(t('Blocos'), data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">
	{t('Comitê')} · {data.comite.sigla}
	<AoVivo comiteId={data.comite.id} tabelas={TABELAS_BLOCOS} dependencia="app:blocos" />
</p>
<h1>{t('Blocos e documentos')}</h1>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}

<section aria-labelledby="t-blocos">
	<h2 id="t-blocos">{t('Blocos')}</h2>
	{#if eu}
		<div class="acoes">
			<AcaoEmModal bind:this={novoBloco} rotulo={t('Novo bloco')} icone={Users} descricao={t('Um grupo de delegações que escreve documentos juntas. Quem cria é o redator.')}>
				<form class="formulario" onsubmit={criarBloco} aria-label={t('Novo bloco')}>
					<label class="campo">
						{t('Nome do novo bloco')}
						<input required maxlength="80" bind:value={nomeBloco} placeholder={t('Aliança dos Estados do Sahel')} />
					</label>
					{#if meuBloco}<p class="suave">{t('Sua delegação sai do bloco {nome}: cada delegação fica num bloco por vez.', { nome: meuBloco.nome })}</p>{/if}
					{#if erro}<p class="erro">{erro}</p>{/if}
					<div class="acoes">
						<button class="botao">{t('Criar bloco')}</button>
						<button class="botao botao--secundario" type="button" onclick={() => novoBloco?.fechar()}>{t('Cancelar')}</button>
					</div>
				</form>
			</AcaoEmModal>
		</div>
	{/if}
	<div class="propostas">
		{#each data.blocos as bloco (bloco.id)}
			{@const membro = souDo(bloco)}
			<article class="cartao" aria-label={`Bloco ${bloco.nome}`}>
				<h3>{bloco.nome}</h3>
				<ul class="lista">
					{#each bloco.membros as m (m.delegacao?.id)}
						<li>
							<NomeDelegacao sigla={data.comite.sigla} delegacao={m.delegacao} />
							{#if m.redator}<span class="selo selo--info">{t('Redator')}</span>{/if}
						</li>
					{/each}
				</ul>
				<!-- Passo 51: o redator passa ou divide a redação (definir_redator, passo 09). -->
				{#if souRedator(bloco)}
					<Escolha
						rotulo={t('Redatores')}
						botao={t('Mudar')}
						opcoes={bloco.membros.flatMap((m) => (m.delegacao ? [{ id: m.delegacao.id, nome: m.delegacao.nome, bandeira: m.delegacao.bandeira }] : []))}
						bind:escolhidos={() => redatores[bloco.id] ?? redatoresDe(bloco), (v) => (redatores[bloco.id] = v)}
						onpronto={() => salvarRedatores(bloco)}
					/>
					{#if bloco.membros.length > 1}
						<button
							class="botao botao--secundario botao--pequeno"
							type="button"
							onclick={() => {
								erro = '';
								para = '';
								passando = bloco;
							}}>{t('Passar a redação')}</button
						>
					{/if}
				{/if}
				{#each data.documentos.filter((d) => d.bloco_id === bloco.id) as d (d.id)}
					<p>
						<a href={`/documento/${d.id}`}>{nomeDoDocumento(d)}</a>
						<span class="selo {STATUS_DOCUMENTO[d.status].selo}">{STATUS_DOCUMENTO[d.status].rotulo}</span>
						<!-- Passo 57: a contagem das assinaturas, como na faixa do documento. -->
						<span class="detalhe">{(d.assinaturas[0]?.count ?? 0) === 1 ? t('1 assinatura') : t('{n} assinaturas', { n: d.assinaturas[0]?.count ?? 0 })}</span>
					</p>
				{/each}
				{#if eu}
					<div class="acoes">
						{#if membro}
							<button class="botao botao--pequeno" type="button" onclick={() => (novoEm = bloco.id)}>{t('Novo documento')}</button>
							<!-- Passo 62: o bloco nunca fica sem redator (o banco passa a redação a quem está há mais tempo). -->
							{@const unicoRedator = souRedator(bloco) && redatoresDe(bloco).length === 1 && bloco.membros.length > 1}
							<button
								class="botao botao--secundario botao--pequeno"
								type="button"
								title={unicoRedator
									? t('Sua delegação deixa o bloco. A redação passa à delegação que está no bloco há mais tempo.')
									: t('Sua delegação deixa o bloco e os documentos dele.')}
								onclick={() => executar(supabase.rpc('sair_bloco', { p_bloco: bloco.id }))}>{t('Sair do bloco')}</button
							>
						{:else}
							<button
								class="botao botao--pequeno"
								type="button"
								aria-label={`Entrar no bloco ${bloco.nome}`}
								title={meuBloco ? t('Sua delegação sai do bloco {nome}: cada delegação fica num bloco por vez.', { nome: meuBloco.nome }) : undefined}
								onclick={() => executar(supabase.rpc('entrar_bloco', { p_bloco: bloco.id }))}>{t('Entrar no bloco')}</button
							>
						{/if}
					</div>
				{/if}
			</article>
		{:else}
			<p class="suave">
				{eu
					? t('Ainda não há blocos. Um bloco reúne delegações que escrevem documentos juntas: crie um em "Novo bloco" ou espere um convite.')
					: t('Ainda não há blocos.')}
			</p>
		{/each}
	</div>

	<Modal aberto={!!passando} rotulo="t-passar" classe="modal-acao" onclose={() => (passando = null)}>
		{#if passando}
			<h3 id="t-passar">{t('Passar a redação')} · {passando.nome}</h3>
			<p class="suave">{t('A delegação escolhida passa a redigir os documentos do bloco, e a sua deixa de ser redatora.')}</p>
			<fieldset class="opcoes">
				<legend>{t('Para quem')}</legend>
				{#each passando.membros.filter((m) => m.delegacao && m.delegacao.id !== eu?.delegacao_id) as m (m.delegacao!.id)}
					<label class="opcao"
						><input type="radio" name="para" value={m.delegacao!.id} bind:group={para} />
						<span class="com-bandeira"><Bandeira codigo={m.delegacao!.bandeira} /> {m.delegacao!.nome}</span></label
					>
				{/each}
			</fieldset>
			{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
			<div class="acoes">
				<button class="botao" type="button" disabled={!para} onclick={passarRedacao}>{t('Confirmar: passar a redação')}</button>
				<button class="botao botao--secundario" type="button" onclick={() => (passando = null)}>{t('Cancelar')}</button>
			</div>
		{/if}
	</Modal>

	<!-- Passo 51: o novo documento abre num modal no centro, a partir do bloco. -->
	<Modal aberto={!!novoEm} rotulo="novo-documento-titulo" classe="modal-acao" onclose={() => (novoEm = null)}>
		<form class="formulario" onsubmit={criarDocumento} aria-label={t('Novo documento')}>
			<h3 id="novo-documento-titulo">{t('Novo documento')} · {data.blocos.find((b) => b.id === novoEm)?.nome}</h3>
			<label class="campo">
				{t('Tipo')}
				<select bind:value={tipo}>
					<option value="working_paper">{TIPOS_DOCUMENTO.working_paper}</option>
					{#if !observadora}
						<option value="projeto">{TIPOS_DOCUMENTO.projeto}</option>
						{#if data.atualizacoes.length}
							<option value="resolucao_crise">{TIPOS_DOCUMENTO.resolucao_crise}</option>
						{/if}
					{/if}
				</select>
			</label>
			<label class="campo">
				{t('Título')}
				<input required maxlength="200" bind:value={titulo} {@attach contador(titulo)} />
			</label>
			<label class="campo">
				{t('Tópico')}
				<select bind:value={topico}>
					{#each data.comite.topicos as tp, i (tp)}
						{@const semAgenda = precisaAgenda && !data.topicosAdotados.includes(i + 1)}
						<option value={i + 1} disabled={semAgenda}>{i + 1}. {tp}{semAgenda ? ` · ${t('agenda ainda não adotada')}` : ''}</option>
					{/each}
				</select>
			</label>
			{#if precisaAgenda && !data.topicosAdotados.length}
				<p class="suave" role="note">
					{t('Primeiro a agenda: quando a mesa adotar a agenda de um tópico, os blocos escrevem working papers sobre os itens dela, e depois o projeto de resolução.')}
				</p>
			{/if}
			{#if tipo === 'working_paper' && itens.length}
				<label class="campo">
					{t('Item da agenda')}
					<select bind:value={subtopico} required>
						{#each itens as s (s.id)}
							<option value={s.id}>{s.texto}</option>
						{/each}
					</select>
				</label>
			{/if}
			{#if tipo === 'resolucao_crise'}
				<label class="campo">
					{t('Atualização de crise')}
					<select bind:value={atualizacao} required>
						{#each data.atualizacoes as a (a.id)}
							<option value={a.id}>{a.texto.slice(0, 80)}</option>
						{/each}
					</select>
				</label>
			{/if}
			<div class="acoes">
				<button class="botao" disabled={precisaAgenda && !data.topicosAdotados.length}>{t('Criar e abrir')}</button>
				<button class="botao botao--secundario" type="button" onclick={() => (novoEm = null)}>{t('Cancelar')}</button>
			</div>
		</form>
	</Modal>

</section>

<section aria-labelledby="t-documentos">
	<h2 id="t-documentos">{t('Documentos do comitê')}</h2>
	<ul class="lista">
		{#each outrosDocumentos as d (d.id)}
			<li>
				<a href={`/documento/${d.id}`}>{nomeDoDocumento(d)}</a>
				<span class="selo {STATUS_DOCUMENTO[d.status].selo}">{STATUS_DOCUMENTO[d.status].rotulo}</span>
			</li>
		{:else}
			<li class="suave">{t('Nenhum documento aprovado pela mesa ainda.')}</li>
		{/each}
	</ul>
</section>
