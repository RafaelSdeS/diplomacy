<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { contador } from '#lib/contador.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { abrirPrevia } from '#lib/ficha.svelte.ts';
	import { untrack } from 'svelte';
	import { guardarRascunho, lerRascunho } from '#lib/rascunho.ts';
	import { invalidate } from '$app/navigation';
	import { formatarQuando } from '#lib/cronograma.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Escolha from '#lib/ui/Escolha.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const eu = $derived(data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado'));
	const meusBlocos = $derived(data.blocos.filter((b) => b.membros.some((m) => m.delegacao_id === eu?.delegacao_id)));
	const agora = new Date();

	let remetente = $state(''); // vazio: a própria delegação; senão, o id do bloco
	let publica = $state(false);
	let delegacoes = $state<string[]>([]);
	let blocos = $state<string[]>([]);
	let titulo = $state('');
	const RASCUNHO = `carta:${untrack(() => data.comite.sigla)}`;
	let corpo = $state(lerRascunho(RASCUNHO));
	$effect(() => guardarRascunho(RASCUNHO, corpo));
	let erro = $state('');
	let mensagem = $state('');

	const de = (c: (typeof data.cartas)[number]) => c.bloco_remetente?.nome ?? c.remetente?.nome ?? '';
	const para = (c: (typeof data.cartas)[number]) =>
		c.publica
			? t('Todo o comitê')
			: c.destinatarios.map((d) => d.delegacao?.nome ?? d.bloco?.nome).filter(Boolean).join(', ');

	async function enviar(evento: SubmitEvent) {
		evento.preventDefault();
		erro = mensagem = '';
		const { error } = await supabase.rpc('enviar_carta', {
			p_comite: data.comite.id,
			p_titulo: titulo,
			p_corpo: corpo,
			p_publica: publica,
			p_destinatarios: publica ? [] : delegacoes,
			p_blocos_destinatarios: publica ? [] : blocos,
			p_bloco_remetente: remetente || undefined
		});
		if (error) {
			erro = mensagemDeErro(error);
			return;
		}
		mensagem = t('Carta enviada.');
		titulo = corpo = '';
		delegacoes = [];
		blocos = [];
		await invalidate('app:cartas');
	}
</script>

<svelte:head>
	<title>{tituloDaAba(t('Cartas'), data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">
	{t('Comitê')} · {data.comite.sigla}
	<AoVivo comiteId={data.comite.id} tabelas={['carta']} dependencia="app:cartas" />
</p>
<h1>{t('Cartas diplomáticas')}</h1>

{#if eu}
	<p class="acoes"><a class="botao" href="#t-escrever">{t('Escrever carta')}</a></p>
{/if}

<section aria-labelledby="t-cartas">
	<h2 id="t-cartas">{t('Cartas')}</h2>
	<ul class="lista">
		{#each data.cartas as c (c.id)}
			<li>
				<span>
					<strong><button class="abre-ficha" type="button" onclick={() => abrirPrevia('carta', c.id)}>{c.titulo}</button></strong>
					{#if c.publica}<span class="selo selo--info">{t('Pública')}</span>{/if}
					<span class="detalhe">{t('De')} {de(c)} · {t('para')} {para(c)} · {formatarQuando(c.enviada_em, agora)}</span>
				</span>
				<a class="botao botao--secundario botao--pequeno" href={`/imprimir/carta/${c.id}`} aria-label={`Abrir e imprimir a carta "${c.titulo}"`}>{t('Abrir')}</a>
			</li>
		{:else}
			<li class="suave">{t('Nenhuma carta ainda.')}</li>
		{/each}
	</ul>
</section>

{#if eu}
	<section aria-labelledby="t-escrever">
		<h2 id="t-escrever">{t('Escrever carta')}</h2>
		<form class="formulario formulario--largo" onsubmit={enviar}>
			<label class="campo">
				{t('Em nome de')}
				<select bind:value={remetente}>
					<option value="">{eu.delegacao_nome}</option>
					{#each meusBlocos as b (b.id)}
						<option value={b.id}>{b.nome}</option>
					{/each}
				</select>
			</label>
			<label class="opcao"><input type="checkbox" bind:checked={publica} /> {t('Carta pública (todo o comitê lê)')}</label>
			{#if !publica}
				<Escolha
					rotulo={t('Para as delegações')}
					botao={t('Escolher')}
					opcoes={data.delegacoes.filter((d) => d.id !== eu.delegacao_id)}
					bind:escolhidos={delegacoes}
				/>
				{#if data.blocos.length}
					<Escolha rotulo={t('Para os blocos')} botao={t('Escolher')} opcoes={data.blocos} bind:escolhidos={blocos} />
				{/if}
			{/if}
			<label class="campo">
				{t('Título')}
				<input required maxlength="200" bind:value={titulo} {@attach contador(titulo)} />
			</label>
			<label class="campo">
				{t('Carta')}
				<textarea required maxlength="8000" rows="8" bind:value={corpo} {@attach contador(corpo)}></textarea>
			</label>
			{#if erro}
				<p class="erro" role="alert">{erro}</p>
			{/if}
			{#if mensagem}
				<p class="sucesso" role="status">{mensagem}</p>
			{/if}
			<button class="botao">{t('Enviar carta')}</button>
		</form>
	</section>
{/if}
