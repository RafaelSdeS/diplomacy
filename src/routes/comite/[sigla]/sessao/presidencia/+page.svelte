<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { goto, invalidate } from '$app/navigation';
	import type { Database } from '#lib/database.types.ts';
	import { nomeDoDocumento, STATUS_DOCUMENTO } from '#lib/formatacao.ts';
	import { assinaturasDesconfianca, REGRAS_VOTACAO } from '#lib/votacao.ts';
	import { bureauPreside, momentoDoDebate, pausaRestanteSeg, descreverPonto, ehPonto, FORMAS, mensagemDeErro, MOCOES_COM_LISTA, SITUACAO_PONTO, type TipoPonto } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import NomeDelegacao from '#lib/ui/NomeDelegacao.svelte';
	import Cronometro from '#lib/ui/Cronometro.svelte';
	import Contagem from '#lib/ui/Contagem.svelte';
	import { relogioDebate, restanteSeg, temDebate } from '#lib/cronometro.ts';
	import GradeVotos from '#lib/ui/GradeVotos.svelte';
	import {
		escolhasPermitidas,
		ESCOLHAS,
		ETAPAS,
		FASES,
		listaAtiva,
		presidenciaEmVigor,
		proximoDaLista,
		textoResultado,
		type Escolha
	} from '#lib/votacao.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	type Funcoes = Database['public']['Functions'];

	let diferenca = $state(0);
	let erro = $state('');
	let tempoFala = $state(0);
	let forma = $state<'formal_informal' | 'informal_informal'>('formal_informal');
	let minutos = $state<number | null>(null);

	const comite = $derived(data.comite.id);
	const sessao = $derived(data.estado?.sessao);
	const ehMesa = $derived(
		data.participacoes.some((p) => (p.papel === 'mesa' && p.comite_id === data.comite.id) || p.papel === 'secretaria')
	);
	const fila = $derived(sessao?.pedidos ?? []);
	const pontosAbertos = $derived((sessao?.pontos ?? []).filter((p) => !['aceito', 'recusado'].includes(p.status)));
	const emDiscussao = $derived(pontosAbertos.find((p) => p.status === 'em_discussao'));
	// Passo 29: com uma delegação presidindo, o bureau aprova antes e a presidência só vê o aprovado.
	const presidePeloBureau = $derived(bureauPreside(data.fase, data.estado?.mesa_assumiu, sessao?.presidencia?.id));
	const paraJulgar = $derived(pontosAbertos.filter((p) => p.status === 'aberto' && p.aprovado_bureau == null));
	const paraConceder = $derived(
		presidePeloBureau ? pontosAbertos : pontosAbertos.filter((p) => p.status !== 'aberto' || p.aprovado_bureau)
	);
	let motivo = $state<Record<string, string>>({});
	const julgar = (ponto: string, emOrdem: boolean) =>
		rpc('julgar_ponto', { p_ponto: ponto, p_em_ordem: emOrdem, p_motivo: emOrdem ? undefined : motivo[ponto] || undefined });
	const lista = $derived(listaAtiva(data.lista, emDiscussao?.id, data.fase));
	const proximo = $derived(proximoDaLista(lista));
	const pausado = $derived(data.estado?.cronometro_pausado_restante_seg !== null);
	// O relógio do debate (passo 28): minutos da forma de debate, separados da fala.
	let agora = $state(Date.now());
	$effect(() => {
		const relogio = setInterval(() => (agora = Date.now()), 1000);
		return () => clearInterval(relogio);
	});
	const comDebate = $derived(!!data.estado && temDebate(data.estado));
	const debatePausado = $derived(data.estado?.debate_pausado_restante_seg != null);
	const debateEsgotado = $derived(
		!!data.estado && comDebate && data.estado.forma === 'informal_informal'
			&& restanteSeg(relogioDebate(data.estado), agora + diferenca) === 0
	);
	const aplicarTempo = (seg: number) => rpc('aplicar_tempo_fala', { p_comite: comite, p_seg: seg });
	// Debate rápido (passo 30): a pausa depois de cada fala e a lista curta escolhida entre as placas.
	const momento = $derived(data.estado ? momentoDoDebate(data.estado, agora + diferenca) : null);
	const proximos = $derived(sessao?.proximos ?? []);
	let escolhidos = $state<string[]>([]);
	const escolher = (delegacao: string) =>
		(escolhidos = escolhidos.includes(delegacao)
			? escolhidos.filter((d) => d !== delegacao)
			: escolhidos.length < 4
				? [...escolhidos, delegacao]
				: escolhidos);
	const definirProximos = () =>
		rpc('definir_proximos', { p_comite: comite, p_delegacoes: escolhidos }).then(() => (escolhidos = []));
	const baixarTodas = () => rpc('baixar_todas_placas', { p_comite: comite });
	// Passo 31: a mesa assume a delegação de quem faltou.
	const representada = $derived(data.representacoes.find((r) => r.pessoa_id === data.usuario?.id)?.delegacao ?? null);
	const ausentes = $derived(new Set(data.delegacoes.filter((d) => !sessao?.presenca.some((p) => p.delegacao_id === d.id)).map((d) => d.id)));
	const paraAssumir = $derived([...data.delegacoes].sort((a, b) => Number(ausentes.has(b.id)) - Number(ausentes.has(a.id))));
	let assumir = $state('');
	// Passo 33: os números abrem o que contam.
	const paginaDe = (id: string) => `/comite/${data.comite.sigla}/delegacao/${id}`;
	const nomeDe = (id: string) => data.delegacoes.find((d) => d.id === id)?.nome ?? '';
	const chamada = $derived(
		data.delegacoes
			.filter((d) => d.situacao !== 'suspensa')
			.map((d) => ({ d, presente: !ausentes.has(d.id) }))
			.sort((a, b) => Number(b.presente) - Number(a.presente))
			.map(({ d, presente }) => ({ texto: `${d.nome} · ${presente ? t('presente') : t('ausente')}`, href: paginaDe(d.id) }))
	);
	const presentesN = $derived(chamada.length - [...ausentes].filter((id) => data.delegacoes.find((d) => d.id === id)?.situacao !== 'suspensa').length);
	const correndo = $derived(!!data.estado?.cronometro_inicio && !pausado);
	const votacao = $derived(data.votacao);
	// Quem pode votar nesta votação: presentes, menos suspensas (e observadoras, na substantiva).
	const votantes = $derived(
		data.delegacoes.filter(
			(d) =>
				votacao &&
				escolhasPermitidas(votacao.tipo, d.situacao, sessao?.presenca.find((p) => p.delegacao_id === d.id)?.situacao)
					.length > 0
		)
	);

	// O campo segue o tempo de fala gravado na sessão, mas só quando ele muda: outros
	// eventos ao vivo (uma placa levantada) não apagam o que a presidência digitou.
	const tempoGravado = $derived(data.estado?.tempo_fala_seg);
	$effect(() => {
		if (tempoGravado) tempoFala = tempoGravado;
	});

	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>) {
		erro = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		await invalidate('app:sessao-ao-vivo');
	}
	// Chama uma função do banco com nome e argumentos checados pelos tipos gerados.
	let pedidoDe = $state('');
	// A lista de votos de placa fica aberta entre as recargas ao vivo (e abre sozinha na nominal).
	let chamadaAberta = $state(false);
	$effect(() => {
		if (votacao?.aberta && votacao.nominal) chamadaAberta = true;
	});
	let parte = $state<string[]>([]);
	const ACOES_EMENDA: Record<string, string> = { acrescentar: t('Acrescenta'), suprimir: t('Suprime'), modificar: t('Modifica') };
	const rpc = <F extends keyof Funcoes>(funcao: F, args: Funcoes[F]['Args']) => executar(supabase.rpc(funcao, args));

	// Abrir, encerrar e aceitar quem chegou depois (passo 21).
	let confirmarEncerrar = $state<HTMLDialogElement>();
	const encerrarSessao = () => rpc('encerrar_sessao', { p_comite: comite });
	const confirmarPresenca = (delegacao: string) =>
		executar(supabase.from('presenca').upsert({ sessao_id: sessao!.id, comite_id: comite, delegacao_id: delegacao }));
	async function abrirSessao() {
		await executar(supabase.rpc('abrir_sessao', { p_comite: comite }));
		if (!erro) await goto(`/comite/${data.comite.sigla}/sessao/chamada`);
	}
	const duracaoMin = (r: { inicio: string; fim: string }) => Math.max(1, Math.round((Date.parse(r.fim) - Date.parse(r.inicio)) / 60_000));

	// Sem delegação (null), encerra a fala. Os tipos gerados não sabem que o argumento aceita null.
	const darPalavra = (delegacao: string | null) =>
		rpc('dar_palavra', { p_comite: comite, p_delegacao: delegacao as string, p_seg: tempoFala });
	const pausarOuRetomar = () =>
		pausado ? rpc('retomar', { p_comite: comite }) : correndo ? rpc('pausar', { p_comite: comite }) : undefined;
	const registrar = (delegacao: string, escolha: Escolha) =>
		rpc('registrar_voto', { p_votacao: votacao!.id, p_delegacao: delegacao, p_escolha: escolha });

	function mudarForma(evento: SubmitEvent) {
		evento.preventDefault();
		void rpc('mudar_forma', { p_comite: comite, p_forma: forma, p_minutos: minutos ?? undefined });
	}

	// Atalhos: Espaço pausa ou retoma; Enter dá a palavra ao primeiro da lista curta, ou
	// ao próximo da lista de oradores, ou ao primeiro da fila de placas; B baixa todas as
	// placas. Só fora de campos e botões.
	function atalho(evento: KeyboardEvent) {
		const alvo = evento.target as HTMLElement;
		if (alvo.closest('input, textarea, select, button, a, summary, dialog, [contenteditable]')) return;
		const seguinte = proximos[0]?.delegacao?.id ?? proximo?.delegacao?.id ?? fila[0]?.delegacao?.id;
		if (evento.key === ' ') {
			evento.preventDefault();
			void pausarOuRetomar();
		} else if (evento.key === 'Enter' && seguinte) {
			evento.preventDefault();
			void darPalavra(seguinte);
		} else if (evento.key.toLowerCase() === 'b') {
			evento.preventDefault();
			void baixarTodas();
		}
	}
