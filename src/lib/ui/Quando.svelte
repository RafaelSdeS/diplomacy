<script lang="ts">
	import { locale } from '#lib/i18n.svelte.ts';
	import { formatarQuando } from '#lib/cronograma.ts';
	import { horaRelativa } from '#lib/tempo.ts';

	// "Há 2 minutos", com a hora exata no title (passo 38).
	let { iso }: { iso: string } = $props();
	let agora = $state(Date.now());
	$effect(() => {
		// ponytail: um relógio por item; um relógio compartilhado se as listas ficarem enormes
		const relogio = setInterval(() => (agora = Date.now()), 30_000);
		return () => clearInterval(relogio);
	});
</script>

<time datetime={iso} title={formatarQuando(iso, new Date(agora))}>{horaRelativa(iso, agora, locale())}</time>
