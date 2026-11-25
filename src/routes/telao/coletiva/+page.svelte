<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { formatarTempo } from '#lib/cronometro.ts';
	import { andamentoDaPauta } from '#lib/press.ts';
	import { manterTelaAcesa } from '#lib/aparelho.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import SairDoTelao from '#lib/ui/SairDoTelao.svelte';
	import type { PageProps } from './$types';

	// Passo 45, parte B: o telão da coletiva. Em "Chamando", a delegação e o veículo; a
	// pergunta só aparece em "Respondendo", depois de feita em voz alta. Sem ações.
	let { data }: PageProps = $props();
	const andamento = $derived(andamentoDaPauta(data.perguntas));
	const seguintes = $derived(data.perguntas.filter((p) => p.status === 'na_pauta').slice(0, 5));
	let agora = $state(Date.now());
	$effect(() => {
		const relogio = setInterval(() => (agora = Date.now()), 1000);
		return () => clearInterval(relogio);
	});
	$effect(manterTelaAcesa);
	function telaCheia(evento: KeyboardEvent) {
		if (evento.key.toLowerCase() === 'f') void document.documentElement.requestFullscreen?.().catch(() => {});
	}
</script>

<svelte:head>
	<title>{tituloDaAba(t('Coletiva de imprensa'))}</title>
</svelte:head>
<svelte:window onkeydown={telaCheia} />

<div class="telao telao-coletiva">
	<SairDoTelao destino="/press/coletiva" />
	<header class="telao-topo">
		<div>
			<p class="telao-comite">{t('Coletiva de imprensa')} <AoVivo eventoId={data.evento} tabelas={['coletiva', 'coletiva_pergunta']} dependencia="app:coletiva" /></p>
			<h1 class="telao-sessao">{data.coletiva?.titulo ?? t('Nenhuma coletiva aberta.')}</h1>
		</div>
	</header>

	<section class="telao-orador" aria-label={t('Com a palavra')}>
		{#if andamento.atual}
			{@const a = andamento.atual}
			<p class="rotulo">{a.status === 'chamando' ? t('Chamando') : t('Respondendo')} · {a.veiculo?.nome}</p>
			<p class="telao-nome com-bandeira"><Bandeira codigo={a.delegacao?.bandeira} /> {a.delegacao?.nome}</p>
			{#if a.status === 'respondendo'}
				{#if a.texto}<p class="telao-coletiva-pergunta">{a.texto}</p>{/if}
				<p class="telao-coletiva-tempo" data-cronometro>
					{formatarTempo(Math.max(0, Math.round((agora - Date.parse(a.resposta_iniciada_em ?? '')) / 1000)) || 0)}
				</p>
			{:else}
				<p class="telao-coletiva-aviso">{t('A pergunta é feita em voz alta.')}</p>
			{/if}
		{:else}
			<p class="telao-nome telao-nome--vazio">{data.coletiva?.aberta ? t('Aguardando a próxima pergunta') : t('Coletiva encerrada')}</p>
		{/if}
	</section>

	{#if seguintes.length}
		<aside class="telao-fila" aria-label={t('Próximas')}>
			<p class="rotulo">{t('Próximas')}</p>
			<ol>
				{#each seguintes as p (p.id)}
					<li class="com-bandeira"><Bandeira codigo={p.delegacao?.bandeira} /> {p.delegacao?.nome} <span class="detalhe">{p.veiculo?.nome}</span></li>
				{/each}
			</ol>
		</aside>
	{/if}
</div>
