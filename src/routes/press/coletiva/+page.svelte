<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { contador } from '#lib/contador.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { invalidate } from '$app/navigation';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let titulo = $state('Coletiva de imprensa');
	let delegacao = $state('');
	let pergunta = $state('');
	let erro = $state('');
	let mensagem = $state('');

	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, ok: string) {
		erro = mensagem = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		else mensagem = ok;
		await invalidate('app:coletiva');
		return !error;
	}

	// A pauta agrupada por veículo.
	// (Sem Object.groupBy: iPhones com iOS anterior ao 17.4 não têm.)
	const porVeiculo = $derived.by(() => {
		const grupos = new Map<string, typeof data.perguntas>();
		for (const p of data.perguntas) grupos.set(p.veiculo?.nome ?? '', [...(grupos.get(p.veiculo?.nome ?? '') ?? []), p]);
		return [...grupos];
	});
</script>

<svelte:head>
	<title>{tituloDaAba(t('Coletiva'), t('Press'))}</title>
</svelte:head>

<p class="rotulo">
	{t('Press · Simulação')}
	<AoVivo eventoId={data.evento} tabelas={['coletiva', 'coletiva_pergunta']} dependencia="app:coletiva" />
</p>
<h1>{t('Coletiva de imprensa')}</h1>
<p class="suave">
	{t('Cada jornalista escolhe até 4 delegações do próprio comitê, com uma pergunta para cada. Depois da coletiva, a resposta vira matéria.')}
</p>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

{#if data.diretoria}
	<form
		class="formulario"
		aria-label={t('Abrir coletiva')}
		onsubmit={(e) => {
			e.preventDefault();
			void executar(supabase.rpc('abrir_coletiva', { p_evento: data.evento, p_titulo: titulo }), t('Coletiva aberta.'));
		}}
	>
		<label class="campo">
			{t('Título da coletiva')}
			<input required maxlength="200" bind:value={titulo} {@attach contador(titulo)} />
		</label>
		<button class="botao">{t('Abrir uma coletiva')}</button>
		{#if data.coletiva?.aberta}
			<button
				class="botao botao--secundario"
				type="button"
				onclick={() => executar(supabase.rpc('encerrar_coletiva', { p_coletiva: data.coletiva!.id }), t('Coletiva encerrada.'))}
				>{t('Encerrar a coletiva')}</button
			>
		{/if}
	</form>
{/if}

{#if data.coletiva}
	<section aria-labelledby="t-pauta">
		<h2 id="t-pauta">{data.coletiva.titulo} {data.coletiva.aberta ? '' : '(encerrada)'}</h2>
		{#if data.souPress && data.coletiva.aberta}
			<form
				class="formulario"
				aria-label={t('Nova pergunta')}
				onsubmit={async (e) => {
					e.preventDefault();
					if (await executar(supabase.rpc('perguntar_na_coletiva', { p_coletiva: data.coletiva!.id, p_delegacao: delegacao, p_pergunta: pergunta }), t('Pergunta na pauta.')))
						pergunta = '';
				}}
			>
				<label class="campo">
					{t('Delegação')}
					<select required bind:value={delegacao}>
						{#each data.delegacoes as d (d.id)}<option value={d.id}>{d.nome}</option>{/each}
					</select>
				</label>
				<label class="campo">
					{t('Pergunta')}
					<input required maxlength="300" bind:value={pergunta} {@attach contador(pergunta)} />
				</label>
				<button class="botao">{t('Pôr na pauta')}</button>
			</form>
		{/if}
		{#each porVeiculo as [veiculo, perguntas] (veiculo)}
			<h3>{veiculo}</h3>
			<ol class="lista">
				{#each perguntas as p (p.id)}<li><span><strong>{p.delegacao?.nome}:</strong> {p.pergunta}</span></li>{/each}
			</ol>
		{:else}
			<p class="suave">{t('Nenhuma pergunta na pauta ainda.')}</p>
		{/each}
	</section>
{:else}
	<p class="suave">{t('Nenhuma coletiva aberta.')}</p>
{/if}
