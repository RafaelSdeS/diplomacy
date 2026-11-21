<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { goto, invalidate } from '$app/navigation';
	import { nomeDoDocumento, STATUS_DOCUMENTO, TIPOS_DOCUMENTO } from '#lib/formatacao.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import { TABELAS_BLOCOS } from '#lib/tempo-real.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const eu = $derived(data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado'));
	const souDo = (bloco: (typeof data.blocos)[number]) => bloco.membros.some((m) => m.delegacao?.id === eu?.delegacao_id);
	const meusBlocos = $derived(new Set(data.blocos.filter(souDo).map((b) => b.id)));
	const outrosDocumentos = $derived(data.documentos.filter((d) => !meusBlocos.has(d.bloco_id)));
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
	// Projeto de resolução: se o tópico escolhido não tem agenda adotada, vai para um que tem.
	$effect(() => {
		if (tipo === 'projeto' && !data.topicosAdotados.includes(topico) && data.topicosAdotados.length)
			topico = data.topicosAdotados[0];
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
		if (await executar(supabase.rpc('criar_bloco', { p_comite: data.comite.id, p_nome: nomeBloco }))) nomeBloco = '';
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
	<div class="propostas">
		{#each data.blocos as bloco (bloco.id)}
			{@const membro = souDo(bloco)}
			<article class="cartao" aria-label={`Bloco ${bloco.nome}`}>
				<h3>{bloco.nome}</h3>
				<ul class="lista">
					{#each bloco.membros as m (m.delegacao?.id)}
						<li>
							<span class="com-bandeira"><Bandeira codigo={m.delegacao?.bandeira} /> {m.delegacao?.nome}</span>
							{#if m.redator}<span class="selo selo--info">{t('Redator')}</span>{/if}
						</li>
					{/each}
				</ul>
				{#each data.documentos.filter((d) => d.bloco_id === bloco.id) as d (d.id)}
					<p>
						<a href={`/documento/${d.id}`}>{nomeDoDocumento(d)}</a>
						<span class="selo {STATUS_DOCUMENTO[d.status].selo}">{STATUS_DOCUMENTO[d.status].rotulo}</span>
					</p>
				{/each}
				{#if eu}
					<div class="acoes">
						{#if membro}
							<button class="botao botao--pequeno" type="button" onclick={() => (novoEm = bloco.id)}>{t('Novo documento')}</button>
							<button
								class="botao botao--secundario botao--pequeno"
								type="button"
								onclick={() => executar(supabase.rpc('sair_bloco', { p_bloco: bloco.id }))}>{t('Sair do bloco')}</button
							>
						{:else}
							<button
								class="botao botao--pequeno"
								type="button"
								aria-label={`Entrar no bloco ${bloco.nome}`}
								onclick={() => executar(supabase.rpc('entrar_bloco', { p_bloco: bloco.id }))}>{t('Entrar no bloco')}</button
							>
						{/if}
					</div>
				{/if}
			</article>
		{:else}
			<p class="suave">{t('Ainda não há blocos.')}</p>
		{/each}
	</div>

	{#if novoEm}
		<form class="formulario formulario--largo cartao" onsubmit={criarDocumento} aria-label={t('Novo documento')}>
			<h3>{t('Novo documento')} · {data.blocos.find((b) => b.id === novoEm)?.nome}</h3>
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
				<input required maxlength="200" bind:value={titulo} />
			</label>
			<label class="campo">
				{t('Tópico')}
				<select bind:value={topico}>
					{#each data.comite.topicos as tp, i (tp)}
						{@const semAgenda = tipo === 'projeto' && !data.topicosAdotados.includes(i + 1)}
						<option value={i + 1} disabled={semAgenda}>{i + 1}. {tp}{semAgenda ? ` · ${t('agenda ainda não adotada')}` : ''}</option>
					{/each}
				</select>
			</label>
			{#if tipo === 'projeto' && !data.topicosAdotados.length}
				<p class="suave" role="note">{t('A agenda vem antes das resoluções: adote a agenda de um tópico para apresentar um projeto.')}</p>
			{/if}
			{#if tipo === 'working_paper' && data.subtopicos.some((s) => s.topico === topico)}
				<label class="campo">
					{t('Subtópico da agenda')}
					<select bind:value={subtopico}>
						<option value="">{t('Nenhum')}</option>
						{#each data.subtopicos.filter((s) => s.topico === topico) as s (s.id)}
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
				<button class="botao">{t('Criar e abrir')}</button>
				<button class="botao botao--secundario" type="button" onclick={() => (novoEm = null)}>{t('Cancelar')}</button>
			</div>
		</form>
	{/if}

	{#if eu}
		<form class="formulario" onsubmit={criarBloco}>
			<label class="campo">
				{t('Nome do novo bloco')}
				<input required maxlength="80" bind:value={nomeBloco} placeholder={t('Aliança dos Estados do Sahel')} />
			</label>
			<button class="botao botao--secundario">{t('Criar bloco')}</button>
		</form>
	{/if}
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
