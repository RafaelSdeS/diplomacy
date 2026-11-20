<script lang="ts">
	import { STATUS_DPO as STATUS } from '#lib/impressao.ts';
	import { untrack } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();


	const eu = $derived(data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado'));
	const ehMesa = $derived(
		data.participacoes.some((p) => (p.papel === 'mesa' && p.comite_id === data.comite.id) || p.papel === 'secretaria')
	);
	const meu = (topico: number) => data.dpos.find((d) => d.topico === topico && d.delegacao?.id === eu?.delegacao_id);
	const outros = $derived(data.dpos.filter((d) => d.delegacao?.id !== eu?.delegacao_id));

	// Rascunho de cada tópico (texto e referências, uma por linha). Segue o banco só
	// quando o DPO não é editável (enviado ou aprovado); senão, guarda o que se digita.
	const rascunhos = $state<Record<number, { texto: string; referencias: string }>>({});
	$effect(() => {
		const dpos = data.dpos; // só os dados carregados disparam este efeito
		untrack(() => {
			for (const [i] of data.comite.topicos.entries()) {
				const d = dpos.find((x) => x.topico === i + 1 && x.delegacao?.id === eu?.delegacao_id);
				if (!rascunhos[i + 1] || (d && d.status !== 'rascunho' && d.status !== 'pede_ajustes'))
					rascunhos[i + 1] = { texto: d?.texto ?? '', referencias: (d?.referencias ?? []).join('\n') };
			}
		});
	});

	let erro = $state('');
	let mensagem = $state('');
	let aberto = $state<string | null>(null);
	let comentario = $state('');

	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, ok = '') {
		erro = mensagem = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		else mensagem = ok;
		await invalidate('app:dpo');
		return !error;
	}

	const salvar = (topico: number) =>
		executar(
			supabase.rpc('salvar_dpo', {
				p_comite: data.comite.id,
				p_topico: topico,
				p_texto: rascunhos[topico].texto,
				p_referencias: rascunhos[topico].referencias.split('\n')
			}),
			'DPO salvo.'
		);

	// Avaliado, o DPO fecha o painel da mesa.
	async function avaliar(dpo: string, status: 'aprovado' | 'pede_ajustes', ok: string) {
		if (await executar(supabase.rpc('avaliar_dpo', { p_dpo: dpo, p_status: status, p_comentario: comentario }), ok)) {
			aberto = null;
			comentario = '';
		}
	}

	async function enviar(topico: number) {
		if (await salvar(topico)) await executar(supabase.rpc('enviar_dpo', { p_dpo: meu(topico)!.id }), 'DPO enviado à mesa.');
	}
</script>

<svelte:head>
	<title>DPO · {data.comite.sigla} · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">
	Comitê · {data.comite.sigla}
	<AoVivo comiteId={data.comite.id} tabelas={['dpo']} dependencia="app:dpo" />
</p>
<h1>Documento de posição oficial</h1>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

{#if eu}
	{#each data.comite.topicos as titulo, i (titulo)}
		{@const topico = i + 1}
		{@const d = meu(topico)}
		{@const editavel = !d || d.status === 'rascunho' || d.status === 'pede_ajustes'}
		<section class="cartao dpo-editor" aria-labelledby={`t-dpo-${topico}`}>
			<h2 id={`t-dpo-${topico}`}>Tópico {topico}: {titulo}</h2>
			<p class="cabecalho-documento">
				<span class="selo {STATUS[d?.status ?? 'rascunho'].selo}">{STATUS[d?.status ?? 'rascunho'].rotulo}</span>
				{#if d}<a href={`/imprimir/dpo/${d.id}`}>Imprimir ou salvar como PDF</a>{/if}
			</p>
			{#if d?.comentario_mesa}
				<p class="telegrama" role="note" aria-label="Comentário da mesa">{d.comentario_mesa}</p>
			{/if}
			{#if rascunhos[topico]}
				<label class="campo">
					Texto (parágrafos separados por uma linha em branco)
					<textarea rows="12" maxlength="12000" disabled={!editavel} bind:value={rascunhos[topico].texto}></textarea>
				</label>
				<label class="campo">
					Referências (uma por linha)
					<textarea rows="4" disabled={!editavel} bind:value={rascunhos[topico].referencias}></textarea>
				</label>
			{/if}
			{#if editavel}
				<div class="acoes">
					<button class="botao botao--secundario" type="button" onclick={() => salvar(topico)}>Salvar rascunho</button>
					<button class="botao" type="button" onclick={() => enviar(topico)}>Enviar à mesa</button>
				</div>
			{/if}
		</section>
	{/each}
{/if}

{#if ehMesa || outros.length}
	<section aria-labelledby="t-dpos">
		<h2 id="t-dpos">{ehMesa ? 'DPOs do comitê' : 'DPOs abertos do comitê'}</h2>
		{#if ehMesa}
			<p class="suave">
				{data.regras.dpos_publicos
					? 'Os DPOs aprovados estão abertos para as outras delegações.'
					: 'Os DPOs ficam fechados: só a delegação e a mesa leem.'}
			</p>
		{/if}
		<ul class="lista">
			{#each outros as d (d.id)}
				<li>
					<span>
						<span class="com-bandeira"><Bandeira codigo={d.delegacao?.bandeira} /> {d.delegacao?.nome}</span>
						<span class="detalhe">Tópico {d.topico} · <span class="selo {STATUS[d.status].selo}">{STATUS[d.status].rotulo}</span></span>
					</span>
					<span class="acoes">
						<a href={`/imprimir/dpo/${d.id}`} aria-label={`Imprimir o DPO de ${d.delegacao?.nome}, tópico ${d.topico}`}>Imprimir</a>
						{#if ehMesa && (d.status === 'enviado' || d.status === 'aprovado')}
							<button
								class="botao botao--pequeno"
								type="button"
								aria-label={`Avaliar o DPO de ${d.delegacao?.nome}, tópico ${d.topico}`}
								onclick={() => (aberto = aberto === d.id ? null : d.id)}>Avaliar</button
							>
						{/if}
					</span>
				</li>
				{#if aberto === d.id}
					<li class="avaliacao">
						<div class="formulario formulario--largo">
							<p class="texto-nota">{d.texto}</p>
							<label class="campo">
								Comentário para a delegação
								<textarea rows="3" maxlength="1000" bind:value={comentario}></textarea>
							</label>
							<div class="acoes">
								<button
									class="botao"
									type="button"
									onclick={() => avaliar(d.id, 'aprovado', 'DPO aprovado.')}
									>Aprovar</button
								>
								<button
									class="botao botao--secundario"
									type="button"
									onclick={() => avaliar(d.id, 'pede_ajustes', 'Ajustes pedidos.')}
									>Pedir ajustes</button
								>
							</div>
						</div>
					</li>
				{/if}
			{:else}
				<li class="suave">Nenhum DPO por aqui ainda.</li>
			{/each}
		</ul>
	</section>
{/if}
