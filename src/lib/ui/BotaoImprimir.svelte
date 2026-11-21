<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	// Fica fora da impressão. No celular, "Imprimir" oferece "Salvar como PDF".
	let { voltar }: { voltar: string } = $props();
</script>

<p class="nao-imprimir acoes">
	<button class="botao" type="button" onclick={() => window.print()}>{t('Imprimir ou salvar como PDF')}</button>
	<a class="botao botao--secundario" href={voltar}>{t('Voltar')}</a>
</p>
