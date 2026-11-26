<script lang="ts">
	// Passo 54: com o mouse mexendo, a dica da tela cheia e a saída do telão. O telão não tem
	// moldura; sem isto, só o "voltar" do navegador tirava a pessoa dali.
	import DoorOpen from '@lucide/svelte/icons/door-open';
	import { goto } from '$app/navigation';
	import { t } from '#lib/i18n.svelte.ts';
	import { dica } from '#lib/dica.ts';
	import { anterior } from '#lib/voltar.svelte.ts';

	let { destino, mexendo = $bindable(false) }: { destino: string; mexendo?: boolean } = $props();

	// Passo 38: o cursor e a dica somem depois de 3 s com o mouse parado.
	let parar: ReturnType<typeof setTimeout> | undefined;
	function mexeu() {
		mexendo = true;
		clearTimeout(parar);
		parar = setTimeout(() => (mexendo = false), 3000);
	}

	async function sair() {
		if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
		// De onde a pessoa veio; aberto direto, a sessão (ou a coletiva).
		if (anterior()) history.back();
		else await goto(destino);
	}
</script>

<svelte:window onmousemove={mexeu} />

{#if mexendo}
	<div class="telao-dica">
		<span>{t('F: tela cheia')}</span>
		<button class="botao botao--pequeno" type="button" onclick={sair}
			{@attach dica(t('Sai da tela cheia e volta para a página de antes.'))}
			><DoorOpen
 aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Sair do telão')}</button
		>
	</div>
{/if}
