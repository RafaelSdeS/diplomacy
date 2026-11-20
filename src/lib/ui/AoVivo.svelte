<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { medirRelogio } from '#lib/sessao.ts';
	import { assinarComite, assinarDocumento, assinarEvento, TABELAS_SESSAO } from '#lib/tempo-real.ts';

	// Liga uma tela do comitê ao tempo real e mede o relógio do servidor. Cada
	// mudança nas tabelas recarrega os dados que dependem de `dependencia`.
	// Com `documentoId`, acompanha um documento em vez das tabelas do comitê; sem
	// comitê nem documento, acompanha as tabelas no evento todo (a capa da press).
	type Props = {
		comiteId?: string;
		documentoId?: string;
		tabelas?: string[];
		dependencia?: `${string}:${string}`;
		diferenca?: number;
		conectado?: boolean;
	};
	let {
		comiteId,
		documentoId,
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
		if (documentoId) return assinarDocumento(documentoId, aoMudar, aoConectar);
		if (comiteId) return assinarComite(comiteId, tabelas, aoMudar, aoConectar);
		return assinarEvento(tabelas, aoMudar, aoConectar);
	});
</script>

<span class="selo {conectado ? 'selo--ok' : 'selo--alerta'}" data-ao-vivo={conectado ? 'sim' : 'nao'}>
	{conectado ? 'Ao vivo' : 'Conectando…'}
</span>
