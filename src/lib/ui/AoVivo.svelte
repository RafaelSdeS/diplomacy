<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { medirRelogio } from '#lib/sessao.ts';
	import { assinar, TABELAS_SESSAO } from '#lib/tempo-real.ts';

	// Liga uma tela ao tempo real e mede o relógio do servidor. Cada mudança nas
	// tabelas recarrega os dados que dependem de `dependencia`.
	// - `comiteId`: o canal do comitê, mais os `canais` extras (crise, delegação);
	// - `documentoId`: o canal de um documento (tudo o que muda nele);
	// - `eventoId`: o canal do evento (a capa da press).
	type Props = {
		comiteId?: string;
		documentoId?: string;
		eventoId?: string;
		canais?: string[];
		tabelas?: string[];
		dependencia?: `${string}:${string}`;
		diferenca?: number;
		conectado?: boolean;
	};
	let {
		comiteId,
		documentoId,
		eventoId,
		canais = [],
		tabelas = TABELAS_SESSAO,
		dependencia = 'app:sessao-ao-vivo',
		diferenca = $bindable(0),
		conectado = $bindable(false)
	}: Props = $props();

	onMount(() => {
		void medirRelogio().then((d) => (diferenca = d));
	});
	$effect(() => {
		const aoMudar = () => invalidate(dependencia);
		const aoConectar = (ok: boolean) => (conectado = ok);
		if (documentoId) return assinar([`documento:${documentoId}`], null, aoMudar, aoConectar);
		if (comiteId) return assinar([`comite:${comiteId}`, ...canais], tabelas, aoMudar, aoConectar);
		if (eventoId) return assinar([`evento:${eventoId}`], tabelas, aoMudar, aoConectar);
	});
</script>

<span class="selo {conectado ? 'selo--ok' : 'selo--alerta'}" data-ao-vivo={conectado ? 'sim' : 'nao'}>
	{conectado ? 'Ao vivo' : 'Conectando…'}
</span>
