<script lang="ts">
	// O texto dos documentos usa a serifada no peso normal; o app só carrega o 600.
	import '@fontsource/source-serif-4/latin-400.css';
	import '@fontsource/source-serif-4/latin-400-italic.css';

	let { children } = $props();
</script>

{@render children()}
