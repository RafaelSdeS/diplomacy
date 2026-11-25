<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { onMount } from 'svelte';
	import { manterTelaAcesa } from '#lib/aparelho.ts';
	import { descreverPonto, FORMAS, momentoDoDebate } from '#lib/sessao.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import Cronometro from '#lib/ui/Cronometro.svelte';
	import { relogioDebate, temDebate } from '#lib/cronometro.ts';
	import GradeVotos from '#lib/ui/GradeVotos.svelte';
	import { ETAPAS, FASES, listaAtiva, presidenciaEmVigor, textoResultado } from '#lib/votacao.ts';
	import { TABELAS_SESSAO } from '#lib/tempo-real.ts';
	import { APP, marca } from '#lib/titulo.svelte.ts';
	import { segundosAtePrazo } from '#lib/crise.ts';
	import { formatarTempo } from '#lib/cronometro.ts';
	import SairDoTelao from '#lib/ui/SairDoTelao.svelte';
	import type { PageProps } from './$types';

	// O telão roda no notebook do projetor, logado com a conta da mesa, sem botões:
	// um clique (ou F) põe em tela cheia, e o Wake Lock não deixa a tela apagar.
	let { data }: PageProps = $props();
	let diferenca = $state(0);

	const sessao = $derived(data.estado?.sessao);
	const emDiscussao = $derived(sessao?.pontos.find((p) => p.status === 'em_discussao'));
	// Um pedido esperando o bureau ou a presidência (passo 29).
	const emAnalise = $derived(sessao?.pontos.find((p) => p.status === 'aberto'));
	const lista = $derived(listaAtiva(data.lista, emDiscussao?.id, data.fase).filter((i) => !i.falou));
	// Os próximos: a lista curta da presidência (passo 30), a lista de oradores em uso
	// ou, sem nenhuma das duas, a fila de placas.
	const listaCurta = $derived((sessao?.proximos ?? []).map((p) => ({ id: p.delegacao?.id ?? '', delegacao: p.delegacao })));
	const proximos = $derived(
		(listaCurta.length
			? listaCurta
			: lista.length
				? lista.map((i) => ({ id: i.id, delegacao: i.delegacao }))
				: [...(sessao?.pedidos ?? [])].sort((a, b) => (a.delegacao?.nome ?? '').localeCompare(b.delegacao?.nome ?? ''))
		).slice(0, 4)
	);
	let agora = $state(Date.now());
	$effect(() => {
		const relogio = setInterval(() => (agora = Date.now()), 1000);
		return () => clearInterval(relogio);
	});
	const votacao = $derived(data.votacao?.aberta ? data.votacao : null);
	// Depois de encerrada, a grade com o voto de cada delegação fica 30 s na tela (passo 23).
	const VOTOS_MS = 30_000;
	const recemEncerrada = $derived(
		data.votacao && !data.votacao.aberta && data.votacao.encerrada_em
			&& agora + diferenca - Date.parse(data.votacao.encerrada_em) < VOTOS_MS
			? data.votacao
			: null
	);
	const naTela = $derived(votacao ?? recemEncerrada);
	const presentes = $derived(new Set(sessao?.presenca.map((p) => p.delegacao_id)));
	const votantes = $derived(
		data.delegacoes.filter(
			(d) =>
				presentes.has(d.id) &&
				d.situacao !== 'suspensa' &&
				(naTela?.tipo !== 'substantiva' || d.situacao === 'membro')
		)
	);
	const topico = $derived(data.estado?.topico_atual ? data.comite.topicos[data.estado.topico_atual - 1] : null);

	// O plantão (crise ou nota urgente da press) fica em destaque por 5 minutos depois de publicado.
	const PLANTAO_MS = 5 * 60_000;
	const plantao = $derived(
		data.plantao && agora + diferenca - Date.parse(data.plantao.publicada_em) < PLANTAO_MS ? data.plantao : null
	);

	const telaCheia = () => void document.documentElement.requestFullscreen?.().catch(() => {});

	onMount(manterTelaAcesa);

	// Passo 38: o cursor some com o mouse parado (SairDoTelao conta o tempo).
	let mexendo = $state(false);
</script>

<!-- Passo 54: o clique num botão (Sair do telão) não põe a tela cheia. -->
<svelte:window
	onclick={(e) => !(e.target as Element).closest('button') && telaCheia()}
	onkeydown={(e) => e.key.toLowerCase() === 'f' && telaCheia()}
/>

<svelte:head>
	<title>{tituloDaAba(t('Telão'), data.comite.sigla)}</title>
