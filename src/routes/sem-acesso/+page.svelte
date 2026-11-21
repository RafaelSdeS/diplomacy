<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
</script>

<svelte:head>
	<title>{t('Sem acesso · UFRGSMUN')}</title>
</svelte:head>

<p class="rotulo">{t('Acesso')}</p>
<h1>{t('Sem acesso')}</h1>
<p>{t('Sua conta ainda não tem um convite para este evento. Fale com a secretaria do UFRGSMUN.')}</p>
