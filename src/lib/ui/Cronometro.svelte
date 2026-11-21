<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { fase, formatarTempo, restanteSeg, type Cronometro } from '#lib/cronometro.ts';

	type Props = { cronometro: Cronometro; avisoSeg: number; diferenca: number; grande?: boolean };
	let { cronometro, avisoSeg, diferenca, grande = false }: Props = $props();

	let agora = $state(Date.now());
	$effect(() => {
		const relogio = setInterval(() => (agora = Date.now()), 250);
		return () => clearInterval(relogio);
	});

	const restante = $derived(restanteSeg(cronometro, agora + diferenca));
	const estado = $derived(fase(cronometro, restante, avisoSeg));
	// O aviso não depende só da cor: tem texto, e o leitor de tela é avisado uma vez.
	const TEXTOS = { parado: '', correndo: '', pausado: t('Pausado'), aviso: t('Tempo acabando'), esgotado: t('Tempo esgotado') };
</script>

<div class="cronometro cronometro--{estado}" class:cronometro--grande={grande}>
	<span class="cronometro-tempo" data-cronometro>{restante === null ? '–:––' : formatarTempo(restante)}</span>
	<span class="cronometro-fase" role="status">{TEXTOS[estado]}</span>
</div>
