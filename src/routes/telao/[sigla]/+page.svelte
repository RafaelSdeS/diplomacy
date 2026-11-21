<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { onMount } from 'svelte';
	import { FORMAS } from '#lib/sessao.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import Cronometro from '#lib/ui/Cronometro.svelte';
	import GradeVotos from '#lib/ui/GradeVotos.svelte';
	import { ETAPAS, FASES, listaAtiva, presidenciaEmVigor, textoResultado } from '#lib/votacao.ts';
	import { TABELAS_SESSAO } from '#lib/tempo-real.ts';
	import type { PageProps } from './$types';

	// O telão roda no notebook do projetor, logado com a conta da mesa, sem botões:
	// um clique (ou F) põe em tela cheia, e o Wake Lock não deixa a tela apagar.
	let { data }: PageProps = $props();
	let diferenca = $state(0);

	const sessao = $derived(data.estado?.sessao);
	const emDiscussao = $derived(sessao?.pontos.find((p) => p.status === 'em_discussao'));
	const lista = $derived(listaAtiva(data.lista, emDiscussao?.id, data.fase).filter((i) => !i.falou));
	// Os próximos: da lista de oradores em uso ou, sem lista, da fila de placas.
	const proximos = $derived(
		(lista.length ? lista.map((i) => ({ id: i.id, delegacao: i.delegacao })) : (sessao?.pedidos ?? [])).slice(0, 4)
	);
	const votacao = $derived(data.votacao?.aberta ? data.votacao : null);
	const presentes = $derived(new Set(sessao?.presenca.map((p) => p.delegacao_id)));
	const votantes = $derived(
		data.delegacoes.filter(
			(d) =>
				presentes.has(d.id) &&
				d.situacao !== 'suspensa' &&
				(votacao?.tipo !== 'substantiva' || d.situacao === 'membro')
		)
	);
	const topico = $derived(data.estado?.topico_atual ? data.comite.topicos[data.estado.topico_atual - 1] : null);

	// O plantão (crise ou nota urgente da press) fica em destaque por 5 minutos depois de publicado.
	const PLANTAO_MS = 5 * 60_000;
	let agora = $state(Date.now());
	$effect(() => {
		const relogio = setInterval(() => (agora = Date.now()), 10_000);
		return () => clearInterval(relogio);
	});
	const plantao = $derived(
		data.plantao && agora + diferenca - Date.parse(data.plantao.publicada_em) < PLANTAO_MS ? data.plantao : null
	);

	const telaCheia = () => void document.documentElement.requestFullscreen?.().catch(() => {});

	onMount(() => {
		let trava: WakeLockSentinel | undefined;
		const pedir = async () => {
			try {
				trava = await navigator.wakeLock?.request('screen');
			} catch {
				// sem permissão ou sem suporte: a tela pode apagar, nada mais
			}
		};
		const aoVoltar = () => {
			if (document.visibilityState === 'visible') void pedir();
		};
		void pedir();
		document.addEventListener('visibilitychange', aoVoltar);
		return () => {
			document.removeEventListener('visibilitychange', aoVoltar);
			void trava?.release();
		};
	});
</script>

<svelte:window onclick={telaCheia} onkeydown={(e) => e.key.toLowerCase() === 'f' && telaCheia()} />

<svelte:head>
	<title>{t('Telão')} · {data.comite.sigla} · UFRGSMUN</title>
</svelte:head>

<div class="telao">
	<header class="telao-topo">
		<div>
			<p class="telao-comite">{data.comite.sigla} · {data.comite.nome}</p>
			<h1 class="telao-sessao">
				{#if sessao && data.estado}
					{t('Sessão {n}', { n: sessao.numero })} · {data.fase === 'plenaria'
						? ETAPAS[data.estado.etapa_plenaria].rotulo
						: `${FASES[data.fase]} · ${FORMAS[data.estado.forma]}`}
				{:else}
					{t('Sessão não iniciada')}
				{/if}
			</h1>
			{#if topico}<p class="telao-topico">{t('Tópico em debate')}: {topico}</p>{/if}
		</div>
		<div class="telao-presidencia">
			{#if sessao}
				<span class="rotulo">{t('Presidência')}</span>
				<span>{presidenciaEmVigor(data.fase, data.estado?.mesa_assumiu, sessao.presidencia?.nome)}</span>
			{/if}
			<AoVivo comiteId={data.comite.id} tabelas={[...TABELAS_SESSAO, 'atualizacao_comite', 'noticia']} bind:diferenca />
		</div>
	</header>

	{#if plantao}
		<p class="telao-plantao" role="status"><span class="rotulo">{plantao.rotulo}</span> {plantao.texto}</p>
	{/if}

	<section class="telao-orador" aria-label={t('Com a palavra')}>
		{#if data.estado?.orador}
			<Bandeira codigo={data.estado.orador.bandeira} />
			<p class="telao-nome">{data.estado.orador.nome}</p>
		{:else}
			<p class="telao-nome telao-nome--vazio">{sessao ? t('Aguardando orador') : 'UFRGSMUN'}</p>
		{/if}
		{#if data.estado}
			<Cronometro cronometro={data.estado} avisoSeg={data.regras.aviso_fala_seg} {diferenca} grande />
		{/if}
	</section>

	{#if votacao}
		<aside class="telao-fila telao-votacao" aria-label={t('Votação')}>
			<p class="rotulo">{votacao.nominal ? "Votação nominal" : "Votação"} · {votacao.objeto}</p>
			<GradeVotos delegacoes={votantes} votos={votacao.votos} />
		</aside>
	{:else}
		<aside class="telao-fila" aria-label={t('Próximos oradores')}>
			{#if data.votacao && !data.votacao.aberta}
				<p class="telao-resultado">{data.votacao.objeto}. {textoResultado(data.votacao)}</p>
			{/if}
			<p class="rotulo">{lista.length ? (emDiscussao ? t('Lista especial') : t('Lista de oradores')) : t('Próximos')}</p>
			<ol>
				{#each proximos as item (item.id)}
					<li class="com-bandeira"><Bandeira codigo={item.delegacao?.bandeira} /> {item.delegacao?.nome}</li>
				{:else}
					<li class="telao-vazio">{t('Nenhuma placa levantada')}</li>
				{/each}
			</ol>
		</aside>
	{/if}
</div>
