<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import Confirmar from '#lib/ui/Confirmar.svelte';
	import { bilingue, t } from '#lib/i18n.svelte.ts';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import { dica } from '#lib/dica.ts';
	import { doTopico } from '#lib/ordem.ts';
	import { preenchidos } from '#lib/itens.ts';
	import type { ItemEsboco } from '#lib/votacao.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import EditorDeItens from '#lib/ui/EditorDeItens.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import NomeDelegacao from '#lib/ui/NomeDelegacao.svelte';
	import TrilhaDoTopico from '#lib/ui/TrilhaDoTopico.svelte';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import Eraser from '@lucide/svelte/icons/eraser';
	import FileText from '@lucide/svelte/icons/file-text';
	import ListPlus from '@lucide/svelte/icons/list-plus';
	import PencilLine from '@lucide/svelte/icons/pencil-line';
	import type { PageProps } from './$types';

	// Passo 60: a agenda parte do documento do bureau. A mesa cadastra a agenda de cada tópico
	// e a libera no dia; as delegações propõem alterações por item, todas debatem e marcam
	// apoio, ressalva ou contra, e, havendo consenso, a presidência da sessão ou a mesa inclui a
	// alteração (ajuste de 25/11/2026).
	let { data }: PageProps = $props();

	type Proposta = (typeof data.propostas)[number];
	type Ponto = Proposta['pontos'][number];
	type Alteracao = (typeof data.alteracoes)[number];
	const ANDAMENTO = bilingue({ pendente: 'Pendente', em_debate: 'Em debate', debatido: 'Debatido' } as const);
	const POSICOES = { apoio: t('Apoio'), ressalva: t('Ressalva'), contra: t('Contra') } as const;
	type Posicao = keyof typeof POSICOES;
	const SELO_POSICAO: Record<Posicao, string> = { apoio: 'selo--ok', ressalva: 'selo--alerta', contra: 'selo--erro' };

	const eu = $derived(data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado'));
	const ehMesa = $derived(
		data.participacoes.some((p) => (p.papel === 'mesa' && p.comite_id === data.comite.id) || p.papel === 'secretaria')
	);
	const podeAlterar = $derived(!!eu || ehMesa);
	const minhaVoz = $derived(eu?.delegacao_id ?? null);

	// O tópico da aba: o da URL (a trilha leva a ele), o em debate ou o primeiro.
	const topico = $derived(Number(page.url.searchParams.get('topico')) || data.topicoAtual || data.topicos[0]?.numero || 1);
	const titulo = $derived(data.topicos.find((tp) => tp.numero === topico)?.titulo ?? '');
	const base = $derived(data.propostas.find((p) => p.topico === topico && !p.delegacao));
	const adotada = $derived(data.propostas.find((p) => p.topico === topico && p.adotada));
	const agenda = $derived(adotada ?? (base && (base.liberada || ehMesa) ? base : undefined));
	const aberta = $derived(!!agenda && (agenda.liberada || agenda.adotada));
	const alteracoes = $derived(data.alteracoes.filter((a) => a.proposta_id === agenda?.id));
	const abertas = $derived(alteracoes.filter((a) => a.status === 'aberta'));
	const respondidas = $derived(alteracoes.filter((a) => a.status !== 'aberta'));
	const textoDe = (id: string | null) => agenda?.pontos.find((p) => p.id === id)?.texto ?? '';

	let erro = $state('');
	let mensagem = $state('');
	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, ok = '') {
		erro = mensagem = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		else mensagem = ok;
		await invalidate('app:agenda');
		return !error;
	}

	/** Os pontos com o nível de cada um, na ordem, para o editor. */
	function niveis(pontos: Ponto[]): ItemEsboco[] {
		const nivel = new Map<string, number>();
		return pontos.map((p) => {
			const n = p.pai_id ? (nivel.get(p.pai_id) ?? 0) + 1 : 0;
			nivel.set(p.id, n);
			return { texto: p.texto, nivel: n };
		});
	}

	// A mesa cadastra (e, antes de liberar, corrige) a agenda do bureau no editor de itens.
	let editor = $state<Modal>();
	let itens = $state<ItemEsboco[]>([{ texto: '', nivel: 0 }]);
	function abrirEditor() {
		itens = base?.pontos.length ? niveis(base.pontos) : [{ texto: '', nivel: 0 }];
		erro = mensagem = '';
		editor?.abrir();
	}
	async function salvarBase(evento: SubmitEvent) {
		evento.preventDefault();
		const ok = await executar(
			supabase.rpc('salvar_proposta_agenda', { p_comite: data.comite.id, p_topico: topico, p_itens: preenchidos(itens) }),
			t('Agenda do bureau salva.')
		);
		if (ok) editor?.fechar();
	}

	// Passo 64: o painel do item, à direita. O item abre com o texto, o andamento, o working
	// paper dele, os verbos (cada um troca o painel pelo formulário) e as alterações abertas;
	// sem item, os itens novos propostos para o fim.
	type Acao = 'alterar' | 'incluir' | 'retirar' | 'mover';
	let painelAberto = $state(false);
	let alvoId = $state<string | null>(null);
	let modo = $state<'ver' | Acao>('ver');
	const alvo = $derived(alvoId ? agenda?.pontos.find((p) => p.id === alvoId) : undefined);
	let texto = $state('');
	let depois = $state('');
	let dentro = $state(false);
	let motivo = $state('');
	function abrir(id: string | null, novoModo: 'ver' | Acao = 'ver') {
		alvoId = id;
		mensagem = '';
		irPara(novoModo);
		painelAberto = true;
	}
	function irPara(novoModo: 'ver' | Acao) {
		modo = novoModo;
		erro = '';
		texto = novoModo === 'alterar' ? (alvo?.texto ?? '') : '';
		depois = '';
		dentro = false;
		motivo = '';
	}
	const TITULO = $derived<Record<Acao, string>>({
		alterar: t('Mudar o texto'),
		incluir: alvoId ? t('Incluir um item depois deste') : t('Propor um item no fim'),
		mover: t('Mudar de lugar (a ordem de debate)'),
		retirar: t('Retirar da agenda')
	});
	async function proporAlteracao(evento: SubmitEvent) {
		evento.preventDefault();
		if (!agenda) return;
		const acao = modo as Acao;
		const ok = await executar(
			supabase.rpc('propor_alteracao_agenda', {
				p_proposta: agenda.id,
				p_acao: acao,
				p_ponto: acao === 'incluir' ? undefined : (alvoId ?? undefined),
				p_texto: acao === 'alterar' || acao === 'incluir' ? texto : undefined,
				p_depois: acao === 'incluir' ? (alvoId ?? undefined) : acao === 'mover' ? depois || undefined : undefined,
				p_dentro: acao === 'incluir' && !!alvoId && dentro,
				p_motivo: motivo || undefined
			}),
			t('Alteração proposta. As delegações debatem e marcam a posição.')
		);
		// Feita, o painel volta ao item, com a alteração na lista; o item novo do fim fecha.
		if (ok) {
			if (alvoId) modo = 'ver';
			else painelAberto = false;
		}
	}
	// As alterações abertas de um item (null: os itens novos no fim).
	const doItem = (id: string | null) => abertas.filter((a) => (a.acao === 'incluir' ? a.depois_de : a.ponto_id) === id);
	// Passo 63: cada item grande adotado tem o working paper da sala.
	const wpDoAlvo = $derived(alvo && data.ordem.documentos.find((x) => x.tipo === 'working_paper' && x.ponto_pauta_id === alvo.id && !x.bloco_id));

	const descrever = (a: Alteracao) =>
		a.acao === 'alterar'
			? t('Mudar "{item}" para "{texto}"', { item: textoDe(a.ponto_id), texto: a.texto ?? '' })
			: a.acao === 'retirar'
				? t('Retirar "{item}"', { item: textoDe(a.ponto_id) })
				: a.acao === 'mover'
					? a.depois_de
						? t('Mover "{item}" para depois de "{outro}"', { item: textoDe(a.ponto_id), outro: textoDe(a.depois_de) })
						: t('Mover "{item}" para o começo', { item: textoDe(a.ponto_id) })
					: a.depois_de
						? a.dentro
							? t('Incluir "{texto}" dentro de "{outro}"', { texto: a.texto ?? '', outro: textoDe(a.depois_de) })
							: t('Incluir "{texto}" depois de "{outro}"', { texto: a.texto ?? '', outro: textoDe(a.depois_de) })
						: t('Incluir "{texto}" no fim', { texto: a.texto ?? '' });
	const posicoesDe = (a: Alteracao, p: Posicao) => a.posicoes.filter((x) => x.posicao === p);
	const minhaPosicao = (a: Alteracao) => (podeAlterar ? a.posicoes.find((x) => x.delegacao_id === minhaVoz)?.posicao : undefined);
	// "Um certo consenso": ninguém contra e o apoio de pelo menos metade das delegações. É um
	// sinal para a sala e para a mesa; quem inclui é a mesa.
	const consenso = (a: Alteracao) => !posicoesDe(a, 'contra').length && posicoesDe(a, 'apoio').length >= Math.ceil(data.totalDelegacoes / 2);
	const marcar = (a: Alteracao, p: Posicao) =>
		executar(supabase.rpc('marcar_posicao_alteracao', { p_alteracao: a.id, p_posicao: (minhaPosicao(a) === p ? null : p) as string }));
