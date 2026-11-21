<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { formatarTempo } from '#lib/cronometro.ts';
	import { segundosAtePrazo, type Incidente } from '#lib/crise.ts';

	// O alerta da crise com prazo (passo 35): título, contagem regressiva, o que aconteceu
	// e quem foi atingido; depois do fim, o desfecho por um minuto.
	type Props = { incidentes: Incidente[]; diferenca: number };
	let { incidentes, diferenca }: Props = $props();

	let agora = $state(Date.now());
	$effect(() => {
		const relogio = setInterval(() => (agora = Date.now()), 1000);
		return () => clearInterval(relogio);
	});
</script>

{#each incidentes as i (i.id)}
	<article class="cartao alerta-crise" aria-labelledby={`crise-${i.id}`}>
		<p class="rotulo">{i.encerrado_em ? t('Crise encerrada') : t('Crise · urgente')}</p>
		<h2 id={`crise-${i.id}`}>{i.titulo}</h2>
		{#if i.encerrado_em}
			<p class="destaque">{i.desfecho === 'resolvido' ? t('Resolvida') : t('Fracassou')}{i.desfecho_texto ? `: ${i.desfecho_texto}` : ''}</p>
		{:else}
			<p class="alerta-crise-prazo" aria-live="off">{formatarTempo(segundosAtePrazo(i.prazo, agora + diferenca))}</p>
			<p>{i.texto}</p>
			{#if i.efeitos.length}
				<ul class="lista">
					{#each i.efeitos as e (e.delegacao_id)}
						<li><span><strong>{e.delegacao?.nome}</strong> · {e.texto}</span></li>
					{/each}
				</ul>
			{/if}
		{/if}
	</article>
{/each}
