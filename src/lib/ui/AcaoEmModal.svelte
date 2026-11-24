<script lang="ts">
	import type { Snippet } from 'svelte';
	import type House from '@lucide/svelte/icons/house';
	import Modal from './Modal.svelte';

	// Passo 51 (lote 0): criar algo é um botão com ícone e verbo, e o formulário abre num
	// modal no centro, com título e explicação. A tela fica com o conteúdo dela. Quem usa
	// fecha com `fechar()` (bind:this) depois de salvar; o rascunho continua guardado.
	type Props = {
		rotulo: string;
		icone: typeof House;
		titulo?: string;
		descricao?: string;
		secundario?: boolean;
		children: Snippet;
	};
	let { rotulo, icone: Icone, titulo, descricao, secundario = false, children }: Props = $props();
	let modal = $state<Modal>();
	const id = $props.id();

	export function abrir() {
		modal?.abrir();
	}
	export function fechar() {
		modal?.fechar();
	}
</script>

<button class={['botao', secundario && 'botao--secundario']} type="button" onclick={abrir}
	><Icone aria-hidden="true" size={18} strokeWidth={1.75} /> {rotulo}</button
>
<Modal bind:this={modal} rotulo={id} classe="modal-acao">
	<h3 {id}>{titulo ?? rotulo}</h3>
	{#if descricao}<p class="suave">{descricao}</p>{/if}
	{@render children()}
</Modal>
