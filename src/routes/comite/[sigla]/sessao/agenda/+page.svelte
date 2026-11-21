<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import Confirmar from '#lib/ui/Confirmar.svelte';
	import { bilingue, t } from '#lib/i18n.svelte.ts';
	import { untrack } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import NomeDelegacao from '#lib/ui/NomeDelegacao.svelte';
	import { escreverEsboco, lerEsboco } from '#lib/votacao.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Ponto = (typeof data.propostas)[number]['pontos'][number];
	const ANDAMENTO = bilingue({ pendente: 'Pendente', em_debate: 'Em debate', debatido: 'Debatido' } as const);

	const eu = $derived(data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado'));
	const ehMesa = $derived(
		data.participacoes.some((p) => (p.papel === 'mesa' && p.comite_id === data.comite.id) || p.papel === 'secretaria')
	);
	const podePropor = $derived(!!eu || ehMesa);
	const minha = (topico: number) =>
		data.propostas.find((p) => p.topico === topico && (eu ? p.delegacao?.id === eu.delegacao_id : !p.delegacao));

	let topico = $state(untrack(() => data.topicoAtual ?? data.topicos[0]?.numero ?? 1));
	// Edição da agenda adotada (mesa): a proposta em edição e o esboço dela.
	let editando = $state<string | null>(null);
	let esbocoEdicao = $state('');
	const adotadaDo = (n: number) => data.propostas.find((p) => p.topico === n && p.adotada);
	let esboco = $state('');
	let erro = $state('');
	let mensagem = $state('');
	// Ao trocar de tópico, o campo mostra a proposta já salva para ele.
	$effect(() => {
		const salva = minha(topico);
		esboco = untrack(() => (salva ? escreverEsboco(niveis(salva.pontos)) : ''));
	});

	/** Os pontos com o nível de cada um, na ordem, para voltar ao esboço. */
	function niveis(pontos: Ponto[]) {
		const nivel = new Map<string, number>();
		return pontos.map((p) => {
			const n = p.pai_id ? (nivel.get(p.pai_id) ?? 0) + 1 : 0;
			nivel.set(p.id, n);
			return { texto: p.texto, nivel: n };
		});
	}

	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, ok = '') {
		erro = mensagem = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		else mensagem = ok;
		await invalidate('app:agenda');
	}

	function editar(proposta: (typeof data.propostas)[number]) {
		editando = proposta.id;
		esbocoEdicao = escreverEsboco(niveis(proposta.pontos));
	}

	async function salvarEdicao(evento: SubmitEvent) {
		evento.preventDefault();
		await executar(
			supabase.rpc('editar_agenda_adotada', { p_proposta: editando!, p_itens: lerEsboco(esbocoEdicao) }),
			t('Agenda adotada atualizada.')
		);
		if (!erro) editando = null;
	}

	function salvar(evento: SubmitEvent) {
		evento.preventDefault();
		void executar(
			supabase.rpc('salvar_proposta_agenda', { p_comite: data.comite.id, p_topico: topico, p_itens: lerEsboco(esboco) }),
			t('Proposta salva.')
		);
	}
</script>

