<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';

	// Passo 51 ("em todos os lotes"): diz que o texto em edição está guardado no aparelho
	// (rascunho.ts), para ninguém ter medo de recarregar ou de fechar o app.
	let { texto }: { texto: string } = $props();
</script>

<p class="detalhe rascunho-guardado" aria-live="polite">{texto.trim() ? t('Rascunho guardado neste aparelho.') : ''}</p>
