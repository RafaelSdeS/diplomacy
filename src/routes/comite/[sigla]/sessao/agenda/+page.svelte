<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import Confirmar from '#lib/ui/Confirmar.svelte';
	import { bilingue, t } from '#lib/i18n.svelte.ts';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import { doTopico } from '#lib/ordem.ts';
	import { preenchidos } from '#lib/itens.ts';
	import type { ItemEsboco } from '#lib/votacao.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import EditorDeItens from '#lib/ui/EditorDeItens.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import NomeDelegacao from '#lib/ui/NomeDelegacao.svelte';
	import TrilhaDoTopico from '#lib/ui/TrilhaDoTopico.svelte';
	import ListPlus from '@lucide/svelte/icons/list-plus';
	import type { PageProps } from './$types';

	// Passo 56: a aba Agenda, um tópico por vez. Com a agenda adotada, ela vem em destaque e as
	// outras propostas ficam recolhidas; sem ela, as propostas ficam lado a lado para a mesa
	// comparar e adotar. Propor e editar usam o editor de itens, num modal, sem sintaxe.
	let { data }: PageProps = $props();

	type Proposta = (typeof data.propostas)[number];
	type Ponto = Proposta['pontos'][number];
	const ANDAMENTO = bilingue({ pendente: 'Pendente', em_debate: 'Em debate', debatido: 'Debatido' } as const);

	const eu = $derived(data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado'));
	const ehMesa = $derived(
		data.participacoes.some((p) => (p.papel === 'mesa' && p.comite_id === data.comite.id) || p.papel === 'secretaria')
	);
	const podePropor = $derived(!!eu || ehMesa);

	// O tópico da aba: o da URL (a trilha leva a ele), o em debate ou o primeiro.
	const topico = $derived(Number(page.url.searchParams.get('topico')) || data.topicoAtual || data.topicos[0]?.numero || 1);
	const titulo = $derived(data.topicos.find((tp) => tp.numero === topico)?.titulo ?? '');
	const propostas = $derived(data.propostas.filter((p) => p.topico === topico));
	const adotada = $derived(propostas.find((p) => p.adotada));
	const outras = $derived(propostas.filter((p) => !p.adotada));
	const minha = $derived(propostas.find((p) => (eu ? p.delegacao?.id === eu.delegacao_id : !p.delegacao)));
	const autor = (p: Proposta) => p.delegacao?.nome ?? t('Mesa');
	const wpsDoItem = (ponto: string) => data.ordem.documentos.filter((d) => d.tipo === 'working_paper' && d.ponto_pauta_id === ponto).length;

	let erro = $state('');
	let mensagem = $state('');
	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, ok = '') {
		erro = mensagem = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		else mensagem = ok;
		await invalidate('app:agenda');
		return !error;
	}

	/** Os pontos com o nível de cada um, na ordem, para o editor. */
	function niveis(pontos: Ponto[]): ItemEsboco[] {
		const nivel = new Map<string, number>();
		return pontos.map((p) => {
			const n = p.pai_id ? (nivel.get(p.pai_id) ?? 0) + 1 : 0;
			nivel.set(p.id, n);
			return { texto: p.texto, nivel: n };
		});
	}

	// O editor: propor (ou editar a própria proposta) e, para a mesa, editar a adotada.
	let editor = $state<Modal>();
	let modo = $state<'propor' | 'editar'>('propor');
	let itens = $state<ItemEsboco[]>([{ texto: '', nivel: 0 }]);
	function abrirEditor(novoModo: 'propor' | 'editar', base?: Proposta) {
		modo = novoModo;
		const de = base ?? (novoModo === 'editar' ? adotada : minha);
		itens = de?.pontos.length ? niveis(de.pontos) : [{ texto: '', nivel: 0 }];
		erro = mensagem = '';
		editor?.abrir();
	}
	async function salvar(evento: SubmitEvent) {
		evento.preventDefault();
		const p_itens = preenchidos(itens);
		const ok =
			modo === 'editar'
				? await executar(supabase.rpc('editar_agenda_adotada', { p_proposta: adotada!.id, p_itens }), t('Agenda adotada atualizada.'))
				: await executar(supabase.rpc('salvar_proposta_agenda', { p_comite: data.comite.id, p_topico: topico, p_itens }), t('Proposta salva.'));
		if (ok) editor?.fechar();
	}
</script>