{#snippet arvore(pontos: Ponto[], pai: string | null, adotada: boolean)}
	<ol class="arvore">
		{#each pontos.filter((p) => p.pai_id === pai) as ponto (ponto.id)}
			<li>
				<span class="arvore-item">
					{ponto.texto}
					{#if adotada}
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
					{/if}
				</span>
				{#if pontos.some((p) => p.pai_id === ponto.id)}
					{@render arvore(pontos, ponto.id, adotada)}
				{/if}
			</li>
		{/each}
	</ol>
{/snippet}

<svelte:head>
	<title>{tituloDaAba(t('Agenda'), data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">{t('Comitê')} · {data.comite.sigla}</p>
<h1>{t('Agenda')}</h1>

<section aria-labelledby="t-topicos">
	<h2 id="t-topicos">{t('Tópicos')}</h2>
	<ol class="lista">
		{#each data.topicos as tp (tp.numero)}
			<li aria-current={tp.numero === data.topicoAtual ? 'step' : undefined}>
				<span>{tp.titulo}</span>
				{#if tp.numero === data.topicoAtual}<span class="selo selo--info">{t('Em debate')}</span>{/if}
			</li>
		{/each}
	</ol>
	<p class="suave">{t('A ordem sai da moção de introdução do tópico no topo da agenda, no fim da plenária de abertura.')}</p>
</section>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

{#each data.topicos as tp (tp.numero)}
	{@const propostas = data.propostas.filter((p) => p.topico === tp.numero)}
	{@const adotada = adotadaDo(tp.numero)}
	<section aria-labelledby={`t-agenda-${tp.numero}`}>
		<h2 id={`t-agenda-${tp.numero}`}>{t('Agenda informal · tópico {n}', { n: tp.numero })}</h2>
		<ol class="etapas" aria-label={t('Etapas do tópico {n}', { n: tp.numero })}>
			<li aria-current={adotada ? undefined : 'step'} class:feita={!!adotada}>{t('Debate da agenda')}</li>
			<li aria-current={adotada ? 'step' : undefined}>{t('Agenda adotada: working papers e projetos de resolução')}</li>
		</ol>
		{#if propostas.length}
			<div class="propostas">
				{#each propostas as proposta (proposta.id)}
					{@const autor = proposta.delegacao?.nome ?? t('Mesa')}
					<article class="cartao" aria-label={t('Proposta de {delegacao}', { delegacao: autor })}>
						<div class="cartao-timbre">
							{#if proposta.delegacao}
								<NomeDelegacao sigla={data.comite.sigla} delegacao={proposta.delegacao} />
							{:else}
								<span>{autor}</span>
							{/if}
							{#if proposta.adotada}<span class="selo selo--ok">{t('Adotada')}</span>{/if}
						</div>
						{@render arvore(proposta.pontos, null, proposta.adotada)}
						{#if ehMesa && proposta.adotada}
							<div class="acoes">
								<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => editar(proposta)}
									>{t('Editar agenda adotada')}</button
								>
								<Confirmar
									classe="botao botao--secundario botao--pequeno"
									rotulo={t('Retirar adoção')}
									pergunta={t('Retirar a adoção da agenda do tópico {n}?', { n: tp.numero })}
									acao={() => executar(supabase.rpc('retirar_adocao', { p_proposta: proposta.id }), t('Adoção retirada.'))}
								/>
							</div>
						{:else if ehMesa}
							<div class="acoes">
								<button
									class="botao botao--secundario botao--pequeno"
									type="button"
									aria-label={t('Adotar a proposta de {delegacao}', { delegacao: autor })}
									onclick={() => executar(supabase.rpc('adotar_proposta', { p_proposta: proposta.id }), t('Agenda adotada.'))}
									>{t('Adotar esta proposta')}</button
								>
								{#if editando && editando === adotada?.id}
									<button
										class="botao botao--secundario botao--pequeno"
										type="button"
										onclick={() => (esbocoEdicao = `${esbocoEdicao.trimEnd()}\n${escreverEsboco(niveis(proposta.pontos))}`)}
										>{t('Trazer itens para a agenda adotada')}</button
									>
								{/if}
							</div>
						{/if}
					</article>
				{/each}
			</div>
		{:else}
			<p class="suave">{t('Ainda não há propostas para este tópico.')}</p>
		{/if}
		{#if editando && editando === adotada?.id}
			<form class="formulario formulario--largo" onsubmit={salvarEdicao} aria-label={t('Editar agenda adotada')}>
				<label class="campo">
					{t('Agenda adotada em tópicos')}
					<textarea rows="8" required bind:value={esbocoEdicao} aria-describedby="ajuda-esboco"></textarea>
				</label>
				<p class="suave">{t('Itens de mesmo texto mantêm o andamento.')}</p>
				<div class="acoes">
					<button class="botao">{t('Salvar agenda adotada')}</button>
					<button class="botao botao--secundario" type="button" onclick={() => (editando = null)}>{t('Cancelar')}</button>
				</div>
			</form>
		{/if}
	</section>
{/each}

{#if podePropor}
	<section aria-labelledby="t-propor">
		<h2 id="t-propor">{eu ? t('Proposta de {delegacao}', { delegacao: eu.delegacao_nome ?? '' }) : t('Sugestão da mesa')}</h2>
		<form class="formulario formulario--largo" onsubmit={salvar}>
			<label class="campo">
				{t('Tópico')}
				<select bind:value={topico}>
					{#each data.topicos as tp (tp.numero)}
						<option value={tp.numero}>{tp.numero}. {tp.titulo}</option>
					{/each}
				</select>
			</label>
			<label class="campo">
				{t('Agenda em tópicos')}
				<textarea rows="8" required bind:value={esboco} aria-describedby="ajuda-esboco"></textarea>
			</label>
			<p class="suave" id="ajuda-esboco">
				{t('Um item por linha. Dois espaços (ou um traço) no começo põem o item dentro do anterior: subtópico, ponto e subponto.')}
			</p>
			<button class="botao">{t('Salvar proposta')}</button>
		</form>
	</section>
{/if}
