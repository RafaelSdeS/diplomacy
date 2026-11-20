<script lang="ts">
	// Bandeiras do flag-icons (MIT). Cada SVG vira um arquivo próprio no build
	// (sem embutir no JavaScript, veja vite.config.ts) e só é baixado quando aparece.
	const arquivos: Record<string, string> = import.meta.glob('/node_modules/flag-icons/flags/4x3/*.svg', {
		query: '?url',
		import: 'default',
		eager: true
	});

	let { codigo }: { codigo: string | null | undefined } = $props();

	const src = $derived(codigo ? arquivos[`/node_modules/flag-icons/flags/4x3/${codigo}.svg`] : undefined);
</script>

<!-- Decorativa: o nome do país sempre aparece ao lado. -->
{#if src}
	<img class="bandeira" {src} alt="" width="24" height="18" loading="lazy" />
{/if}
