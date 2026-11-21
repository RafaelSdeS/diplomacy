<script lang="ts">
	import { goto } from '$app/navigation';
	import { t } from '#lib/i18n.svelte.ts';
	import { abrirFicha } from '#lib/ficha.svelte.ts';
	import { semAcento } from '#lib/filtro.ts';
	import { nomeDoDocumento } from '#lib/formatacao.ts';
	import { irPara } from '#lib/ir-para.svelte.ts';
	import { menu } from '#lib/menu.ts';
	import type { Papel } from '#lib/supabase.ts';
	import { supabase } from '#lib/supabase.ts';
	import Bandeira from './Bandeira.svelte';

	// Passo 43: achar o que se quer sem saber onde fica. Telas do papel, delegações do
	// comitê (abrem a ficha) e documentos pelo título. Uma consulta ao abrir.
	type Participacao = { papel: Papel; comite_id: string | null; comite_sigla: string | null };
	let { participacoes }: { participacoes: Participacao[] } = $props();

	const comite = $derived(participacoes.find((p) => p.comite_id));
	const telas = $derived([
		...menu(participacoes).map((m) => ({ href: m.href, rotulo: m.rotulo, descricao: m.descricao })),
		{ href: '/perfil', rotulo: t('Perfil'), descricao: t('Seus dados, idioma, tema e notificações') }
	]);

	let caixa = $state<HTMLDialogElement>();
	let busca = $state('');
	let delegacoes = $state<{ id: string; nome: string; nome_oficial: string; bandeira: string | null }[]>([]);
	let documentos = $state<{ id: string; tipo: string; numero: number | null; titulo: string }[]>([]);

	async function carregar() {
		if (!comite?.comite_id) return;
		const [d, docs] = await Promise.all([
			supabase.from('delegacao').select('id, nome, nome_oficial, bandeira').eq('comite_id', comite.comite_id).order('nome'),
			supabase.from('documento').select('id, tipo, numero, titulo').eq('comite_id', comite.comite_id).order('criado_em', { ascending: false }).limit(200)
		]);
		delegacoes = d.data ?? [];
		documentos = docs.data ?? [];
	}

	$effect(() => {
		if (!irPara.aberto || !caixa) return;
		busca = '';
		if (!caixa.open) caixa.showModal();
		void carregar();
	});

	const termo = $derived(semAcento(busca.trim()));
	const acha = (texto: string) => !termo || semAcento(texto).includes(termo);
	const LIMITE = 6;
	const achadas = $derived({
		telas: telas.filter((x) => acha(`${x.rotulo} ${x.descricao}`)).slice(0, LIMITE),
		delegacoes: termo ? delegacoes.filter((d) => acha(`${d.nome} ${d.nome_oficial}`)).slice(0, LIMITE) : [],
		documentos: termo ? documentos.filter((d) => acha(nomeDoDocumento(d))).slice(0, LIMITE) : []
	});

	function fechar() {
		caixa?.close();
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

<dialog bind:this={caixa} class="ir-para" aria-labelledby="ir-para-titulo" onclose={() => (irPara.aberto = false)}>
	<form onsubmit={primeiro} role="search">
		<label class="campo">
			<span id="ir-para-titulo">{t('Ir para…')}</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input type="search" bind:value={busca} autofocus placeholder={t('Tela, delegação ou documento')} />
		</label>
	</form>

	{#if achadas.telas.length}
		<h3 class="rotulo">{t('Telas')}</h3>
		<ul class="lista">
			{#each achadas.telas as tela (tela.href)}
				<li><a href={tela.href} onclick={fechar}>{tela.rotulo} <span class="detalhe">{tela.descricao}</span></a></li>
			{/each}
		</ul>
	{/if}
	{#if achadas.delegacoes.length}
		<h3 class="rotulo">{t('Delegações')}</h3>
		<ul class="lista">
			{#each achadas.delegacoes as d (d.id)}
				<li>
					<button class="com-bandeira nome-delegacao nome-delegacao--ficha" type="button" onclick={() => abrirDelegacao(d.id)}
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
	{#if termo && !achadas.telas.length && !achadas.delegacoes.length && !achadas.documentos.length}
		<p class="suave">{t('Nada encontrado.')}</p>
	{/if}
	<form method="dialog" class="acoes"><button class="botao botao--secundario">{t('Fechar')}</button></form>
</dialog>
