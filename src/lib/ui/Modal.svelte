<script lang="ts">
	import type { Snippet } from 'svelte';

	// Passo 47: a base de todo modal do app. O <dialog> nativo já dá o foco inicial (o primeiro
	// botão, ou o campo com autofocus), o Escape e a volta do foco a quem abriu; aqui entram o
	// clique no fundo e o painel lateral. Quem usa abre com `abrir()` (bind:this).
	type Props = {
		rotulo: string; // id do título, que dá nome ao modal
		lateral?: boolean; // painel na lateral direita (fichas), em vez da caixa central
		classe?: string;
		onclose?: () => void;
		children: Snippet;
	};
	let { rotulo, lateral = false, classe = '', onclose, children }: Props = $props();
	let caixa = $state<HTMLDialogElement>();

	export function abrir() {
		if (caixa && !caixa.open) caixa.showModal();
	}
	export function fechar() {
		caixa?.close();
	}

	// Clique no fundo fecha, menos com texto digitado num campo (a busca não conta): ele se perderia.
	const CAMPOS = 'textarea, input:not([type]), input[type=text], input[type=email], input[type=url], input[type=number]';
	function noFundo(evento: MouseEvent) {
		if (!caixa || evento.target !== caixa) return;
		const r = caixa.getBoundingClientRect();
		const { clientX: x, clientY: y } = evento;
		if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return;
		const digitado = [...caixa.querySelectorAll<HTMLInputElement>(CAMPOS)].some((c) => c.value.trim());
		if (!digitado) caixa.close();
	}
</script>

<!-- O clique no fundo é um atalho do mouse; no teclado, o Escape faz o mesmo. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={caixa} class={[lateral && 'modal-lateral', classe]} aria-labelledby={rotulo} {onclose} onclick={noFundo}>
	{@render children()}
</dialog>
