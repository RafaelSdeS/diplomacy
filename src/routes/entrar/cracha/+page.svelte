<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { entrarComCodigo } from '#lib/credenciais.ts';

	// O QR do crachá aponta para /entrar/cracha#<código>: depois do "#", o código não
	// vai ao servidor nem fica em logs. Ele sai da barra de endereço assim que é lido.
	let erro = $state('');

	onMount(async () => {
		const codigo = decodeURIComponent(location.hash.slice(1));
		history.replaceState(null, '', location.pathname);
		if (!codigo) {
			erro = t('Este endereço não tem o código do crachá. Leia o QR de novo ou entre de outro jeito.');
			return;
		}
		const falha = await entrarComCodigo(codigo);
		if (falha) erro = falha;
		else await goto('/', { invalidateAll: true, replaceState: true });
	});
</script>

<svelte:head>
	<title>{t('Entrar pelo crachá · UFRGSMUN')}</title>
</svelte:head>

<p class="rotulo">{t('Acesso')}</p>
<h1>{t('Entrar pelo crachá')}</h1>
{#if erro}
	<p class="erro" role="alert">{erro}</p>
	<p><a href="/entrar">{t('Entrar de outro jeito')}</a></p>
{:else}
	<p class="suave" role="status">{t('Entrando…')}</p>
{/if}
