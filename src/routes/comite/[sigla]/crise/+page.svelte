<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import Quando from '#lib/ui/Quando.svelte';
	import { contador } from '#lib/contador.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { untrack } from 'svelte';
	import { guardarRascunho, lerRascunho } from '#lib/rascunho.ts';
	import { invalidate } from '$app/navigation';
	import { caixa, mensagemDoEnvio } from '#lib/caixa.ts';
	import { formatarEspera, minutosDesde, SELO_NOTA, STATUS_NOTA, type StatusNota } from '#lib/crise.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import { TABELAS_CRISE } from '#lib/tempo-real.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const eu = $derived(data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado'));
	let tipo = $state<'nota' | 'diretiva'>('nota');
	let titulo = $state('');
	const RASCUNHO = `nota-crise:${untrack(() => data.comite.sigla)}`;
	let texto = $state(lerRascunho(RASCUNHO));
	$effect(() => guardarRascunho(RASCUNHO, texto));
	let erro = $state('');
	let mensagem = $state('');
	let enviando = $state(false);
	// O id nasce com o rascunho: se a rede cair no envio, reenviar não duplica a nota.
	let id = $state(crypto.randomUUID());
	// O tempo de espera anda sozinho.
	let agora = $state(Date.now());
	$effect(() => {
		const relogio = setInterval(() => (agora = Date.now()), 30_000);
		return () => clearInterval(relogio);
	});

	async function enviar(evento: SubmitEvent) {
		evento.preventDefault();
		erro = mensagem = '';
		enviando = true;
		// Pela caixa de saída: sem internet, a nota fica no aparelho e vai sozinha depois.
		const resultado = await caixa.enviar({
			id,
			rpc: 'enviar_nota',
			args: { p_id: id, p_comite: data.comite.id, p_tipo: tipo, p_titulo: titulo, p_texto: texto },
			rotulo: `${tipo === 'nota' ? t('Nota') : t('Diretiva')}: ${titulo}`
		});
		enviando = false;
		({ erro, mensagem } = mensagemDoEnvio(resultado, tipo === 'nota' ? t('Nota enviada à crise.') : t('Diretiva enviada à crise.')));
		if (erro) return;
		titulo = texto = '';
		id = crypto.randomUUID();
		await invalidate('app:crise');
	}
</script>

<svelte:head>
	<title>{tituloDaAba(t('Crise'), data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">
	{t('Comitê')} · {data.comite.sigla}
	<AoVivo
		comiteId={data.comite.id}
		canais={eu?.delegacao_id ? [`delegacao:${eu.delegacao_id}`] : []}
		tabelas={TABELAS_CRISE}
		dependencia="app:crise"
	/>
</p>
<h1>{t('Crise')}</h1>

{#if !data.comite.crise_ligada}
	<p class="suave">{t('Este comitê não tem crise.')}</p>
{:else}
	{#if data.atualizacoes.length}
		<section aria-labelledby="t-plantao">
			<h2 id="t-plantao">{t('Atualizações de crise')}</h2>
			<ul class="lista">
				{#each data.atualizacoes as a (a.id)}
					<li>
						<span>
							{a.texto}
							<span class="detalhe"><Quando iso={a.publicada_em} /></span>
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if eu}
		<section aria-labelledby="t-escrever">
			<h2 id="t-escrever">{t('Escrever à crise')}</h2>
			<form class="formulario formulario--largo" onsubmit={enviar}>
				<fieldset class="opcoes">
					<legend>{t('Tipo')}</legend>
					<label class="opcao"><input type="radio" value="nota" bind:group={tipo} /> {t('Nota (pergunta ou pedido)')}</label>
					<label class="opcao"><input type="radio" value="diretiva" bind:group={tipo} /> {t('Diretiva (ação da delegação)')}</label>
				</fieldset>
				<label class="campo">
					{t('Título')}
					<input required maxlength="120" bind:value={titulo} {@attach contador(titulo)} />
				</label>
				<label class="campo">
					{t('Texto')}
					<textarea required maxlength="2000" rows="6" bind:value={texto} {@attach contador(texto)}></textarea>
				</label>
				{#if erro}
					<p class="erro" role="alert">{erro}</p>
				{/if}
				{#if mensagem}
					<p class="sucesso" role="status">{mensagem}</p>
				{/if}
				<button class="botao" disabled={enviando}>{t('Enviar à crise')}</button>
			</form>
			<p class="suave">
				{t('Cada delegação pode ter até {n} notas esperando resposta. Só a sua delegação e a equipe de crise leem as suas notas.', {
					n: data.regras.limite_notas_pendentes
				})}
			</p>
		</section>

		<section aria-labelledby="t-minhas">
			<h2 id="t-minhas">{t('Notas de {delegacao}', { delegacao: eu.delegacao_nome ?? '' })}</h2>
			{#if data.notasSemRede}
				<p class="vazio">{t('Sem conexão: por segurança, as notas não ficam guardadas no aparelho. Elas aparecem quando a internet voltar.')}</p>
			{/if}
			<ul class="lista">
				{#each data.notas as nota (nota.id)}
					{@const status = nota.status as StatusNota}
					<li class="nota">
						<span>
							<span class="selo {SELO_NOTA[status]}">{STATUS_NOTA[status]}</span>
							{#if nota.posicao}<span class="selo">{t('{n}ª na fila', { n: nota.posicao })}</span>{/if}
							<strong>{nota.titulo}</strong>
							<span class="detalhe"
								>{nota.tipo === 'nota' ? t('Nota') : t('Diretiva')} · {formatarEspera(minutosDesde(nota.criado_em, agora))}</span
							>
							{#if nota.resposta}
								<span class="telegrama" role="note" aria-label={t('Resposta da crise')}>{nota.resposta}</span>
							{/if}
						</span>
					</li>
				{:else}
					<li class="suave">{t('Nenhuma nota ainda.')}</li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}
