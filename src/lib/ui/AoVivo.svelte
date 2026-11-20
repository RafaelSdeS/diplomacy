<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { medirRelogio } from '#lib/sessao.ts';
	import { assinarSessao } from '#lib/tempo-real.ts';

	// Liga uma tela da sessão ao tempo real e mede o relógio do servidor.
	type Props = { comiteId: string; diferenca?: number; conectado?: boolean };
	let { comiteId, diferenca = $bindable(0), conectado = $bindable(false) }: Props = $props();

	onMount(() => {
		void medirRelogio().then((d) => (diferenca = d));
	});
	$effect(() =>
		assinarSessao(
			comiteId,
			() => invalidate('app:sessao-ao-vivo'),
			(ok) => (conectado = ok)
		)
	);
</script>

<span class="selo {conectado ? 'selo--ok' : 'selo--alerta'}" data-ao-vivo={conectado ? 'sim' : 'nao'}>
	{conectado ? 'Ao vivo' : 'Conectando…'}
</span>
