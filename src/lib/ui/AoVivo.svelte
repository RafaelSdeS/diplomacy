<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { medirRelogio } from '#lib/sessao.ts';
	import { assinarComite, TABELAS_SESSAO } from '#lib/tempo-real.ts';

	// Liga uma tela do comitê ao tempo real e mede o relógio do servidor. Cada
	// mudança nas tabelas recarrega os dados que dependem de `dependencia`.
	type Props = {
		comiteId: string;
		tabelas?: string[];
		dependencia?: `${string}:${string}`;
		diferenca?: number;
		conectado?: boolean;
	};
	let {
		comiteId,
		tabelas = TABELAS_SESSAO,
		dependencia = 'app:sessao-ao-vivo',
		diferenca = $bindable(0),
		conectado = $bindable(false)
	}: Props = $props();

	onMount(() => {
		void medirRelogio().then((d) => (diferenca = d));
	});
	$effect(() =>
		assinarComite(
			comiteId,
			tabelas,
			() => invalidate(dependencia),
			(ok) => (conectado = ok)
		)
	);
</script>

<span class="selo {conectado ? 'selo--ok' : 'selo--alerta'}" data-ao-vivo={conectado ? 'sim' : 'nao'}>
	{conectado ? 'Ao vivo' : 'Conectando…'}
</span>
