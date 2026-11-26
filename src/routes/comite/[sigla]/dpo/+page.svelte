<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { contador } from '#lib/contador.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { abrirPrevia } from '#lib/ficha.svelte.ts';
	import { STATUS_DPO as STATUS } from '#lib/impressao.ts';
	import Modal from '#lib/ui/Modal.svelte';
	import { dica } from '#lib/dica.ts';
	import Quando from '#lib/ui/Quando.svelte';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import NomeDelegacao from '#lib/ui/NomeDelegacao.svelte';
	import FileUp from '@lucide/svelte/icons/file-up';
	import FileText from '@lucide/svelte/icons/file-text';
	import { invalidate } from '$app/navigation';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import type { PageProps } from './$types';

	// Passo 53: o DPO é um PDF que a delegação prepara antes e envia, um por tópico. Assim que
	// chega, o comitê lê; a mesa não aprova, só comenta ou retira um arquivo indevido.
	let { data }: PageProps = $props();

	type Dpo = (typeof data.dpos)[number];
	const eu = $derived(data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado'));
	const ehMesa = $derived(data.participacoes.some((p) => p.papel === 'mesa' && p.comite_id === data.comite.id));
	const meu = (topico: number) => data.dpos.find((d) => d.topico === topico && d.delegacao?.id === eu?.delegacao_id);
	const outros = $derived(data.dpos.filter((d) => d.delegacao?.id !== eu?.delegacao_id));
	const enviado = (d: Dpo | undefined) => d?.status === 'enviado' || d?.status === 'aprovado';
	const atrasado = (d: Dpo) => !!data.prazo && !!d.enviado_em && Date.parse(d.enviado_em) > Date.parse(data.prazo);

	const LIMITE = 5 * 1024 * 1024;
	let erro = $state('');
	let mensagem = $state('');
	let enviando = $state<number | null>(null);

	async function enviar(topico: number, evento: Event) {
		const entrada = evento.currentTarget as HTMLInputElement;
		const arquivo = entrada.files?.[0];
		entrada.value = '';
		erro = mensagem = '';
		if (!arquivo || !eu?.delegacao_id) return;
		if (arquivo.type !== 'application/pdf' && !/\.pdf$/i.test(arquivo.name)) {
			erro = t('O DPO precisa ser um arquivo PDF.');
			return;
		}
		if (arquivo.size > LIMITE) {
			erro = t('O PDF passa de 5 MB. Diminua o arquivo e envie de novo.');
			return;
		}
		enviando = topico;
		const caminho = `${data.comite.id}/${eu.delegacao_id}/${topico}.pdf`;
		const subida = await supabase.storage.from('dpos').upload(caminho, arquivo, { upsert: true, contentType: 'application/pdf' });
		const { error } = subida.error ? subida : await supabase.rpc('enviar_dpo', { p_comite: data.comite.id, p_topico: topico });
		if (error) erro = mensagemDeErro(error);
		else mensagem = t('DPO enviado. O comitê já pode ler.');
		enviando = null;
		await invalidate('app:dpo');
	}

	// A mesa: comentar (só a delegação lê) e retirar um arquivo indevido, com o motivo.
	let modal = $state<Modal>();
	let acao = $state<{ dpo: Dpo; tipo: 'comentar' | 'retirar' } | null>(null);
	let texto = $state('');
	function abrir(dpo: Dpo, tipo: 'comentar' | 'retirar') {
		erro = mensagem = '';
		acao = { dpo, tipo };
		texto = tipo === 'comentar' ? (data.comentarios.get(dpo.id) ?? '') : '';
		modal?.abrir();
	}
	async function confirmar() {
		if (!acao) return;
		erro = mensagem = '';
		if (acao.tipo === 'comentar') {
			const { error } = await supabase.rpc('comentar_dpo', { p_dpo: acao.dpo.id, p_texto: texto });
			if (error) erro = mensagemDeErro(error);
			else mensagem = texto.trim() ? t('Comentário salvo. Só a delegação lê.') : t('Comentário apagado.');
		} else {
			const { data: arquivo, error } = await supabase.rpc('retirar_dpo', { p_dpo: acao.dpo.id, p_motivo: texto });
			if (error) erro = mensagemDeErro(error);
			else {
				// Sem o caminho no DPO, ninguém mais lê o arquivo; apagar do Storage é limpeza.
				if (arquivo) await supabase.storage.from('dpos').remove([arquivo]);
				mensagem = t('DPO retirado. A delegação vê o motivo e pode enviar de novo.');
			}
		}
		if (!erro) modal?.fechar();
		await invalidate('app:dpo');
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
<p class="suave">
	{t('Cada delegação envia um PDF por tópico, de até 5 MB. Assim que chega, o comitê inteiro pode ler.')}
	{#if data.prazo}{t('Prazo:')} <Quando iso={data.prazo} />.{/if}
</p>

<!-- Com o modal aberto, o erro aparece dentro dele. -->
{#if erro && !acao}<p class="erro" role="alert">{erro}</p>{/if}
{#if mensagem}<p class="sucesso" role="status">{mensagem}</p>{/if}

{#if eu}
	<section aria-labelledby="t-meu-dpo">
		<h2 id="t-meu-dpo">{t('Meu DPO')}</h2>
		<div class="cartoes">
			{#each data.comite.topicos as titulo, i (titulo)}
				{@const topico = i + 1}
				{@const d = meu(topico)}
				{@const comentario = d && data.comentarios.get(d.id)}
				<section class="cartao" aria-labelledby={`t-dpo-${topico}`}>
					<h3 id={`t-dpo-${topico}`}>{t('Tópico')} {topico}: {titulo}</h3>
					<p class="cabecalho-documento">
						{#if enviado(d) || d?.status === 'retirado'}
							<span class="selo {STATUS[d!.status].selo}">{STATUS[d!.status].rotulo}</span>
						{:else}
							<span class="selo">{t('Não enviado')}</span>
						{/if}
						{#if d?.enviado_em && enviado(d)}
							<span class="detalhe">{t('enviado')} <Quando iso={d.enviado_em} /></span>
							{#if atrasado(d)}<span class="selo selo--alerta">{t('depois do prazo')}</span>{/if}
						{/if}
					</p>
					{#if comentario}
						<p class="telegrama" role="note" aria-label={t('Comentário da mesa')}>{comentario}</p>
					{/if}
					{#if d && d.envios.length > 1}
						<p class="detalhe">
							{t('Envios anteriores:')}
							{#each d.envios.slice(0, -1) as quando, n (n)}{#if n}, {/if}<Quando iso={quando} />{/each}
						</p>
					{/if}
					{#if d && !d.arquivo && d.texto.trim()}
						<p class="suave">{t('Há um texto escrito no app antes de o DPO virar arquivo. Envie o PDF para o comitê ler.')}</p>
					{/if}
					<div class="acoes">
						<label class={['botao', enviado(d) && 'botao--secundario']} {@attach dica(t('Escolher no seu aparelho um PDF de até 5 MB para este tópico.'))}>
							<FileUp aria-hidden="true" size={18} strokeWidth={1.75} />
							{enviando === topico ? t('Enviando…') : d?.arquivo ? t('Trocar o PDF') : t('Enviar o PDF')}
							<input
								class="so-leitor"
								type="file"
								accept="application/pdf"
								aria-label={`${d?.arquivo ? t('Trocar o PDF') : t('Enviar o PDF')}: ${t('Tópico')} ${topico}`}
								disabled={enviando !== null}
								onchange={(e) => enviar(topico, e)}
							/>
						</label>
						{#if d?.arquivo && data.links.get(d.arquivo)}
							<a
								class="botao botao--secundario"
								href={data.links.get(d.arquivo)}
								target="_blank"
								rel="noopener"
								{@attach dica(t('O arquivo abre numa aba nova do navegador.'))}
								><FileText aria-hidden="true" size={18} strokeWidth={1.75} /> {t('Abrir o PDF')}</a
							>
						{:else if d?.texto.trim()}
							<button
								class="botao botao--secundario"
								type="button"
								{@attach dica(t('Uma prévia ao lado, sem sair desta tela.'))}
								onclick={() => abrirPrevia('dpo', d.id)}>{t('Ler o texto')}</button>
						{/if}
					</div>
				</section>
			{/each}
		</div>
	</section>
{/if}

<section aria-labelledby="t-dpos">
	<h2 id="t-dpos">{t('DPOs do comitê')}</h2>
	<ul class="cartoes-dpo">
		{#each outros as d (d.id)}
			<li class="cartao">
				<p><NomeDelegacao sigla={data.comite.sigla} delegacao={d.delegacao} /></p>
				<p class="detalhe">
					{t('Tópico')} {d.topico} · <span class="selo {STATUS[d.status].selo}">{STATUS[d.status].rotulo}</span>
					{#if d.enviado_em && enviado(d)}· <Quando iso={d.enviado_em} />{/if}
					{#if enviado(d) && atrasado(d)}<span class="selo selo--alerta">{t('depois do prazo')}</span>{/if}
				</p>
				<div class="acoes">
					{#if d.arquivo && data.links.get(d.arquivo)}
						<a
							class="botao botao--secundario botao--pequeno"
							href={data.links.get(d.arquivo)}
							target="_blank"
							rel="noopener"
							aria-label={`${t('Abrir o PDF')}: ${t('DPO de {delegacao}', { delegacao: d.delegacao?.nome ?? '' })}, ${t('Tópico')} ${d.topico}`}
							{@attach dica(t('O arquivo abre numa aba nova do navegador.'))}
							><FileText aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Abrir o PDF')}</a
						>
					{:else if d.texto.trim()}
						<button
							class="botao botao--secundario botao--pequeno"
							type="button"
							{@attach dica(t('Uma prévia ao lado, sem sair desta tela.'))}
							onclick={() => abrirPrevia('dpo', d.id)}>{t('Ler o texto')}</button>
					{/if}
					{#if ehMesa && d.status !== 'retirado'}
						<button
							class="botao botao--secundario botao--pequeno"
							type="button"
							aria-label={`${data.comentarios.has(d.id) ? t('Ver o comentário') : t('Comentar')}: ${t('DPO de {delegacao}', { delegacao: d.delegacao?.nome ?? '' })}, ${t('Tópico')} ${d.topico}`}
							{@attach dica(t('Um recado da mesa que só esta delegação lê.'))}
							onclick={() => abrir(d, 'comentar')}>{data.comentarios.has(d.id) ? t('Ver o comentário') : t('Comentar')}</button
						>
						<button
							class="botao botao--secundario botao--pequeno"
							type="button"
							aria-label={`${t('Retirar')}: ${t('DPO de {delegacao}', { delegacao: d.delegacao?.nome ?? '' })}, ${t('Tópico')} ${d.topico}`}
							{@attach dica(t('Tira o arquivo do comitê, com um motivo que a delegação vê.'))}
							onclick={() => abrir(d, 'retirar')}>{t('Retirar')}</button
						>
					{/if}
				</div>
			</li>
		{:else}
			<li class="suave">{t('Nenhum DPO enviado ainda.')}</li>
		{/each}
	</ul>
</section>

<Modal bind:this={modal} rotulo="t-acao-dpo" classe="modal-acao" onclose={() => (acao = null)}>
	{#if acao}
		{@const nome = t('DPO de {delegacao}', { delegacao: acao.dpo.delegacao?.nome ?? '' })}
		<h3 id="t-acao-dpo">{acao.tipo === 'comentar' ? t('Comentar') : t('Retirar')}: {nome} · {t('Tópico')} {acao.dpo.topico}</h3>
		<p class="suave">
			{acao.tipo === 'comentar'
				? t('Só a delegação lê o comentário. Deixe vazio para apagar.')
				: t('O arquivo sai do comitê e fica no registro da mesa. A delegação vê o motivo e pode enviar outro.')}
		</p>
		<label class="campo">
			{acao.tipo === 'comentar' ? t('Comentário para a delegação') : t('Motivo')}
			<textarea rows="3" maxlength="1000" bind:value={texto} {@attach contador(texto)}></textarea>
		</label>
		{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
		<div class="acoes">
			<button class="botao" type="button" onclick={confirmar}>{acao.tipo === 'comentar' ? t('Salvar') : t('Retirar o arquivo')}</button>
			<button class="botao botao--secundario" type="button" onclick={() => modal?.fechar()}>{t('Fechar')}</button>
		</div>
	{/if}
</Modal>
