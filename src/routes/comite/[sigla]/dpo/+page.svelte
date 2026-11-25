<script lang="ts">
	// A folha usa o peso 400 e o itálico; só esta rota baixa os arquivos.
	import '@fontsource/spectral/latin-400.css';
	import '@fontsource/spectral/latin-400-italic.css';
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { contador } from '#lib/contador.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { abrirPrevia } from '#lib/ficha.svelte.ts';
	import { paragrafos, STATUS_DPO as STATUS } from '#lib/impressao.ts';
	import Modal from '#lib/ui/Modal.svelte';
	import Quando from '#lib/ui/Quando.svelte';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import { untrack } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import NomeDelegacao from '#lib/ui/NomeDelegacao.svelte';
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
	let comentario = $state('');
	// Passo 51 (lote 0b): escrever o DPO e avaliar abrem no centro, num modal largo.
	let escrevendo = $state<number | null>(null);
	let avaliando = $state<string | null>(null);
	const emAvaliacao = $derived(outros.find((d) => d.id === avaliando));
	const palavras = (texto: string) => texto.trim().split(/\s+/).filter(Boolean).length;

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
			t('DPO salvo.')
		);

	// Avaliado, o DPO fecha o painel da mesa.
	async function avaliar(dpo: string, status: 'aprovado' | 'pede_ajustes', ok: string) {
		if (await executar(supabase.rpc('avaliar_dpo', { p_dpo: dpo, p_status: status, p_comentario: comentario }), ok)) {
			avaliando = null;
			comentario = '';
		}
	}

	async function enviar(topico: number) {
		if ((await salvar(topico)) && (await executar(supabase.rpc('enviar_dpo', { p_dpo: meu(topico)!.id }), t('DPO enviado à mesa.'))))
			escrevendo = null;
	}
</script>