{#snippet arvore(pontos: Ponto[], pai: string | null, daAdotada: boolean)}
	<ol class={['arvore', daAdotada && 'arvore--numerada']}>
		{#each pontos.filter((p) => p.pai_id === pai) as ponto (ponto.id)}
			<li>
				<span class="arvore-item">
					{ponto.texto}
					{#if daAdotada}
						{#if data.podePresidir}
							<select
								class="andamento"
								aria-label={t('Andamento de {item}', { item: ponto.texto })}
								value={ponto.status}
								onchange={(e) => executar(supabase.rpc('marcar_ponto_pauta', { p_ponto: ponto.id, p_status: e.currentTarget.value }))}
							>
								{#each Object.entries(ANDAMENTO) as [valor, rotulo] (valor)}
									<option value={valor}>{rotulo}</option>
								{/each}
							</select>
						{:else}
							<span class="selo {ponto.status === 'debatido' ? 'selo--ok' : ponto.status === 'em_debate' ? 'selo--info' : ''}"
								>{ANDAMENTO[ponto.status as keyof typeof ANDAMENTO]}</span
							>
						{/if}
						{#if wpsDoItem(ponto.id)}
							<span class="detalhe"
								>{wpsDoItem(ponto.id) === 1 ? t('com 1 working paper') : t('com {n} working papers', { n: wpsDoItem(ponto.id) })}</span
							>
						{/if}
					{/if}
				</span>
				{#if pontos.some((p) => p.pai_id === ponto.id)}
					{@render arvore(pontos, ponto.id, daAdotada)}
				{/if}
			</li>
		{/each}
	</ol>
{/snippet}

{#snippet cartao(p: Proposta)}
	<article class="cartao" aria-label={t('Proposta de {delegacao}', { delegacao: autor(p) })}>
		<div class="cartao-timbre">
			{#if p.delegacao}<NomeDelegacao sigla={data.comite.sigla} delegacao={p.delegacao} />{:else}<span>{t('Mesa')}</span>{/if}
		</div>
		{@render arvore(p.pontos, null, false)}
		<div class="acoes">
			{#if ehMesa && !adotada}
				<Confirmar
					classe="botao botao--pequeno"
					rotulo={t('Adotar esta')}
					pergunta={t('Adotar a proposta de {delegacao} como a agenda do tópico {n}?', { delegacao: autor(p), n: topico })}
					acao={() => executar(supabase.rpc('adotar_proposta', { p_proposta: p.id }), t('Agenda adotada.'))}
				/>
			{/if}
			{#if podePropor && p !== minha}
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => abrirEditor('propor', p)}>{t('Usar como base')}</button>
			{/if}
		</div>
	</article>
{/snippet}

<svelte:head>
	<title>{tituloDaAba(t('Agenda'), data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">{t('Comitê')} · {data.comite.sigla} <AoVivo comiteId={data.comite.id} tabelas={['proposta_agenda', 'ponto_pauta', 'documento']} dependencia="app:agenda" /></p>
<h1>{t('Agenda')}</h1>

<nav class="abas-topicos" aria-label={t('Tópicos')}>
	{#each data.topicos as tp (tp.numero)}
		<a
			class={['botao botao--pequeno', tp.numero !== topico && 'botao--secundario']}
			href={`?topico=${tp.numero}`}
			aria-current={tp.numero === topico ? 'page' : undefined}
			>{t('Tópico {n}', { n: tp.numero })}{#if tp.numero === data.topicoAtual}{` · ${t('em debate')}`}{/if}</a
		>
	{/each}
</nav>

<section aria-labelledby="t-topico">
	<h2 id="t-topico">{titulo}</h2>
	<TrilhaDoTopico sigla={data.comite.sigla} mesa={ehMesa} {...doTopico(data.ordem, topico)} />

	{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
	{#if mensagem}<p class="sucesso" role="status">{mensagem}</p>{/if}

	{#if adotada}
		<article class="cartao cartao--largo cartao--destaque" aria-labelledby="t-adotada">
			<div class="cartao-timbre">
				<h3 id="t-adotada">{t('Agenda adotada')}</h3>
				{#if adotada.delegacao}<NomeDelegacao sigla={data.comite.sigla} delegacao={adotada.delegacao} />{:else}<span>{t('Mesa')}</span>{/if}
				{#if ehMesa}
					<div class="acoes">
						<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => abrirEditor('editar')}>{t('Editar agenda adotada')}</button>
						<Confirmar
								classe="botao botao--secundario botao--pequeno"
								rotulo={t('Retirar adoção')}
								pergunta={t('Retirar a adoção da agenda do tópico {n}?', { n: topico })}
								acao={() => executar(supabase.rpc('retirar_adocao', { p_proposta: adotada!.id }), t('Adoção retirada.'))}
						/>
					</div>
				{/if}
			</div>
			{@render arvore(adotada.pontos, null, true)}
		</article>
		{#if outras.length}
			<details class="outras-propostas">
				<summary>{t('Outras propostas ({n})', { n: outras.length })}</summary>
				<div class="propostas">
					{#each outras as p (p.id)}{@render cartao(p)}{/each}
				</div>
			</details>
		{/if}
	{:else if propostas.length}
		<div class="propostas propostas--lado">
			{#each propostas as p (p.id)}{@render cartao(p)}{/each}
		</div>
	{:else}
		<p class="suave">{t('Ainda não há propostas para este tópico.')}</p>
	{/if}

	{#if podePropor && !adotada}
		<div class="acoes">
			<button class="botao" type="button" onclick={() => abrirEditor('propor')}
				><ListPlus aria-hidden="true" size={18} strokeWidth={1.75} /> {minha ? t('Editar a minha proposta') : t('Propor agenda')}</button
			>
		</div>
	{/if}
</section>

<Modal bind:this={editor} rotulo="editor-agenda-titulo" classe="modal-largo">
	<form class="formulario formulario--largo" onsubmit={salvar}>
		<h3 id="editor-agenda-titulo">
			{modo === 'editar'
				? t('Editar agenda adotada')
				: eu
					? t('Proposta de {delegacao}', { delegacao: eu.delegacao_nome ?? '' })
					: t('Sugestão da mesa')}
		</h3>
		<p class="suave">{t('Tópico {n}', { n: topico })}: {titulo}</p>
		<EditorDeItens bind:itens />
		{#if modo === 'editar'}
			<p class="suave">{t('Itens de mesmo texto mantêm o andamento.')}</p>
			{#each outras as p (p.id)}
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => (itens = [...itens, ...niveis(p.pontos)])}
					>{t('Trazer os itens de {delegacao}', { delegacao: autor(p) })}</button
				>
			{/each}
		{/if}
		{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
		<div class="acoes">
			<button class="botao" disabled={!preenchidos(itens).length}>{modo === 'editar' ? t('Salvar agenda adotada') : t('Salvar proposta')}</button>
			<button class="botao botao--secundario" type="button" onclick={() => editor?.fechar()}>{t('Cancelar')}</button>
		</div>
	</form>
</Modal>
