<script lang="ts">
	import { goto } from '$app/navigation';
	import { t } from '#lib/i18n.svelte.ts';
	import { dica } from '#lib/dica.ts';
	import { abrirFicha, abrirPrevia } from '#lib/ficha.svelte.ts';
	import { semAcento } from '#lib/filtro.ts';
	import { nomeDoDocumento } from '#lib/formatacao.ts';
	import { irPara } from '#lib/ir-para.svelte.ts';
	import { menu } from '#lib/menu.ts';
	import type { Papel } from '#lib/supabase.ts';
	import { supabase } from '#lib/supabase.ts';
	import Bandeira from './Bandeira.svelte';
	import Star from '@lucide/svelte/icons/star';
	import { alternarFavorito, favoritos, MAX_FAVORITOS } from '#lib/preferencias.svelte.ts';
	import Modal from './Modal.svelte';

	// Passo 43: achar o que se quer sem saber onde fica. Telas do papel, delegações do
	// comitê (abrem a ficha) e documentos pelo título. Passo 47: também comitês, veículos e
	// matérias (abrem a prévia). Ao abrir, só o que é leve; documentos e matérias chegam
	// quando a pessoa digita, depois de uma espera curta entre as teclas.
	type Participacao = { papel: Papel; comite_id: string | null; comite_sigla: string | null };
	let { participacoes }: { participacoes: Participacao[] } = $props();

	const comite = $derived(participacoes.find((p) => p.comite_id));
	const telas = $derived([
		...menu(participacoes).map((m) => ({ href: m.href, rotulo: m.rotulo, descricao: m.descricao })),
		{ href: '/perfil', rotulo: t('Perfil'), descricao: t('Seus dados, idioma, tema e notificações') }
	]);

	let modal = $state<Modal>();
	let busca = $state('');
	let delegacoes = $state<{ id: string; nome: string; nome_oficial: string; bandeira: string | null }[]>([]);
	let documentos = $state<{ id: string; tipo: string; numero: number | null; titulo: string }[]>([]);
	let comites = $state<{ sigla: string; nome: string }[]>([]);
	let veiculos = $state<{ id: string; nome: string; comite: { sigla: string } | null }[]>([]);
	let materias = $state<{ id: string; titulo: string; veiculo: { nome: string } | null }[]>([]);
	let pesados: Promise<void> | null = null;

	async function carregar() {
		const [d, c, v] = await Promise.all([
			comite?.comite_id
				? supabase.from('delegacao').select('id, nome, nome_oficial, bandeira').eq('comite_id', comite.comite_id).order('nome')
				: { data: [] },
			supabase.from('comite').select('sigla, nome').order('sigla'),
			supabase.from('veiculo').select('id, nome, comite(sigla)').order('nome')
		]);
		delegacoes = d.data ?? [];
		comites = c.data ?? [];
		veiculos = v.data ?? [];
	}

	// Documentos e matérias: uma leitura só, na primeira busca de verdade (duas letras ou mais).
	function carregarPesados() {
		pesados ??= Promise.all([
			comite?.comite_id
				? supabase.from('documento').select('id, tipo, numero, titulo').eq('comite_id', comite.comite_id).order('criado_em', { ascending: false }).limit(200)
				: { data: [] },
			supabase.from('noticia').select('id, titulo, veiculo(nome)').eq('status', 'publicada').order('publicada_em', { ascending: false }).limit(200)
		]).then(([docs, n]) => {
			documentos = docs.data ?? [];
			materias = n.data ?? [];
		});
	}

	$effect(() => {
		if (!irPara.aberto || !modal) return;
		busca = '';
		pesados = null; // a cada abertura, documentos e matérias frescos
		modal.abrir();
		void carregar();
	});

	const termo = $derived(semAcento(busca.trim()));
	$effect(() => {
		if (termo.length < 2 || pesados) return;
		const espera = setTimeout(carregarPesados, 250);
		return () => clearTimeout(espera);
	});
	const acha = (texto: string) => !termo || semAcento(texto).includes(termo);
	const LIMITE = 6;
	const achadas = $derived({
		telas: telas.filter((x) => acha(`${x.rotulo} ${x.descricao}`)).slice(0, LIMITE),
		delegacoes: termo ? delegacoes.filter((d) => acha(`${d.nome} ${d.nome_oficial}`)).slice(0, LIMITE) : [],
		documentos: termo ? documentos.filter((d) => acha(nomeDoDocumento(d))).slice(0, LIMITE) : [],
		comites: termo ? comites.filter((c) => acha(`${c.sigla} ${c.nome}`)).slice(0, LIMITE) : [],
		veiculos: termo ? veiculos.filter((v) => acha(v.nome)).slice(0, LIMITE) : [],
		materias: termo ? materias.filter((m) => acha(m.titulo)).slice(0, LIMITE) : []
	});
	const nada = $derived(Object.values(achadas).every((lista) => !lista.length));
	// Passo 51 (preferências): as telas favoritas ficam no topo, antes de digitar.
	const favoritas = $derived(favoritos.hrefs.flatMap((h) => telas.filter((x) => x.href === h)));
	const cheio = $derived(favoritos.hrefs.length >= MAX_FAVORITOS);

	function fechar() {
		modal?.fechar();
	}
	function abrirDelegacao(id: string) {
		fechar();
		if (comite?.comite_sigla) abrirFicha(comite.comite_sigla, id);
	}
	// Enter no campo abre o primeiro resultado.
	function primeiro(evento: SubmitEvent) {
		evento.preventDefault();
		const tela = achadas.telas[0];
		const delegacao = achadas.delegacoes[0];
		const documento = achadas.documentos[0];
		if (termo && delegacao && !tela) return abrirDelegacao(delegacao.id);
		const href = tela?.href ?? (documento ? `/documento/${documento.id}` : null);
		if (href) {
			fechar();
			void goto(href);
		}
	}
