<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { caixa } from '#lib/caixa.ts';
	import type { Item } from '#lib/caixa-de-saida.ts';
	import { adiadas, adiar, desfazer } from '#lib/desfazer.svelte.ts';
	import Modal from './Modal.svelte';
	import Quando from './Quando.svelte';

	// Passo 47: o aviso "N para enviar" abre a lista do que espera a rede, para enviar agora
	// ou desistir de um item (com desfazer, porque o texto se perderia).
	let { pendentes }: { pendentes: number } = $props();
	let modal = $state<Modal>();
	let itens = $state<Item[]>([]);
	let enviando = $state(false);

	const ler = async () => void (itens = (await caixa.pendentes()).sort((a, b) => a.criadoEm - b.criadoEm));
	$effect(() => caixa.ouvir(() => void ler()));

	async function abrir() {
		await ler();
		modal?.abrir();
	}
	async function enviarAgora() {
		enviando = true;
		await caixa.reenviar().catch(() => {});
		enviando = false;
		await ler();
		if (!itens.length) modal?.fechar();
	}
</script>

<!-- Montado sempre: o modal aberto continua quando o último item sai. -->
{#if pendentes}
	<button class="selo selo--info selo--botao" type="button" onclick={abrir}>{t('{n} para enviar', { n: pendentes })}</button>
{/if}
<Modal bind:this={modal} rotulo="caixa-titulo">
	<h3 id="caixa-titulo">{t('Não enviados')}</h3>
	<p class="suave">{t('Ficaram neste aparelho e vão sozinhos quando a internet voltar.')}</p>
	<ul class="lista">
		{#each itens as item (item.id)}
			<li>
				<span>{item.rotulo} <span class="detalhe"><Quando iso={new Date(item.criadoEm).toISOString()} /></span></span>
				{#if adiadas[item.id]}
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => desfazer(item.id)}>{t('Desfazer')}</button>
				{:else}
					<button
						class="botao botao--secundario botao--pequeno"
						type="button"
						aria-label={`${t('Remover')}: ${item.rotulo}`}
						onclick={() => adiar(item.id, () => caixa.remover(item.id))}>{t('Remover')}</button
					>
				{/if}
			</li>
		{:else}
			<li class="suave">{t('Nada esperando.')}</li>
		{/each}
	</ul>
	<div class="acoes">
		<button class="botao" type="button" disabled={enviando || !itens.length} onclick={enviarAgora}>{t('Enviar agora')}</button>
		<form method="dialog"><button class="botao botao--secundario">{t('Fechar')}</button></form>
	</div>
</Modal>