</script>

{#snippet avisos()}
	{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
	{#if mensagem}<p class="sucesso" role="status">{mensagem}</p>{/if}
{/snippet}

<!-- Passo 64: cada item é uma linha limpa, com o andamento e as alterações; clicar abre o painel. -->
{#snippet linha(ponto: Ponto, n: number)}
	<span>{ponto.texto}</span>
	{#if agenda?.adotada || n}
		<span class="linha-item-selos">
			{#if agenda?.adotada}
				<span class="selo {ponto.status === 'debatido' ? 'selo--ok' : ponto.status === 'em_debate' ? 'selo--info' : ''}">{ANDAMENTO[ponto.status as keyof typeof ANDAMENTO]}</span>
			{/if}
			{#if n}<span class={['selo', doItem(ponto.id).some(consenso) && 'selo--ok']}>{n === 1 ? t('1 alteração') : t('{n} alterações', { n })}</span>{/if}
		</span>
	{/if}
{/snippet}

{#snippet arvore(pontos: Ponto[], pai: string | null)}
	<ol class="arvore arvore--numerada">
		{#each pontos.filter((p) => p.pai_id === pai) as ponto (ponto.id)}
			{@const n = doItem(ponto.id).length}
			<li>
				{#if aberta}
					<button class="linha-item" type="button" aria-haspopup="dialog" onclick={() => abrir(ponto.id)}>{@render linha(ponto, n)}</button>
				{:else}
					<span class="linha-item">{@render linha(ponto, n)}</span>
				{/if}
				{#if pontos.some((p) => p.pai_id === ponto.id)}
					{@render arvore(pontos, ponto.id)}
				{/if}
			</li>
		{/each}
	</ol>
{/snippet}

{#snippet alteracao(a: Alteracao)}
	<li>
		<span>
			<strong>{descrever(a)}</strong>
			<span class="detalhe">
				{#if a.delegacao}<NomeDelegacao sigla={data.comite.sigla} delegacao={a.delegacao} />{:else}{t('Mesa')}{/if}
				{#if a.motivo}· {a.motivo}{/if}
			</span>
			{#each Object.entries(POSICOES) as [p, nome] (p)}
				{@const quem = posicoesDe(a, p as Posicao)}
				{#if quem.length}<span class="selo {SELO_POSICAO[p as Posicao]}">{nome} {quem.length}</span>{/if}
			{/each}
			{#if consenso(a)}<span class="selo selo--ok">{t('consenso')}</span>{/if}
		</span>
		<span class="acoes">
			{#if podeAlterar}
				<span class="acoes" role="group" aria-label={t('Sua posição sobre: {alteracao}', { alteracao: descrever(a) })}>
					{#each Object.entries(POSICOES) as [p, nome] (p)}
						<button
							class={['botao botao--pequeno', minhaPosicao(a) !== p && 'botao--secundario']}
							type="button"
							aria-pressed={minhaPosicao(a) === p}
							{@attach dica(t('Marca sua posição nesta alteração; tocar de novo desmarca.'))}
							onclick={() => marcar(a, p as Posicao)}>{nome}</button
						>
					{/each}
				</span>
			{/if}
			{#if ehMesa || data.podePresidir}
				<span class="acoes" role="group" aria-label={t('Decidir: {proposta}', { proposta: descrever(a) })}>
					<button
						class="botao botao--pequeno"
						type="button"
						onclick={() => executar(supabase.rpc('responder_alteracao_agenda', { p_alteracao: a.id, p_aceitar: true }), t('Alteração incluída.'))}
						{@attach dica(t('Aplica esta alteração à agenda.'))}
						>{t('Incluir')}</button
					>
					<button
						class="botao botao--secundario botao--pequeno"
						type="button"
						onclick={() => executar(supabase.rpc('responder_alteracao_agenda', { p_alteracao: a.id, p_aceitar: false }), t('Alteração recusada.'))}
						{@attach dica(t('A alteração não entra na agenda e fica entre as respondidas.'))}
						>{t('Recusar')}</button
					>
				</span>
			{/if}
		</span>
	</li>
{/snippet}

<svelte:head>
	<title>{tituloDaAba(t('Agenda'), data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">
	{t('Comitê')} · {data.comite.sigla}
	<AoVivo comiteId={data.comite.id} tabelas={['proposta_agenda', 'ponto_pauta', 'alteracao_agenda', 'posicao_alteracao', 'documento']} dependencia="app:agenda" />
</p>
<h1>{t('Agenda')}</h1>

<nav class="abas-topicos" aria-label={t('Tópicos')}>
	{#each data.topicos as tp (tp.numero)}
		<a
			class={['botao botao--pequeno', tp.numero !== topico && 'botao--secundario']}
			href={`?topico=${tp.numero}`}
			aria-current={tp.numero === topico ? 'page' : undefined}
			{@attach dica(t('A agenda e as alterações propostas deste tópico.'))}
			>{t('Tópico {n}', { n: tp.numero })}{#if tp.numero === data.topicoAtual}{` · ${t('em debate')}`}{/if}</a
		>
	{/each}
</nav>

<section aria-labelledby="t-topico">
	<h2 id="t-topico">{titulo}</h2>
	<TrilhaDoTopico sigla={data.comite.sigla} mesa={ehMesa} {...doTopico(data.ordem, topico)} />

	{#if !painelAberto}{@render avisos()}{/if}

	{#if !agenda}
		{#if ehMesa}
			<article class="cartao cartao--destaque">
				<p>{t('Cadastre a agenda que o bureau preparou para este tópico. Ela fica oculta das delegações até você liberá-la, no dia do evento.')}</p>
				<button
					class="botao"
					type="button"
					onclick={abrirEditor}
					{@attach dica(t('Abre o editor para escrever os itens da agenda deste tópico.'))}
					><ListPlus aria-hidden="true" size={18} strokeWidth={1.75} /> {t('Cadastrar a agenda do bureau')}</button
				>
			</article>
		{:else}
			<p class="suave">{t('A mesa libera a agenda do bureau no dia do evento. A primeira sessão do tópico a debate.')}</p>
		{/if}
	{:else}
		<div class="editor-topico">
			<article class={['cartao', !agenda.adotada && 'cartao--destaque']} aria-labelledby="t-agenda">
				<div class="cartao-timbre">
					<h3 id="t-agenda">{agenda.adotada ? t('Agenda adotada') : t('Agenda do bureau')}</h3>
					{#if agenda.delegacao}<NomeDelegacao sigla={data.comite.sigla} delegacao={agenda.delegacao} />{/if}
					{#if !aberta}<span class="selo selo--alerta">{t('oculta das delegações')}</span>{/if}
					{#if podeAlterar && aberta}
						<button
							class="botao botao--secundario botao--pequeno"
							type="button"
							aria-haspopup="dialog"
							onclick={() => abrir(null, 'incluir')}
							{@attach dica(t('Sugere um item novo no fim da agenda, para a sala debater.'))}
							><ListPlus aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Propor um item no fim')}</button
						>
					{/if}
					{#if ehMesa}
						<div class="acoes">
							{#if !aberta}
								<button class="botao botao--secundario botao--pequeno" type="button" onclick={abrirEditor} {@attach dica(t('Corrigir os itens antes de liberar a agenda.'))}>{t('Editar')}</button>
								<Confirmar
									classe="botao botao--pequeno"
									rotulo={t('Liberar a agenda')}
									dica={t('As delegações passam a ver a agenda e a propor alterações.')}
									pergunta={t('Liberar a agenda do tópico {n} para as delegações?', { n: topico })}
									acao={() => executar(supabase.rpc('liberar_agenda', { p_proposta: agenda.id }), t('Agenda liberada.'))}
								/>
							{:else if !agenda.adotada}
								<Confirmar
									classe="botao botao--pequeno"
									rotulo={t('Registrar a adoção')}
									dica={t('Registra que a sala adotou a agenda; a presidência marca o andamento dos itens.')}
									pergunta={t('A sala adotou a agenda do tópico {n}?', { n: topico })}
									acao={() => executar(supabase.rpc('adotar_proposta', { p_proposta: agenda.id }), t('Agenda adotada.'))}
								/>
							{:else}
								<Confirmar
									classe="botao botao--secundario botao--pequeno"
									rotulo={t('Retirar adoção')}
									dica={t('Desfaz o registro: a agenda deixa de constar como adotada.')}
									pergunta={t('Retirar a adoção da agenda do tópico {n}?', { n: topico })}
									acao={() => executar(supabase.rpc('retirar_adocao', { p_proposta: agenda.id }), t('Adoção retirada.'))}
								/>
							{/if}
						</div>
					{/if}
				</div>
				{@render arvore(agenda.pontos, null)}
				{#if doItem(null).length}
					<button class="linha-item linha-item--novas" type="button" aria-haspopup="dialog" onclick={() => abrir(null)}>
						<span>{doItem(null).length === 1 ? t('1 item novo proposto') : t('{n} itens novos propostos', { n: doItem(null).length })}</span>
						{#if doItem(null).some(consenso)}<span class="selo selo--ok">{t('consenso')}</span>{/if}
					</button>
				{/if}
			</article>

			<aside class="editor-lado" aria-label={t('Resumo da agenda')}>
				<p class="suave">
					{!aberta
						? t('Só a mesa vê esta agenda. Corrija o que precisar e libere no dia do evento.')
						: agenda.adotada
							? t('Adotada. Cada item grande tem o seu working paper: clique no item para abrir.')
							: t('Clique num item para propor uma alteração ou marcar a posição. Havendo consenso, a presidência ou a mesa inclui; depois, a mesa registra a adoção.')}
				</p>
				{#if aberta}
					<section aria-labelledby="t-alteracoes">
						<h2 id="t-alteracoes">{t('Alterações propostas')} <span class="selo">{abertas.length}</span></h2>
						<ul class="lista lista--compacta">
							{#each abertas as a (a.id)}
								<li>
									<button class="linha-item" type="button" aria-haspopup="dialog" onclick={() => abrir(a.acao === 'incluir' ? a.depois_de : a.ponto_id)}>
										<span>{descrever(a)}</span>
										{#if consenso(a)}<span class="selo selo--ok">{t('consenso')}</span>{/if}
									</button>
								</li>
							{:else}
								<li class="suave">{t('Nenhuma alteração esperando.')}</li>
							{/each}
						</ul>
					</section>
				{/if}
				{#if respondidas.length}
					<details>
						<summary>{t('Respondidas ({n})', { n: respondidas.length })}</summary>
						<ul class="lista lista--compacta">
							{#each respondidas as a (a.id)}
								<li>
									<span>{descrever(a)}</span>
									<span class="selo {a.status === 'aceita' ? 'selo--ok' : 'selo--erro'}">{a.status === 'aceita' ? t('incluída') : t('recusada')}</span>
								</li>
							{/each}
						</ul>
					</details>
				{/if}
			</aside>
		</div>
	{/if}
</section>

<Modal bind:this={editor} rotulo="editor-agenda-titulo" classe="modal-largo">
	<form class="formulario formulario--largo" onsubmit={salvarBase}>
		<h3 id="editor-agenda-titulo">{t('Agenda do bureau')}</h3>
		<p class="suave">{t('Tópico {n}', { n: topico })}: {titulo}</p>
		<EditorDeItens bind:itens />
		{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
		<div class="acoes">
			<button class="botao" {@attach dica(preenchidos(itens).length ? t('Guarda a agenda; as delegações só a veem depois de liberada.') : t('Escreva pelo menos um item.'), !preenchidos(itens).length)}>{t('Salvar a agenda do bureau')}</button>
			<button class="botao botao--secundario" type="button" onclick={() => editor?.fechar()}>{t('Cancelar')}</button>
		</div>
	</form>
</Modal>

<!-- Passo 64: o painel do item, à direita (no celular, a tela toda). -->
<Modal lateral aberto={painelAberto} onclose={() => (painelAberto = false)} rotulo="painel-agenda">
	{#if modo === 'ver'}
		<h3 id="painel-agenda">{alvoId ? (alvo?.texto ?? t('(item retirado)')) : t('Itens novos propostos')}</h3>
		{@render avisos()}
		{#if alvo && agenda?.adotada}
			{#if data.podePresidir}
				<label class="campo campo--curto">
					{t('Andamento')}
					<select
						aria-label={t('Andamento de {item}', { item: alvo.texto })}
						value={alvo.status}
						onchange={async (e) => {
							// Recusado (sem sessão aberta, por exemplo), o seletor volta ao andamento gravado.
							const campo = e.currentTarget;
							if (!(await executar(supabase.rpc('marcar_ponto_pauta', { p_ponto: alvo.id, p_status: campo.value })))) campo.value = alvo.status;
						}}
					>
						{#each Object.entries(ANDAMENTO) as [valor, rotulo] (valor)}
							<option value={valor}>{rotulo}</option>
						{/each}
					</select>
				</label>
			{:else}
				<p><span class="selo">{ANDAMENTO[alvo.status as keyof typeof ANDAMENTO]}</span></p>
			{/if}
			{#if wpDoAlvo}
				<p>
					<a class="botao" href={`/documento/${wpDoAlvo.id}/sala`} {@attach dica(t('O texto que a sala escreve sobre este item.'))}
						><FileText aria-hidden="true" size={18} strokeWidth={1.75} /> {t('Abrir o working paper deste item')}</a
					>
				</p>
			{/if}
		{/if}
		{#if alvo && podeAlterar && aberta}
			<div class="acoes" role="group" aria-label={t('O que fazer neste item')}>
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => irPara('alterar')} {@attach dica(t('Propõe um texto novo para este item.'))}
					><PencilLine aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Mudar o texto')}</button
				>
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => irPara('incluir')} {@attach dica(t('Propõe um item novo logo depois deste, ou dentro dele.'))}
					><ListPlus aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Incluir depois')}</button
				>
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => irPara('mover')} {@attach dica(t('Propõe outra posição na ordem de debate.'))}
					><ArrowUpDown aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Mudar de lugar')}</button
				>
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => irPara('retirar')} {@attach dica(t('Propõe tirar este item da agenda.'))}
					><Eraser aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Retirar')}</button
				>
			</div>
		{/if}
		{#if aberta}
			<h4>{t('Alterações propostas')}</h4>
			<ul class="lista" aria-label={t('Alterações deste item')}>
				{#each doItem(alvoId) as a (a.id)}{@render alteracao(a)}{:else}<li class="suave">{t('Nenhuma alteração esperando.')}</li>{/each}
			</ul>
		{/if}
		<form method="dialog" class="acoes"><button class="botao botao--secundario">{t('Fechar')}</button></form>
	{:else}
		<form class="formulario" onsubmit={proporAlteracao}>
			{#if alvo}<p class="rotulo">{alvo.texto}</p>{/if}
			<h3 id="painel-agenda">{TITULO[modo as Acao]}</h3>
			{#if modo === 'alterar' || modo === 'incluir'}
				<label class="campo">
					{modo === 'alterar' ? t('Texto novo') : t('Item novo')}
					<input required maxlength="300" bind:value={texto} />
				</label>
				{#if modo === 'incluir' && alvo}
					<label class="opcao"><input type="checkbox" bind:checked={dentro} /> {t('Como subitem de "{item}"', { item: alvo.texto })}</label>
				{/if}
			{:else if modo === 'mover' && agenda}
				<label class="campo">
					{t('Para depois de')}
					<select bind:value={depois}>
						<option value="">{t('Para o começo')}</option>
						{#each agenda.pontos.filter((p) => p.id !== alvoId) as p (p.id)}<option value={p.id}>{p.texto}</option>{/each}
					</select>
				</label>
			{/if}
			<label class="campo">
				{t('Por quê (opcional)')}
				<input maxlength="280" bind:value={motivo} />
			</label>
			{@render avisos()}
			<div class="acoes">
				<button class="botao" {@attach dica(t('A alteração vai à sala, que debate e marca a posição.'))}>{t('Propor')}</button>
				<button class="botao botao--secundario" type="button" onclick={() => (alvoId ? irPara('ver') : (painelAberto = false))}>{alvoId ? t('Voltar') : t('Cancelar')}</button>
			</div>
		</form>
	{/if}
</Modal>