</svelte:head>

<div class="telao" class:telao--parado={!mexendo}>
	<SairDoTelao destino={`/comite/${data.comite.sigla}/sessao`} bind:mexendo />
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
			{#if data.estado && temDebate(data.estado)}
				<div class="telao-debate">
					<span class="rotulo">{FORMAS[data.estado.forma]} · {t('tempo do debate')}</span>
					<Cronometro cronometro={relogioDebate(data.estado)} avisoSeg={60} {diferenca} />
				</div>
			{/if}
		</div>
		<div class="telao-presidencia">
			{#if sessao}
				<span class="rotulo">{t('Presidência')}</span>
				<span>{presidenciaEmVigor(data.fase, data.estado?.mesa_assumiu, sessao.presidencia?.nome)}</span>
			{/if}
			<AoVivo comiteId={data.comite.id} tabelas={[...TABELAS_SESSAO, 'atualizacao_comite', 'noticia']} bind:diferenca />
		</div>
	</header>

	{#each data.incidentes as i (i.id)}
		<section class="telao-crise" aria-label={t('Crise')}>
			{#if i.encerrado_em}
				<p class="rotulo">{t('Crise encerrada')}</p>
				<p class="telao-crise-titulo">{i.titulo}</p>
				<p>{i.desfecho === 'resolvido' ? t('Resolvida') : t('Fracassou')}{i.desfecho_texto ? `: ${i.desfecho_texto}` : ''}</p>
			{:else}
				<p class="rotulo">{t('Urgente')}</p>
				<p class="telao-crise-titulo">{i.titulo}</p>
				<p class="telao-crise-prazo">{formatarTempo(segundosAtePrazo(i.prazo, agora + diferenca))}</p>
				<p>{i.texto}</p>
				{#each i.efeitos as e (e.delegacao_id)}
					<p class="telao-crise-efeito"><strong>{e.delegacao?.nome}</strong> · {e.texto}</p>
				{/each}
			{/if}
		</section>
	{/each}
	{#if plantao}
		<p class="telao-plantao" role="status"><span class="rotulo">{plantao.rotulo}</span> {plantao.texto}</p>
	{/if}
	{#if data.estado && momentoDoDebate(data.estado, agora + diferenca) === 'pausa'}
		<p class="telao-pausa" role="status">{t('Há pontos ou moções?')}</p>
	{/if}
	{#if emAnalise}
		<p class="telao-analise"><span class="rotulo">{t('Em análise')}</span> {descreverPonto(emAnalise)} · {emAnalise.delegacao?.nome}</p>
	{/if}

	<section class="telao-orador" aria-label={t('Com a palavra')}>
		{#if data.estado?.orador}
			<Bandeira codigo={data.estado.orador.bandeira} />
			<p class="telao-nome">{data.estado.orador.nome}</p>
		{:else}
			<p class="telao-nome telao-nome--vazio">{sessao ? t('Aguardando orador') : (marca.evento ?? APP)}</p>
		{/if}
		{#if data.estado}
			<Cronometro cronometro={data.estado} avisoSeg={data.regras.aviso_fala_seg} {diferenca} grande />
		{/if}
	</section>

	{#if naTela}
		<aside class="telao-fila telao-votacao" aria-label={t('Votação')}>
			{#if naTela.aberta}
				<p class="rotulo">{naTela.nominal ? t('Votação nominal') : t('Votação')} · {naTela.objeto}</p>
			{:else}
				<p class="telao-resultado">{naTela.objeto}. {textoResultado(naTela)}</p>
			{/if}
			<GradeVotos delegacoes={votantes} votos={naTela.votos} encerrada={!naTela.aberta} />
		</aside>
	{:else}
		<aside class="telao-fila" aria-label={t('Próximos oradores')}>
			{#if data.votacao && !data.votacao.aberta}
				<p class="telao-resultado">{data.votacao.objeto}. {textoResultado(data.votacao)}</p>
			{/if}
			<p class="rotulo">{listaCurta.length ? t('Próximos') : lista.length ? (emDiscussao ? t('Lista especial') : t('Lista de oradores')) : t('Placas levantadas')}</p>
			<svelte:element this={listaCurta.length || lista.length ? 'ol' : 'ul'}>
				{#each proximos as item (item.id)}
					<li class="com-bandeira"><Bandeira codigo={item.delegacao?.bandeira} /> {item.delegacao?.nome}</li>
				{:else}
					<li class="telao-vazio">{t('Nenhuma placa levantada')}</li>
				{/each}
			</svelte:element>
		</aside>
	{/if}
</div>
