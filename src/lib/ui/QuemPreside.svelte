<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { bureauPreside } from '#lib/sessao.ts';
	import Gavel from '@lucide/svelte/icons/gavel';
	import Bandeira from './Bandeira.svelte';

	// Passo 51 (lote 0b): quem preside a sessão, à vista de todos, com a bandeira. Para a
	// delegação que preside, o aviso é dela e leva ao painel.
	type Props = {
		fase: string;
		mesaAssumiu: boolean | null | undefined;
		presidencia: { id: string; nome: string; bandeira: string | null } | null | undefined;
		minhaDelegacao?: string | null;
		sigla: string;
	};
	let { fase, mesaAssumiu, presidencia, minhaDelegacao = null, sigla }: Props = $props();
	const pelaMesa = $derived(bureauPreside(fase, mesaAssumiu, presidencia?.id));
	const souEu = $derived(!pelaMesa && !!minhaDelegacao && presidencia?.id === minhaDelegacao);
</script>

<p class={['quem-preside', souEu && 'quem-preside--eu']}>
	<Gavel aria-hidden="true" size={18} strokeWidth={1.75} />
	{#if souEu}
		<strong>{t('Sua delegação preside a sessão')}</strong>
		<a class="botao botao--pequeno" href={`/comite/${sigla}/sessao/presidencia`}>{t('Abrir o painel')}</a>
	{:else}
		<span>{t('Preside a sessão')}:</span>
		<strong class="com-bandeira">
			{#if pelaMesa}{t('Mesa')}{:else}<Bandeira codigo={presidencia?.bandeira} /> {presidencia?.nome}{/if}
		</strong>
	{/if}
</p>
