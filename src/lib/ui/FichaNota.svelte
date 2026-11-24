<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { SELO_NOTA, STATUS_NOTA, type StatusNota } from '#lib/crise.ts';
	import Modal from './Modal.svelte';
	import Quando from './Quando.svelte';

	// Passo 47: a nota de crise inteira (texto e resposta) no painel lateral, sem mudar a URL.
	type Nota = { titulo: string; tipo: string; status: string; texto: string; resposta: string | null; criado_em: string };
	let { nota, onclose }: { nota: Nota | null | undefined; onclose: () => void } = $props();
</script>

<Modal aberto={!!nota} lateral classe="ficha" rotulo="ficha-nota" {onclose}>
	{#if nota}
		<p class="rotulo">{nota.tipo === 'diretiva' ? t('Diretiva') : t('Nota')}</p>
		<h3 id="ficha-nota">{nota.titulo}</h3>
		<p>
			<span class="selo {SELO_NOTA[nota.status as StatusNota]}">{STATUS_NOTA[nota.status as StatusNota]}</span>
			<span class="detalhe"><Quando iso={nota.criado_em} /></span>
		</p>
		<p class="ficha-texto">{nota.texto}</p>
		{#if nota.resposta}
			<h4>{t('Resposta da crise')}</h4>
			<p class="telegrama">{nota.resposta}</p>
		{/if}
	{/if}
	<div class="acoes">
		<form method="dialog"><button class="botao botao--secundario">{t('Fechar')}</button></form>
	</div>
</Modal>
