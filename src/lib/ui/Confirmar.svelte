<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { dica } from '#lib/dica.ts';
	import Modal from './Modal.svelte';

	// Um botão para o que não tem volta (passo 38): abre a confirmação num <dialog>.
	type Props = { rotulo: string; pergunta: string; explicacao?: string; dica?: string; classe?: string; acao: () => unknown };
	let { rotulo, pergunta, explicacao, dica: dicaDoBotao, classe = 'botao', acao }: Props = $props();
	let modal = $state<Modal>();
	const id = $props.id();
</script>

<!-- Passo 62 (lote 6): a dica do botão é a explicação da confirmação (ou a dica dada). -->
<button class={classe} type="button" onclick={() => modal?.abrir()} {@attach dica(dicaDoBotao ?? explicacao)}>{rotulo}</button>
<Modal bind:this={modal} rotulo={id}>
	<h3 {id}>{pergunta}</h3>
	{#if explicacao}<p>{explicacao}</p>{/if}
	<form method="dialog" class="acoes">
		<button class="botao" onclick={() => acao()}>{rotulo}</button>
		<button class="botao botao--secundario">{t('Cancelar')}</button>
	</form>
</Modal>