</script>

<Modal bind:this={modal} classe="ir-para" rotulo="ir-para-titulo" onclose={() => (irPara.aberto = false)}>
	<form onsubmit={primeiro} role="search">
		<label class="campo">
			<span id="ir-para-titulo">{t('Ir para…')}</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input type="search" bind:value={busca} autofocus placeholder={t('Tela, delegação, documento ou matéria')} />
		</label>
	</form>

	{#if !termo && favoritas.length}
		<h3 class="rotulo">{t('Favoritos')}</h3>
		<ul class="lista" aria-label={t('Favoritos')}>
			{#each favoritas as tela (tela.href)}
				<li><a href={tela.href} onclick={fechar}>{tela.rotulo} <span class="detalhe">{tela.descricao}</span></a></li>
			{/each}
		</ul>
	{/if}
	{#if achadas.telas.length}
		<h3 class="rotulo">{t('Telas')}</h3>
		<ul class="lista">
			{#each achadas.telas as tela (tela.href)}
				{@const favorita = favoritos.hrefs.includes(tela.href)}
				<li>
					<a href={tela.href} onclick={fechar}>{tela.rotulo} <span class="detalhe">{tela.descricao}</span></a>
					<button
						class="botao botao--secundario botao--pequeno botao--icone"
						type="button"
						aria-pressed={favorita}
						aria-label={t('Favorita: {tela}', { tela: tela.rotulo })}
						title={!favorita && cheio ? t('Até {n} favoritas: tire uma antes', { n: MAX_FAVORITOS }) : undefined}
						disabled={!favorita && cheio}
						onclick={() => alternarFavorito(tela.href)}
						{@attach dica(favorita ? t('Tira esta tela dos favoritos.') : t('Põe esta tela nos favoritos, para achar mais rápido.'))}
						><Star aria-hidden="true" size={16} strokeWidth={1.75} fill={favorita ? 'currentColor' : 'none'} /></button
					>
				</li>
			{/each}
		</ul>
	{/if}
	{#if achadas.delegacoes.length}
		<h3 class="rotulo">{t('Delegações')}</h3>
		<ul class="lista">
			{#each achadas.delegacoes as d (d.id)}
				<li>
					<button class="com-bandeira nome-delegacao nome-delegacao--ficha" type="button" onclick={() => abrirDelegacao(d.id)}
						{@attach dica(t('Abre a ficha da delegação por cima da tela, com as suas anotações.'))}
						><Bandeira codigo={d.bandeira} /> {d.nome}</button
					>
				</li>
			{/each}
		</ul>
	{/if}
	{#if achadas.documentos.length}
		<h3 class="rotulo">{t('Documentos')}</h3>
		<ul class="lista">
			{#each achadas.documentos as d (d.id)}
				<li><a href={`/documento/${d.id}`} onclick={fechar}>{nomeDoDocumento(d)}</a></li>
			{/each}
		</ul>
	{/if}
	{#if achadas.comites.length}
		<h3 class="rotulo">{t('Comitês')}</h3>
		<ul class="lista">
			{#each achadas.comites as c (c.sigla)}
				<li><a href={`/comite/${c.sigla}`} onclick={fechar}>{c.sigla} <span class="detalhe">{c.nome}</span></a></li>
			{/each}
		</ul>
	{/if}
	{#if achadas.veiculos.length}
		<h3 class="rotulo">{t('Veículos')}</h3>
		<ul class="lista">
			{#each achadas.veiculos as v (v.id)}
				<li><a href={`/press/${v.comite?.sigla}`} onclick={fechar}>{v.nome} <span class="detalhe">{v.comite?.sigla}</span></a></li>
			{/each}
		</ul>
	{/if}
	{#if achadas.materias.length}
		<h3 class="rotulo">{t('Matérias')}</h3>
		<ul class="lista">
			{#each achadas.materias as m (m.id)}
				<li>
					<button
						class="abre-ficha"
						type="button"
						{@attach dica(t('Mostra a matéria numa prévia, sem sair da página.'))}

						onclick={() => {
							fechar();
							abrirPrevia('noticia', m.id);
						}}>{m.titulo}</button
					>
					<span class="detalhe">{m.veiculo?.nome}</span>
				</li>
			{/each}
		</ul>
	{/if}
	{#if termo && nada}
		<p class="suave">{t('Nada encontrado.')}</p>
	{/if}
	<form method="dialog" class="acoes"><button class="botao botao--secundario">{t('Fechar')}</button></form>
</Modal>
