<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { medirRelogio } from '#lib/sessao.ts';
	import { assinar, TABELAS_SESSAO } from '#lib/tempo-real.ts';

	// Liga uma tela ao tempo real e mede o relógio do servidor. Cada mudança nas
	// tabelas recarrega os dados que dependem de `dependencia`.
	// - `comiteId`: o canal do comitê, mais os `canais` extras (crise, delegação);
	// - `documentoId`: o canal de um documento (tudo o que muda nele);
	// - `eventoId`: o canal do evento (a capa da press).
	type Props = {
		comiteId?: string;
		documentoId?: string;
		eventoId?: string;
		canais?: string[];
		tabelas?: string[];
		dependencia?: `${string}:${string}`;
		diferenca?: number;
		conectado?: boolean;
	};
	let {
		comiteId,
		documentoId,
		eventoId,
		canais = [],
		tabelas = TABELAS_SESSAO,
		dependencia = 'app:sessao-ao-vivo',
		diferenca = $bindable(0),
		conectado = $bindable(false)
	}: Props = $props();

	onMount(() => {
		void medirRelogio().then((d) => (diferenca = d));
	});
	// O efeito depende só desta chave de texto: um objeto `data` novo a cada recarga não
	// pode reassinar o canal (isso recarregava a tela em laço).
	const chave = $derived(JSON.stringify([documentoId ?? '', comiteId ?? '', eventoId ?? '', canais, tabelas, dependencia]));

	$effect(() => {
		const [documento, comite, evento, extras, tabs, dep] = JSON.parse(chave) as [
			string,
			string,
			string,
			string[],
			string[],
			`${string}:${string}`
		];
		// Vários avisos juntos (uma ação mexe em mais de uma tabela) viram uma recarga só.
		// Sem internet, a tela fica com o que tem; quando a conexão volta, recarrega.
		let espera: ReturnType<typeof setTimeout> | undefined;
		const aoMudar = () => {
			clearTimeout(espera);
			espera = setTimeout(() => navigator.onLine && invalidate(dep), 100);
		};
		const aoConectar = (ok: boolean) => (conectado = ok);
		const cancelar = documento
			? assinar([`documento:${documento}`], null, aoMudar, aoConectar)
			: comite
				? assinar([`comite:${comite}`, ...extras], tabs, aoMudar, aoConectar)
				: evento
					? assinar([`evento:${evento}`], tabs, aoMudar, aoConectar)
					: () => {};
		return () => {
			clearTimeout(espera);
			cancelar();
		};
	});
</script>

<span class="selo {conectado ? 'selo--ok' : 'selo--alerta'}" data-ao-vivo={conectado ? 'sim' : 'nao'}>
	{conectado ? t('Ao vivo') : t('Conectando…')}
</span>
