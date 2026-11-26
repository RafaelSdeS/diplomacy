<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { dica } from '#lib/dica.ts';
	import { formatarTempo } from '#lib/cronometro.ts';
	import { segundosAtePrazo, type Incidente } from '#lib/crise.ts';
	import Modal from '#lib/ui/Modal.svelte';

	// O alerta da crise com prazo (passo 35), compacto (passo 62): uma faixa com o título, o prazo,
	// quem foi atingido e o começo do briefing, que abre inteiro num modal. Depois do fim, o
	// desfecho fica uma linha por um minuto. No painel de quem preside (`compacta`), a faixa é uma
	// linha só, para "Com a palavra" caber na tela.
	type Props = { incidentes: Incidente[]; diferenca: number; compacta?: boolean };
	let { incidentes, diferenca, compacta = false }: Props = $props();

	let agora = $state(Date.now());
	$effect(() => {
		const relogio = setInterval(() => (agora = Date.now()), 1000);
		return () => clearInterval(relogio);
	});
	const prazo = (i: Incidente) => formatarTempo(segundosAtePrazo(i.prazo, agora + diferenca));

	let lendo = $state<string | null>(null);
	const briefing = $derived(incidentes.find((i) => i.id === lendo));
</script>

{#each incidentes as i (i.id)}
	{#if i.encerrado_em}
		<p class="cartao alerta-crise alerta-crise--encerrada">
			<span class="rotulo">{t('Crise encerrada')}</span>
			<strong>{i.titulo}</strong>
			<span>{i.desfecho === 'resolvido' ? t('Resolvida') : t('Fracassou')}{i.desfecho_texto ? `: ${i.desfecho_texto}` : ''}</span>
		</p>
	{:else}
		<article class="cartao alerta-crise" aria-labelledby={`crise-${i.id}`}>
			<div class="alerta-crise-topo">
				<p class="rotulo">{t('Crise · urgente')}</p>
				<h2 id={`crise-${i.id}`}>{i.titulo}</h2>
				<p class="alerta-crise-prazo" aria-live="off">{prazo(i)}</p>
				<button class="botao botao--secundario botao--pequeno" type="button" aria-label={t('Ler o briefing: {titulo}', { titulo: i.titulo })} onclick={() => (lendo = i.id)}
					{@attach dica(t('Abre o briefing inteiro da crise, com quem foi atingido.'))}
					>{t('Ler o briefing')}</button

				>
			</div>
			<!-- Compacta, só a linha de cima: quem foi atingido e o briefing ficam no modal. -->
			{#if !compacta}
				{#if i.efeitos.length}
					<p class="alerta-crise-resumo">
						<span class="rotulo">{t('Atingidas')}</span>
						{i.efeitos.map((e) => `${e.delegacao?.nome}: ${e.texto}`).join(' · ')}
					</p>
				{/if}
				<p class="alerta-crise-resumo">{i.texto}</p>
			{/if}
		</article>
	{/if}
{/each}

<Modal aberto={!!briefing} nome={briefing?.titulo} classe="modal-acao" onclose={() => (lendo = null)}>
	{#if briefing}
		<p class="rotulo">{briefing.encerrado_em ? t('Crise encerrada') : t('Crise · urgente')}</p>
		<h3>{briefing.titulo}</h3>
		{#if !briefing.encerrado_em}<p class="alerta-crise-prazo" aria-live="off">{prazo(briefing)}</p>{/if}
		<p class="alerta-crise-briefing">{briefing.texto}</p>
		{#if briefing.efeitos.length}
			<h4>{t('Atingidas')}</h4>
			<ul class="lista">
				{#each briefing.efeitos as e (e.delegacao_id)}
					<li><span><strong>{e.delegacao?.nome}</strong> · {e.texto}</span></li>
				{/each}
			</ul>
		{/if}
		<form method="dialog" class="acoes"><button class="botao botao--secundario">{t('Fechar')}</button></form>
	{/if}
</Modal>
