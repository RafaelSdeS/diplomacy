<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import { escreverEsboco, lerEsboco } from '#lib/votacao.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Ponto = (typeof data.propostas)[number]['pontos'][number];
	const ANDAMENTO = { pendente: 'Pendente', em_debate: 'Em debate', debatido: 'Debatido' } as const;
	const PROXIMO = { pendente: 'em_debate', em_debate: 'debatido', debatido: 'pendente' } as const;

	const eu = $derived(data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado'));
	const ehMesa = $derived(
		data.participacoes.some((p) => (p.papel === 'mesa' && p.comite_id === data.comite.id) || p.papel === 'secretaria')
	);
	const podePropor = $derived(!!eu || ehMesa);
	const minha = (topico: number) =>
		data.propostas.find((p) => p.topico === topico && (eu ? p.delegacao?.id === eu.delegacao_id : !p.delegacao));

	let topico = $state(untrack(() => data.topicoAtual ?? data.topicos[0]?.numero ?? 1));
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

	function salvar(evento: SubmitEvent) {
		evento.preventDefault();
		void executar(
			supabase.rpc('salvar_proposta_agenda', { p_comite: data.comite.id, p_topico: topico, p_itens: lerEsboco(esboco) }),
			'Proposta salva.'
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
							<button
								class="botao botao--secundario botao--pequeno"
								type="button"
								aria-label={`Andamento de ${ponto.texto}: ${ANDAMENTO[ponto.status as keyof typeof ANDAMENTO]}. Mudar`}
								onclick={() =>
									executar(
										supabase.rpc('marcar_ponto_pauta', {
											p_ponto: ponto.id,
											p_status: PROXIMO[ponto.status as keyof typeof PROXIMO]
										})
									)}>{ANDAMENTO[ponto.status as keyof typeof ANDAMENTO]}</button
							>
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
	<title>Agenda · {data.comite.sigla} · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">Comitê · {data.comite.sigla}</p>
<h1>Agenda</h1>

<section aria-labelledby="t-topicos">
	<h2 id="t-topicos">Tópicos</h2>
	<ol class="lista">
		{#each data.topicos as t (t.numero)}
			<li aria-current={t.numero === data.topicoAtual ? 'step' : undefined}>
				<span>{t.titulo}</span>
				{#if t.numero === data.topicoAtual}<span class="selo selo--info">Em debate</span>{/if}
			</li>
		{/each}
	</ol>
	<p class="suave">A ordem sai da moção de introdução do tópico no topo da agenda, no fim da plenária de abertura.</p>
</section>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

{#each data.topicos as t (t.numero)}
	{@const propostas = data.propostas.filter((p) => p.topico === t.numero)}
	<section aria-labelledby={`t-agenda-${t.numero}`}>
		<h2 id={`t-agenda-${t.numero}`}>Agenda informal · tópico {t.numero}</h2>
		{#if propostas.length}
			<div class="propostas">
				{#each propostas as proposta (proposta.id)}
					{@const autor = proposta.delegacao?.nome ?? 'Mesa'}
					<article class="cartao" aria-label={`Proposta de ${autor}`}>
						<div class="cartao-timbre">
							<span class="com-bandeira"><Bandeira codigo={proposta.delegacao?.bandeira} /> {autor}</span>
							{#if proposta.adotada}<span class="selo selo--ok">Adotada</span>{/if}
						</div>
						{@render arvore(proposta.pontos, null, proposta.adotada)}
						{#if ehMesa && !proposta.adotada}
							<button
								class="botao botao--secundario botao--pequeno"
								type="button"
								aria-label={`Adotar a proposta de ${autor}`}
								onclick={() => executar(supabase.rpc('adotar_proposta', { p_proposta: proposta.id }), 'Agenda adotada.')}
								>Adotar esta proposta</button
							>
						{/if}
					</article>
				{/each}
			</div>
		{:else}
			<p class="suave">Ainda não há propostas para este tópico.</p>
		{/if}
	</section>
{/each}

{#if podePropor}
	<section aria-labelledby="t-propor">
		<h2 id="t-propor">{eu ? `Proposta de ${eu.delegacao_nome}` : 'Sugestão da mesa'}</h2>
		<form class="formulario formulario--largo" onsubmit={salvar}>
			<label class="campo">
				Tópico
				<select bind:value={topico}>
					{#each data.topicos as t (t.numero)}
						<option value={t.numero}>{t.numero}. {t.titulo}</option>
					{/each}
				</select>
			</label>
			<label class="campo">
				Agenda em tópicos
				<textarea rows="8" required bind:value={esboco} aria-describedby="ajuda-esboco"></textarea>
			</label>
			<p class="suave" id="ajuda-esboco">
				Um item por linha. Dois espaços (ou um traço) no começo põem o item dentro do anterior: subtópico, ponto e subponto.
			</p>
			<button class="botao">Salvar proposta</button>
		</form>
	</section>
{/if}
