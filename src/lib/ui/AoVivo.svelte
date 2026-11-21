<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { onMount } from 'svelte';
	import { medirRelogio } from '#lib/sessao.ts';
	import { assinar, recarregarAoVivo, TABELAS_SESSAO } from '#lib/tempo-real.ts';

	// Liga uma tela ao tempo real e mede o relógio do servidor. Cada mudança nas
	// tabelas recarrega os dados que dependem de `dependencia`, relendo só as leituras
	// dessas tabelas (lerAoVivo, passo 40).
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
		// Vários avisos juntos (uma ação mexe em mais de uma tabela, ou uma rajada de votos)
		// viram uma recarga só. Sem internet, a tela fica com o que tem; quando a conexão
		// volta, recarrega tudo.
		let espera: ReturnType<typeof setTimeout> | undefined;
		let mudadas: Set<string> | null = new Set();
		const aoMudar = (tabela: string | null) => {
			if (tabela === null) mudadas = null;
			else mudadas?.add(tabela);
			clearTimeout(espera);
			espera = setTimeout(() => {
				const tabelas = mudadas;
				mudadas = new Set();
				if (navigator.onLine) void recarregarAoVivo(dep, tabelas);
			}, 300);
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
