<script lang="ts">
	// Fica fora da impressão. No celular, "Imprimir" oferece "Salvar como PDF".
	let { voltar }: { voltar: string } = $props();
</script>

<p class="nao-imprimir acoes">
	<button class="botao" type="button" onclick={() => window.print()}>Imprimir ou salvar como PDF</button>
	<a class="botao botao--secundario" href={voltar}>Voltar</a>
</p>
