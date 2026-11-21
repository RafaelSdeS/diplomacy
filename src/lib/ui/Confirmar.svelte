<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';

	// Um botão para o que não tem volta (passo 38): abre a confirmação num <dialog>.
	type Props = { rotulo: string; pergunta: string; explicacao?: string; classe?: string; acao: () => unknown };
	let { rotulo, pergunta, explicacao, classe = 'botao', acao }: Props = $props();
	let caixa = $state<HTMLDialogElement>();
	const id = $props.id();
</script>

<button class={classe} type="button" onclick={() => caixa?.showModal()}>{rotulo}</button>
<dialog bind:this={caixa} aria-labelledby={id}>
	<h3 {id}>{pergunta}</h3>
	{#if explicacao}<p>{explicacao}</p>{/if}
	<form method="dialog" class="acoes">
		<button class="botao" onclick={() => acao()}>{rotulo}</button>
		<button class="botao botao--secundario">{t('Cancelar')}</button>
	</form>
</dialog>
