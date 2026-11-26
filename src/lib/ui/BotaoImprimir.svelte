<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { dica } from '#lib/dica.ts';
	// Fica fora da impressão. No celular, "Imprimir" oferece "Salvar como PDF".
	let { voltar }: { voltar: string } = $props();
</script>

<p class="nao-imprimir acoes">
	<button class="botao" type="button" onclick={() => window.print()} {@attach dica(t('Abre a janela de impressão do navegador para esta página.'))}>
{t('Imprimir ou salvar como PDF')}</button>
	<a class="botao botao--secundario" href={voltar}>{t('Voltar')}</a>
</p>
