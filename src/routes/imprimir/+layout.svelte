<script lang="ts">
	// O texto dos documentos usa a serifada no peso normal; o app só carrega o 600.
	import '@fontsource/spectral/latin-400.css';
	import '@fontsource/spectral/latin-400-italic.css';

	let { children } = $props();
</script>

{@render children()}