<svelte:head>
	<title>{tituloDaAba(t('DPO'), data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">
	{t('Comitê')} · {data.comite.sigla}
	<AoVivo comiteId={data.comite.id} tabelas={['dpo']} dependencia="app:dpo" />
</p>
<h1>{t('Documento de posição oficial')}</h1>

<!-- Com um modal aberto, o aviso aparece dentro dele. -->
{#if escrevendo === null && !avaliando}
	{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
	{#if mensagem}<p class="sucesso" role="status">{mensagem}</p>{/if}
{/if}

{#if eu}
	<section aria-labelledby="t-meu-dpo">
		<h2 id="t-meu-dpo">{t('Meu DPO')}</h2>
		<div class="cartoes">
			{#each data.comite.topicos as titulo, i (titulo)}
				{@const topico = i + 1}
				{@const d = meu(topico)}
				{@const editavel = !d || d.status === 'rascunho' || d.status === 'pede_ajustes'}
				<section class="cartao" aria-labelledby={`t-dpo-${topico}`}>
					<h3 id={`t-dpo-${topico}`}>{t('Tópico')} {topico}: {titulo}</h3>
					<p class="cabecalho-documento">
						<span class="selo {STATUS[d?.status ?? 'rascunho'].selo}">{STATUS[d?.status ?? 'rascunho'].rotulo}</span>
						{#if d?.enviado_em}<span class="detalhe">{t('enviado')} <Quando iso={d.enviado_em} /></span>{/if}
					</p>
					{#if d?.comentario_mesa}
						<p class="telegrama" role="note" aria-label={t('Comentário da mesa')}>{d.comentario_mesa}</p>
					{/if}
					<p class="suave">{d?.texto.trim() ? t('{n} palavras', { n: palavras(d.texto) }) : t('Ainda não escrito.')}</p>
					<div class="acoes">
						{#if editavel}
							<button class="botao" type="button" onclick={() => (escrevendo = topico)}
								><PenLine aria-hidden="true" size={18} strokeWidth={1.75} /> {d?.texto.trim() ? t('Continuar') : t('Escrever')}</button
							>
						{/if}
						{#if d?.texto.trim()}
							<button class="botao botao--secundario" type="button" onclick={() => abrirPrevia('dpo', d.id)}>{t('Ler')}</button>
							<a class="botao botao--secundario" href={`/imprimir/dpo/${d.id}`}>{t('Imprimir ou salvar como PDF')}</a>
						{/if}
					</div>
				</section>
			{/each}
		</div>
	</section>

	<Modal aberto={escrevendo !== null} rotulo="t-escrevendo" classe="modal-dpo" onclose={() => (escrevendo = null)}>
		{#if escrevendo !== null && rascunhos[escrevendo]}
			{@const topico = escrevendo}
			{@const d = meu(topico)}
			<h3 id="t-escrevendo">{t('DPO · Tópico {n}', { n: topico })}: {data.comite.topicos[topico - 1]}</h3>
			{#if d?.comentario_mesa}
				<p class="telegrama" role="note" aria-label={t('Comentário da mesa')}>{d.comentario_mesa}</p>
			{/if}
			<div class="dpo-escrita">
				<div class="formulario">
					<label class="campo">
						{t('Texto (parágrafos separados por uma linha em branco)')}
						<textarea rows="14" maxlength="12000" bind:value={rascunhos[topico].texto} {@attach contador(rascunhos[topico].texto)}></textarea>
					</label>
					<p class="detalhe">{t('{n} palavras', { n: palavras(rascunhos[topico].texto) })}</p>
					<label class="campo">
						{t('Referências (uma por linha)')}
						<textarea rows="4" bind:value={rascunhos[topico].referencias}></textarea>
					</label>
				</div>
				<div class="dpo-previa folha" aria-label={t('Prévia')}>
					<p class="rotulo">{t('Prévia')}</p>
					{#each paragrafos(rascunhos[topico].texto) as p, n (n)}<p>{p}</p>{:else}<p class="suave">{t('O texto aparece aqui.')}</p>{/each}
				</div>
			</div>
			{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
			{#if mensagem}<p class="sucesso" role="status">{mensagem}</p>{/if}
			<div class="acoes">
				<button class="botao" type="button" onclick={() => enviar(topico)}>{t('Enviar à mesa')}</button>
				<button class="botao botao--secundario" type="button" onclick={() => salvar(topico)}>{t('Salvar rascunho')}</button>
				<button class="botao botao--secundario" type="button" onclick={() => (escrevendo = null)}>{t('Fechar')}</button>
			</div>
		{/if}
	</Modal>
{/if}

{#if ehMesa || outros.length}
	<section aria-labelledby="t-dpos">
		<h2 id="t-dpos">{ehMesa ? t('DPOs do comitê') : t('DPOs abertos do comitê')}</h2>
		{#if ehMesa}
			<p class="suave">
				{data.regras.dpos_publicos
					? t('Os DPOs aprovados estão abertos para as outras delegações.')
					: t('Os DPOs ficam fechados: só a delegação e a mesa leem.')}
			</p>
		{/if}
		<ul class="cartoes-dpo">
			{#each outros as d (d.id)}
				<li class="cartao">
					<p><NomeDelegacao sigla={data.comite.sigla} delegacao={d.delegacao} /></p>
					<p class="detalhe">{t('Tópico')} {d.topico} · <span class="selo {STATUS[d.status].selo}">{STATUS[d.status].rotulo}</span></p>
					<div class="acoes">
						<button
							class="botao botao--secundario botao--pequeno"
							type="button"
							aria-label={`${t('Ler')}: ${t('DPO de {delegacao}', { delegacao: d.delegacao?.nome ?? '' })}, ${t('Tópico')} ${d.topico}`}
							onclick={() => abrirPrevia('dpo', d.id)}>{t('Ler')}</button
						>
						{#if ehMesa && (d.status === 'enviado' || d.status === 'aprovado')}
							<button
								class="botao botao--pequeno"
								type="button"
								aria-label={`Avaliar o DPO de ${d.delegacao?.nome}, tópico ${d.topico}`}
								onclick={() => {
									erro = mensagem = '';
									avaliando = d.id;
								}}>{t('Avaliar')}</button
							>
						{/if}
					</div>
				</li>
			{:else}
				<li class="suave">{t('Nenhum DPO por aqui ainda.')}</li>
			{/each}
		</ul>
		<Modal aberto={!!emAvaliacao} rotulo="t-avaliando" classe="modal-dpo" onclose={() => (avaliando = null)}>
			{#if emAvaliacao}
				<h3 id="t-avaliando">{t('DPO de {delegacao}', { delegacao: emAvaliacao.delegacao?.nome ?? '' })} · {t('Tópico')} {emAvaliacao.topico}</h3>
				<div class="texto-nota folha">{#each paragrafos(emAvaliacao.texto) as p, n (n)}<p>{p}</p>{/each}</div>
				<label class="campo">
					{t('Comentário para a delegação')}
					<textarea rows="3" maxlength="1000" bind:value={comentario} {@attach contador(comentario)}></textarea>
				</label>
				{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
				<div class="acoes">
					<button class="botao" type="button" onclick={() => avaliar(emAvaliacao.id, 'aprovado', t('DPO aprovado.'))}>{t('Aprovar')}</button>
					<button class="botao botao--secundario" type="button" onclick={() => avaliar(emAvaliacao.id, 'pede_ajustes', t('Ajustes pedidos.'))}
						>{t('Pedir ajustes')}</button
					>
					<button class="botao botao--secundario" type="button" onclick={() => (avaliando = null)}>{t('Fechar')}</button>
				</div>
			{/if}
		</Modal>
	</section>
{/if}