</script>

<svelte:window onkeydown={data.podePresidir && sessao ? atalho : undefined} />

<svelte:head>
	<title>{tituloDaAba(t('Presidência'), data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">{t('Comitê')} · {data.comite.sigla} <AoVivo comiteId={data.comite.id} bind:diferenca /></p>
<h1>{t('Presidência')}</h1>

{#if !data.podePresidir}
	<p class="suave">{t('Você não preside esta sessão. Quando for a vez da sua delegação, o painel aparece aqui.')}</p>
{:else if !data.estado || !sessao}
	{#if erro}
		<p class="erro" role="alert">{erro}</p>
	{/if}
	{#if data.resumo}
		{@const r = data.resumo}
		<section class="cartao" aria-labelledby="t-resumo">
			<h2 id="t-resumo">{t('Sessão {n} encerrada', { n: r.numero })}</h2>
			<p>
				{t('{n} min', { n: duracaoMin(r) })} · {t('Presentes: {n}', { n: r.presentes })} ·
				{t('Pontos e moções: {n}', { n: Object.values(r.pontos).reduce((a, b) => a + b, 0) })}
			</p>
			{#if Object.keys(r.pontos).length}
				<p class="suave">
					{Object.entries(r.pontos)
						.map(([status, n]) => `${SITUACAO_PONTO[status as keyof typeof SITUACAO_PONTO] ?? status}: ${n}`)
						.join(' · ')}
				</p>
			{/if}
			{#if r.votacoes.length}
				<ul class="lista" aria-label={t('Votações')}>
					{#each r.votacoes as v, i (i)}
						<li>
							<span>{v.objeto}</span>
							<span class="selo {v.aprovada ? 'selo--ok' : 'selo--erro'}">{v.aprovada ? t('Aprovada') : t('Rejeitada')}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
	{#if ehMesa}
		<p>
			<button class="botao" type="button" onclick={abrirSessao}>
				{data.resumo ? t('Abrir a sessão {n}', { n: data.resumo.numero + 1 }) : t('Abrir sessão')}
			</button>
		</p>
	{:else}
		<p class="suave">{t('Nenhuma sessão aberta. A mesa abre a sessão na chamada.')}</p>
	{/if}
{:else}
	<p class="suave">
		<Contagem rotulo={t('Presentes: {n} de {total}', { n: presentesN, total: chamada.length })} itens={chamada} /> ·
		{t('Sessão {n}', { n: sessao.numero })} · {FASES[data.fase]} · {FORMAS[data.estado.forma]} · {t('Presidência')}: {presidenciaEmVigor(
			data.fase,
			data.estado.mesa_assumiu,
			sessao.presidencia?.nome
		)}
	</p>
	<p class="suave atalhos-ajuda">
		{t('Atalhos:')} <kbd>{t('Espaço')}</kbd> {t('pausa ou retoma;')} <kbd>{t('Enter')}</kbd> {t('dá a palavra ao próximo da lista ou da fila;')} <kbd>B</kbd> {t('baixa todas as placas.')}
	</p>

	{#if erro}
		<p class="erro" role="alert">{erro}</p>
	{/if}

	{#if ehMesa}
		<div class="acoes">
			<a class="botao botao--secundario botao--pequeno" href={`/comite/${data.comite.sigla}/sessao/chamada`}>{t('Chamada')}</a>
			<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => confirmarEncerrar?.showModal()}
				>{t('Encerrar sessão')}</button
			>
		</div>
		<dialog bind:this={confirmarEncerrar} aria-labelledby="t-encerrar">
			<h3 id="t-encerrar">{t('Encerrar a sessão {n}?', { n: sessao.numero })}</h3>
			<p>{t('As votações abertas são fechadas e o cronômetro para.')}</p>
			<form method="dialog" class="acoes">
				<button class="botao" onclick={encerrarSessao}>{t('Encerrar sessão')}</button>
				<button class="botao botao--secundario">{t('Cancelar')}</button>
			</form>
		</dialog>
		<section class="cartao" aria-labelledby="t-representar">
			<h2 id="t-representar">{t('Assumir uma delegação')}</h2>
			{#if representada}
				<p>{t('Você está no lugar de {delegacao}.', { delegacao: representada.nome })}</p>
				<div class="acoes">
					<a class="botao botao--secundario botao--pequeno" href={`/comite/${data.comite.sigla}/sessao`}>{t('Agir pela delegação')}</a>
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => rpc('representar', { p_comite: comite, p_delegacao: null as unknown as string })}
						>{t('Deixar')}</button
					>
				</div>
			{:else}
				<form
					class="acoes"
					aria-label={t('Assumir uma delegação')}
					onsubmit={(e) => {
						e.preventDefault();
						if (assumir) void rpc('representar', { p_comite: comite, p_delegacao: assumir });
					}}
				>
					<label class="campo">
						{t('Delegação')}
						<select bind:value={assumir} required>
							<option value="">{t('Escolha')}</option>
							{#each paraAssumir as d (d.id)}
								<option value={d.id}>{d.nome}{ausentes.has(d.id) ? ` · ${t('ausente')}` : ''}</option>
							{/each}
						</select>
					</label>
					<button class="botao botao--secundario botao--pequeno">{t('Assumir')}</button>
				</form>
			{/if}
		</section>
		{#if sessao.avisos.length}
			<section class="cartao cartao--destaque" aria-labelledby="t-chegadas">
				<h2 id="t-chegadas">{t('Chegadas')}</h2>
				<ul class="lista">
					{#each sessao.avisos as aviso (aviso.delegacao?.id)}
						<li>
							<span class="com-bandeira"><Bandeira codigo={aviso.delegacao?.bandeira} /> {aviso.delegacao?.nome}</span>
							<button
								class="botao botao--pequeno"
								type="button"
								aria-label={t('Confirmar presença: {delegacao}', { delegacao: aviso.delegacao?.nome ?? '' })}
								onclick={() => confirmarPresenca(aviso.delegacao!.id)}>{t('Confirmar presença')}</button
							>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}

	{#if momento === 'pausa' && data.estado}
		<section class="cartao cartao--destaque pausa-pontos" aria-labelledby="t-pausa">
			<h2 id="t-pausa">{t('Há pontos ou moções?')}</h2>
			<p class="destaque" aria-live="polite">{t('{n} s', { n: pausaRestanteSeg(data.estado.pausa_ate, agora + diferenca) })}</p>
			<button class="botao botao--secundario" type="button" onclick={() => rpc('encerrar_pausa', { p_comite: comite })}
				>{t('Encerrar a pausa')}</button
			>
		</section>
	{/if}

	{#if debateEsgotado}
		<section class="cartao cartao--destaque" aria-labelledby="t-esgotado">
			<h2 id="t-esgotado">{t('Tempo do informal-informal esgotado')}</h2>
			<button class="botao" type="button" onclick={() => rpc('mudar_forma', { p_comite: comite, p_forma: 'formal_informal' })}
				>{t('Voltar ao formal-informal')}</button
			>
		</section>
	{/if}

	{#if ehMesa && data.fase === 'plenaria'}
		<section class="cartao cartao--destaque" aria-labelledby="t-plenaria">
			<h2 id="t-plenaria">{t('Plenária de abertura')}</h2>
			<p class="destaque">{ETAPAS[data.estado.etapa_plenaria].rotulo}</p>
			{#if ETAPAS[data.estado.etapa_plenaria].proxima}
				<button
					class="botao"
					type="button"
					onclick={(e) => {
						// O botão troca de texto ("Passar à moção..."): solto o foco para um Enter,
						// o atalho de dar a palavra, não avançar a plenária por engano.
						e.currentTarget.blur();
						void rpc('avancar_plenaria', { p_comite: comite });
					}}
				>
					{ETAPAS[data.estado.etapa_plenaria].proxima}
				</button>
			{:else}
				<p class="suave">{t('Uma delegação propõe o tópico no topo; a votação dessa moção encerra a plenária.')}</p>
			{/if}
		</section>
	{/if}
	{#if ehMesa && data.fase === 'debate'}
		<p>
			<button
				class="botao botao--secundario botao--pequeno"
				type="button"
				onclick={() => rpc('assumir_presidencia', { p_comite: comite, p_assumir: !data.estado?.mesa_assumiu })}
			>
				{data.estado.mesa_assumiu ? t('Devolver a presidência à delegação') : t('Mesa assume a presidência')}
			</button>
		</p>
	{/if}

	<div class="painel">
		<div class="painel-coluna">
			{#if lista.length}
				<section class="cartao" aria-labelledby="t-lista">
					<h2 id="t-lista">{emDiscussao ? t('Lista especial') : t('Lista de oradores')}</h2>
					<ol class="lista">
						{#each lista as inscricao (inscricao.id)}
							<li aria-current={inscricao.id === proximo?.id ? 'step' : undefined}>
								<NomeDelegacao sigla={data.comite.sigla} delegacao={inscricao.delegacao} />
								{#if inscricao.lado}<span class="selo">{inscricao.lado === 'a_favor' ? t('A favor') : t('Contra')}</span>{/if}
								{#if inscricao.falou}<span class="selo selo--ok">{t('Falou')}</span>{/if}
							</li>
						{/each}
					</ol>
					{#if proximo}
						<button class="botao" type="button" onclick={() => darPalavra(proximo.delegacao!.id)}>
							{t('Dar a palavra a {delegacao}', { delegacao: proximo.delegacao?.nome ?? '' })}
						</button>
					{/if}
				</section>
			{/if}

			{#if proximos.length}
				<section class="cartao" aria-labelledby="t-proximos">
					<h2 id="t-proximos">{t('Próximos')}</h2>
					<ol class="lista">
						{#each proximos as p (p.delegacao?.id)}
							<li><NomeDelegacao sigla={data.comite.sigla} delegacao={p.delegacao} /></li>
						{/each}
					</ol>
					<button class="botao" type="button" onclick={() => darPalavra(proximos[0].delegacao!.id)}>
						{t('Dar a palavra a {delegacao}', { delegacao: proximos[0].delegacao?.nome ?? '' })}
					</button>
				</section>
			{/if}

			<section class="cartao" aria-labelledby="t-fila">
				<h2 id="t-fila">{t('Pedidos de fala')}</h2>
				<ol class="lista">
					{#each fila as pedido (pedido.id)}
						{@const ordem = escolhidos.indexOf(pedido.delegacao?.id ?? '')}
						<li>
							<span>
								<NomeDelegacao sigla={data.comite.sigla} delegacao={pedido.delegacao} />
								{#if pedido.pela_mesa}<span class="selo">{t('pela mesa')}</span>{/if}
							</span>
							<span class="acoes">
								<button
									class="botao botao--secundario botao--pequeno"
									type="button"
									aria-pressed={ordem >= 0}
									aria-label={t('Escolher para a lista curta: {delegacao}', { delegacao: pedido.delegacao?.nome ?? '' })}
									onclick={() => escolher(pedido.delegacao!.id)}>{ordem >= 0 ? `${ordem + 1}º` : t('Escolher')}</button
								>
								<button
									class="botao botao--pequeno"
									type="button"
									aria-label={`Dar a palavra a ${pedido.delegacao?.nome}`}
									onclick={() => darPalavra(pedido.delegacao!.id)}>{t('Dar a palavra')}</button
								>
							</span>
						</li>
					{:else}
						<li class="suave">{t('Nenhuma placa levantada.')}</li>
					{/each}
				</ol>
				{#if fila.length}
					<div class="acoes">
						<button class="botao botao--secundario botao--pequeno" type="button" disabled={!escolhidos.length} onclick={definirProximos}
							>{t('Definir os próximos ({n})', { n: escolhidos.length })}</button
						>
						<button class="botao botao--secundario botao--pequeno" type="button" onclick={baixarTodas}>{t('Baixar todas as placas')}</button>
					</div>
				{/if}
				{#if ehMesa && data.comite.tecnologia_restrita}
					<form
						class="acoes"
						aria-label={t('Registrar pedido de fala')}
						onsubmit={(e) => {
							e.preventDefault();
							if (pedidoDe) void rpc('registrar_pedido_fala', { p_comite: comite, p_delegacao: pedidoDe });
						}}
					>
						<label class="campo">
							{t('Delegação que levantou a placa')}
							<select bind:value={pedidoDe}>
								{#each data.delegacoes as d (d.id)}<option value={d.id}>{d.nome}</option>{/each}
							</select>
						</label>
						<button class="botao botao--secundario botao--pequeno">{t('Registrar pedido de fala')}</button>
					</form>
				{/if}
			</section>
		</div>

		<section class="cartao" aria-labelledby="t-palavra">
			<h2 id="t-palavra">{t('Com a palavra')}</h2>
			{#if data.estado.orador}
				<p class="destaque com-bandeira"><Bandeira codigo={data.estado.orador.bandeira} /> {data.estado.orador.nome}</p>
			{:else}
				<p class="suave">{t('Ninguém com a palavra.')}</p>
			{/if}
			<Cronometro cronometro={data.estado} avisoSeg={data.regras.aviso_fala_seg} {diferenca} grande />
			<div class="acoes">
				<button class="botao" type="button" disabled={!pausado && !correndo} onclick={pausarOuRetomar}>
					{pausado ? t('Retomar') : t('Pausar')}
				</button>
				<button
					class="botao botao--secundario"
					type="button"
					disabled={!data.estado.cronometro_inicio}
					onclick={() => rpc('somar_segundos', { p_comite: comite, p_seg: 30 })}>{t('+30 s')}</button
				>
				<button
					class="botao botao--secundario"
					type="button"
					disabled={!data.estado.cronometro_inicio}
					onclick={() => rpc('somar_segundos', { p_comite: comite, p_seg: -10 })}>{t('−10 s')}</button
				>
				<button class="botao botao--secundario" type="button" disabled={!data.estado.orador} onclick={() => darPalavra(null)}
					>{t('Encerrar fala')}</button
				>
			</div>
			<div class="tempo-fala">
				<label class="campo campo--curto">
					{t('Tempo de fala (segundos)')}
					<input type="number" min="1" max="3600" bind:value={tempoFala} />
				</label>
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => aplicarTempo(tempoFala)}
					>{t('Aplicar')}</button
				>
				<span class="acoes" role="group" aria-label={t('Tempos rápidos')}>
					{#each [30, 60, 90, 120] as seg (seg)}
						<button
							class="botao botao--secundario botao--pequeno"
							type="button"
							onclick={() => {
								tempoFala = seg;
								void aplicarTempo(seg);
							}}>{seg} s</button
						>
					{/each}
				</span>
			</div>

			{#if comDebate}
				<div class="relogio-debate">
					<p class="rotulo">{FORMAS[data.estado.forma]} · {t('tempo do debate')}</p>
					<Cronometro cronometro={relogioDebate(data.estado)} avisoSeg={60} {diferenca} />
					<div class="acoes">
						<button
							class="botao botao--secundario botao--pequeno"
							type="button"
							onclick={() => rpc(debatePausado ? 'retomar' : 'pausar', { p_comite: comite, p_relogio: 'debate' })}
							>{debatePausado ? t('Retomar o debate') : t('Pausar o debate')}</button
						>
						<button
							class="botao botao--secundario botao--pequeno"
							type="button"
							onclick={() => rpc('somar_segundos', { p_comite: comite, p_seg: 60, p_relogio: 'debate' })}>{t('+1 min')}</button
						>
						<button
							class="botao botao--secundario botao--pequeno"
							type="button"
							onclick={() => rpc('somar_segundos', { p_comite: comite, p_seg: -60, p_relogio: 'debate' })}>{t('−1 min')}</button
						>
					</div>
				</div>
			{/if}

			{#if data.fase !== 'plenaria'}
				<form class="formulario" onsubmit={mudarForma} aria-label={t('Forma de debate')}>
					<label class="campo">
						{t('Forma de debate')}
						<select bind:value={forma}>
							<option value="formal_informal">{FORMAS.formal_informal}</option>
							<option value="informal_informal">{FORMAS.informal_informal}</option>
						</select>
					</label>
					<label class="campo campo--curto">
						{forma === 'informal_informal'
							? t('Minutos (até {n} por sessão)', { n: data.regras.informal_informal_max_min })
							: t('Minutos (opcional)')}
						<input type="number" min="1" max="120" bind:value={minutos} required={forma === 'informal_informal'} />
					</label>
					<button class="botao botao--secundario">{t('Mudar a forma de debate')}</button>
					<p class="suave">
						{t('Informal-informal encerrado nesta sessão: {n} de {total} min', {
							n: sessao.informal_min_usados,
							total: data.regras.informal_informal_max_min
						})}
					</p>
				</form>
			{/if}
		</section>

		<div class="painel-coluna">
			{#if ehMesa && data.projetos.length}
				<section class="cartao" aria-labelledby="t-projetos">
					<h2 id="t-projetos">{t('Projetos de resolução')}</h2>
					<ul class="lista">
						{#each data.projetos as p (p.id)}
							<li>
								<span>
									{nomeDoDocumento(p)}
									<span class="detalhe">
										<span class="selo {STATUS_DOCUMENTO[p.status].selo}">{STATUS_DOCUMENTO[p.status].rotulo}</span>
										{#if p.status === 'aprovado_mesa'}· {p.aprovacao === 'consenso' ? t('os signatários pedem consenso') : t('os signatários pedem votação')}{/if}
									</span>
								</span>
								{#if p.status === 'aprovado_mesa' || (p.status === 'em_votacao' && !votacao?.aberta)}
									<span class="acoes">
										{#if p.status === 'aprovado_mesa'}
											<button
												class="botao botao--secundario botao--pequeno"
												type="button"
												aria-label={`Iniciar a votação (sala fechada): ${nomeDoDocumento(p)}`}
												onclick={() => rpc('iniciar_votacao_projeto', { p_documento: p.id })}>{t('Iniciar a votação')}</button
											>
										{/if}
										<button
											class="botao botao--pequeno"
											type="button"
											aria-label={`Abrir a votação: ${nomeDoDocumento(p)}`}
											onclick={() => rpc('abrir_votacao_projeto', { p_documento: p.id })}
											>{p.status === 'em_votacao' ? t('Abrir a votação final') : t('Abrir votação')}</button
										>
										{#if p.status === 'aprovado_mesa'}
										<button
											class="botao botao--secundario botao--pequeno"
											type="button"
											aria-label={`Aprovar por consenso: ${nomeDoDocumento(p)}`}
											onclick={() => rpc('aprovar_por_consenso', { p_documento: p.id })}>{t('Aprovar por consenso')}</button
										>
										{/if}
									</span>
								{/if}
							</li>
							{#if p.status === 'em_votacao' && !votacao?.aberta}
								{@const ops = data.operativas.filter((o) => o.documento_id === p.id)}
								<li>
									<fieldset class="opcoes">
										<legend>{t('Divisão da questão: operativas votadas em separado')}</legend>
										{#each ops as o, i (o.id)}
											<label class="opcao"><input type="checkbox" value={o.id} bind:group={parte} /> {i + 1}. {o.texto}</label>
										{/each}
										<button
											class="botao botao--secundario botao--pequeno"
											type="button"
											disabled={!parte.length}
											onclick={() => rpc('abrir_votacao_parte', { p_documento: p.id, p_clausulas: parte }).then(() => (parte = []))}
											>{t('Votar esta parte')}</button
										>
									</fieldset>
								</li>
							{/if}
						{/each}
					</ul>
				</section>
			{/if}
			{#if ehMesa && data.emendas.length && !votacao?.aberta}
				<section class="cartao" aria-labelledby="t-emendas">
					<h2 id="t-emendas">{t('Emendas')}</h2>
					<ul class="lista">
						{#each data.emendas as e (e.id)}
							<li>
								<span>
									{ACOES_EMENDA[e.acao]}{e.clausula ? `: "${e.clausula.texto}"` : ''}{e.texto ? ` → "${e.texto}"` : ''}
									<span class="detalhe"
										>{e.delegacao?.nome} ·
										<Contagem
											rotulo={t('{n} de {total} assinaturas', { n: e.assinaturas.length, total: data.regras.assinaturas_emenda })}
											itens={e.assinaturas.map((x) => ({ texto: nomeDe(x.delegacao_id), href: paginaDe(x.delegacao_id) }))}
										/></span
									>
								</span>
								<button
									class="botao botao--pequeno"
									type="button"
									disabled={e.assinaturas.length < data.regras.assinaturas_emenda}
									aria-label={`Votar a emenda de ${e.delegacao?.nome}`}
									onclick={() => rpc('abrir_votacao_emenda', { p_emenda: e.id })}>{t('Votar a emenda')}</button
								>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
			{#if votacao}
				<section class="cartao cartao--destaque" aria-labelledby="t-votacao">
					<h2 id="t-votacao">{votacao.aberta ? t('Votação aberta') : t('Última votação')}</h2>
					<p class="destaque">{votacao.objeto}</p>
					{#if votacao.aberta}
						<p>
							<Contagem
								rotulo={t('{n} de {total} votaram', { n: votacao.votos.length, total: votantes.length })}
								itens={votantes.map((d) => {
									const v = votacao.votos.find((x) => x.delegacao_id === d.id);
									return { texto: `${d.nome} · ${v ? ESCOLHAS[v.escolha] : t('falta votar')}`, href: paginaDe(d.id) };
								})}
							/> · {votacao.tipo === 'substantiva'
								? t('substantiva')
								: t('procedimental')}, {REGRAS_VOTACAO[votacao.regra]}
							{#if votacao.nominal}· <strong>{t('votação nominal')}</strong>, {t('em ordem alfabética')}{/if}
						</p>
						<GradeVotos delegacoes={votantes} votos={votacao.votos} />
						{#if ehMesa}
							<details bind:open={chamadaAberta}>
								<summary>{votacao.nominal ? t('Chamada nominal') : t('Registrar votos de placa')}</summary>
								<ul class="lista">
									{#each votantes as d (d.id)}
										{@const passou = votacao.passes.some((x) => x.delegacao_id === d.id)}
										{@const parteNaDisputa = votacao.partes.includes(d.id)}
										<li>
											<span>
												{d.nome}
												{#if passou}<span class="selo">{t('Passou a vez')}</span>{/if}
												{#if parteNaDisputa}<span class="selo selo--alerta">{t('Parte na disputa')}</span>{/if}
											</span>
											<span class="acoes">
												{#if votacao.nominal && !passou && !votacao.votos.some((v) => v.delegacao_id === d.id)}
													<button
														class="botao botao--secundario botao--pequeno"
														type="button"
														aria-label={`Passou a vez: ${d.nome}`}
														onclick={() => rpc('passar_vez', { p_votacao: votacao.id, p_delegacao: d.id })}>{t('Passou')}</button
													>
												{/if}
												{#if votacao.regra === 'csnu'}
													<button
														class="botao botao--secundario botao--pequeno"
														type="button"
														aria-label={`${parteNaDisputa ? t('Não é parte') : t('Parte na disputa')}: ${d.nome}`}
														onclick={() => rpc('marcar_parte', { p_votacao: votacao.id, p_delegacao: d.id, p_parte: !parteNaDisputa })}
														>{parteNaDisputa ? t('Não é parte') : t('Parte')}</button
													>
												{/if}
												{#each escolhasPermitidas(votacao.tipo, d.situacao, sessao.presenca.find((p) => p.delegacao_id === d.id)?.situacao) as escolha (escolha)}
													<button
														class="botao botao--secundario botao--pequeno"
														type="button"
														aria-label={`${ESCOLHAS[escolha]}: ${d.nome}`}
														onclick={() => registrar(d.id, escolha)}>{ESCOLHAS[escolha]}</button
													>
												{/each}
											</span>
										</li>
									{/each}
								</ul>
							</details>
						{/if}
						<button class="botao" type="button" onclick={() => rpc('encerrar_votacao', { p_votacao: votacao.id })}>
							{t('Encerrar a votação')}
						</button>
					{:else}
						<p>{textoResultado(votacao)}</p>
					{/if}
				</section>
			{/if}

			{#if ehMesa && !presidePeloBureau}
				<section class="cartao cartao--destaque" aria-labelledby="t-julgar">
					<h2 id="t-julgar">{t('Bureau · pedidos para aprovar')}</h2>
					<ul class="lista">
						{#each paraJulgar as ponto (ponto.id)}
							{@const nome = descreverPonto(ponto)}
							<li>
								<span>{nome} <span class="detalhe">{ponto.delegacao?.nome}{ponto.detalhe ? ` · ${ponto.detalhe}` : ''}</span></span>
								<span class="acoes">
									<button
										class="botao botao--pequeno"
										type="button"
										aria-label={t('Em ordem: {pedido}, {delegacao}', { pedido: nome, delegacao: ponto.delegacao?.nome ?? '' })}
										onclick={() => julgar(ponto.id, true)}>{t('Em ordem')}</button
									>
									<input
										class="motivo"
										maxlength="200"
										placeholder={t('Motivo (opcional)')}
										aria-label={t('Motivo da recusa: {pedido}', { pedido: nome })}
										bind:value={motivo[ponto.id]}
									/>
									<button
										class="botao botao--secundario botao--pequeno"
										type="button"
										aria-label={t('Fora de ordem: {pedido}, {delegacao}', { pedido: nome, delegacao: ponto.delegacao?.nome ?? '' })}
										onclick={() => julgar(ponto.id, false)}>{t('Fora de ordem')}</button
									>
								</span>
							</li>
						{:else}
							<li class="suave">{t('Nenhum pedido esperando o bureau.')}</li>
						{/each}
					</ul>
				</section>
			{/if}

			<section class="cartao" aria-labelledby="t-pontos">
				<h2 id="t-pontos">{t('Pontos e moções')}</h2>
				{#if !presidePeloBureau}<p class="suave">{t('A presidência concede os pedidos que o bureau aprovou.')}</p>{/if}
				<ul class="lista">
					{#each paraConceder as ponto (ponto.id)}
						{@const nome = descreverPonto(ponto)}
						<li>
							<span>
								{nome}
								{#if ponto.aprovado_bureau && ponto.status === 'aberto'}<span class="selo selo--ok">{t('Aprovado pelo bureau')}</span>{/if}
								<span class="detalhe"
									>{ponto.delegacao?.nome}{ponto.detalhe ? ` · ${ponto.detalhe}` : ''}{ponto.tipo === 'voto_desconfianca'
										? ` · ${t('{n} de {total} assinaturas', { n: ponto.assinaturas.length, total: assinaturasDesconfianca(data.regras.assinaturas_desconfianca_fracao, data.delegacoes) })}`
										: ''}</span
								>
							</span>
							<span class="acoes">
								{#if ponto.tipo === 'votacao_nominal' && ponto.status === 'aberto'}
									<button
										class="botao botao--pequeno"
										type="button"
										aria-label={`Reconhecer: ${nome}`}
										onclick={() => rpc('responder_ponto', { p_ponto: ponto.id, p_status: 'aceito' })}>{t('Reconhecer')}</button
									>
								{:else if ehPonto(ponto.tipo)}
									<button
										class="botao botao--pequeno"
										type="button"
										aria-label={`Aceitar: ${nome}, ${ponto.delegacao?.nome}`}
										onclick={() => rpc('responder_ponto', { p_ponto: ponto.id, p_status: 'aceito' })}>{t('Aceitar')}</button
									>
								{:else if ponto.status !== 'em_votacao'}
									{#if ponto.status === 'aberto' && MOCOES_COM_LISTA.includes(ponto.tipo as TipoPonto)}
										<button
											class="botao botao--pequeno"
											type="button"
											aria-label={`Abrir lista especial: ${nome}`}
											onclick={() => rpc('abrir_lista_especial', { p_ponto: ponto.id })}>{t('Abrir lista especial')}</button
										>
									{/if}
									<button
										class="botao botao--pequeno"
										type="button"
										aria-label={`Votar: ${nome}`}
										onclick={() => rpc('abrir_votacao', { p_ponto: ponto.id })}>{t('Votar')}</button
									>
								{/if}
								{#if ponto.status !== 'em_votacao'}
									<button
										class="botao botao--secundario botao--pequeno"
										type="button"
										aria-label={`${ehPonto(ponto.tipo) ? t('Recusar') : t('Fora de ordem')}: ${nome}, ${ponto.delegacao?.nome}`}
										onclick={() => rpc('responder_ponto', { p_ponto: ponto.id, p_status: 'recusado' })}
										>{ehPonto(ponto.tipo) ? t('Recusar') : t('Fora de ordem')}</button
									>
								{/if}
							</span>
						</li>
					{:else}
						<li class="suave">{t('Nenhum ponto ou moção.')}</li>
					{/each}
				</ul>
				{#if data.fase === 'debate'}
					<button class="botao botao--secundario" type="button" onclick={() => rpc('passar_presidencia', { p_comite: comite })}
						>{t('Passar a presidência')}</button
					>
				{/if}
			</section>
		</div>
	</div>
{/if}
