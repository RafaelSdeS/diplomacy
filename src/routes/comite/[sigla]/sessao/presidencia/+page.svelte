<script lang="ts">
	import { invalidate } from '$app/navigation';
	import type { Database } from '#lib/database.types.ts';
	import { nomeDoDocumento, STATUS_DOCUMENTO } from '#lib/formatacao.ts';
	import { assinaturasDesconfianca, REGRAS_VOTACAO } from '#lib/votacao.ts';
	import { descreverPonto, ehPonto, FORMAS, mensagemDeErro, MOCOES_COM_LISTA, type TipoPonto } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import Cronometro from '#lib/ui/Cronometro.svelte';
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
	const lista = $derived(listaAtiva(data.lista, emDiscussao?.id, data.fase));
	const proximo = $derived(proximoDaLista(lista));
	const pausado = $derived(data.estado?.cronometro_pausado_restante_seg !== null);
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
	const ACOES_EMENDA: Record<string, string> = { acrescentar: 'Acrescenta', suprimir: 'Suprime', modificar: 'Modifica' };
	const rpc = <F extends keyof Funcoes>(funcao: F, args: Funcoes[F]['Args']) => executar(supabase.rpc(funcao, args));

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

	// Atalhos: Espaço pausa ou retoma; Enter dá a palavra ao próximo da lista de
	// oradores ou, sem lista, ao primeiro da fila de placas. Só fora de campos e botões.
	function atalho(evento: KeyboardEvent) {
		const alvo = evento.target as HTMLElement;
		if (alvo.closest('input, textarea, select, button, a, dialog, [contenteditable]')) return;
		const seguinte = proximo?.delegacao?.id ?? fila[0]?.delegacao?.id;
		if (evento.key === ' ') {
			evento.preventDefault();
			void pausarOuRetomar();
		} else if (evento.key === 'Enter' && seguinte) {
			evento.preventDefault();
			void darPalavra(seguinte);
		}
	}
</script>

<svelte:window onkeydown={data.podePresidir && sessao ? atalho : undefined} />

<svelte:head>
	<title>Presidência · {data.comite.sigla} · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">Comitê · {data.comite.sigla} <AoVivo comiteId={data.comite.id} bind:diferenca /></p>
<h1>Presidência</h1>

{#if !data.podePresidir}
	<p class="suave">Você não preside esta sessão. Quando for a vez da sua delegação, o painel aparece aqui.</p>
{:else if !data.estado || !sessao}
	<p class="suave">Nenhuma sessão aberta. A mesa abre a sessão na chamada.</p>
{:else}
	<p class="suave">
		Sessão {sessao.numero} · {FASES[data.fase]} · {FORMAS[data.estado.forma]} · Presidência: {presidenciaEmVigor(
			data.fase,
			data.estado.mesa_assumiu,
			sessao.presidencia?.nome
		)}
	</p>
	<p class="suave atalhos-ajuda">
		Atalhos: <kbd>Espaço</kbd> pausa ou retoma; <kbd>Enter</kbd> dá a palavra ao próximo da lista ou da fila.
	</p>

	{#if erro}
		<p class="erro" role="alert">{erro}</p>
	{/if}

	{#if ehMesa && data.fase === 'plenaria'}
		<section class="cartao cartao--destaque" aria-labelledby="t-plenaria">
			<h2 id="t-plenaria">Plenária de abertura</h2>
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
				<p class="suave">Uma delegação propõe o tópico no topo; a votação dessa moção encerra a plenária.</p>
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
				{data.estado.mesa_assumiu ? 'Devolver a presidência à delegação' : 'Mesa assume a presidência'}
			</button>
		</p>
	{/if}

	<div class="painel">
		<div class="painel-coluna">
			{#if lista.length}
				<section class="cartao" aria-labelledby="t-lista">
					<h2 id="t-lista">{emDiscussao ? 'Lista especial' : 'Lista de oradores'}</h2>
					<ol class="lista">
						{#each lista as inscricao (inscricao.id)}
							<li aria-current={inscricao.id === proximo?.id ? 'step' : undefined}>
								<span class="com-bandeira"
									><Bandeira codigo={inscricao.delegacao?.bandeira} /> {inscricao.delegacao?.nome}</span
								>
								{#if inscricao.lado}<span class="selo">{inscricao.lado === 'a_favor' ? 'A favor' : 'Contra'}</span>{/if}
								{#if inscricao.falou}<span class="selo selo--ok">Falou</span>{/if}
							</li>
						{/each}
					</ol>
					{#if proximo}
						<button class="botao" type="button" onclick={() => darPalavra(proximo.delegacao!.id)}>
							Dar a palavra a {proximo.delegacao?.nome}
						</button>
					{/if}
				</section>
			{/if}

			<section class="cartao" aria-labelledby="t-fila">
				<h2 id="t-fila">Pedidos de fala</h2>
				<ol class="lista">
					{#each fila as pedido (pedido.id)}
						<li>
							<span class="com-bandeira"><Bandeira codigo={pedido.delegacao?.bandeira} /> {pedido.delegacao?.nome}</span>
							<button
								class="botao botao--pequeno"
								type="button"
								aria-label={`Dar a palavra a ${pedido.delegacao?.nome}`}
								onclick={() => darPalavra(pedido.delegacao!.id)}>Dar a palavra</button
							>
						</li>
					{:else}
						<li class="suave">Nenhuma placa levantada.</li>
					{/each}
				</ol>
				{#if ehMesa && data.comite.tecnologia_restrita}
					<form
						class="acoes"
						aria-label="Registrar pedido de fala"
						onsubmit={(e) => {
							e.preventDefault();
							if (pedidoDe) void rpc('registrar_pedido_fala', { p_comite: comite, p_delegacao: pedidoDe });
						}}
					>
						<label class="campo">
							Delegação que levantou a placa
							<select bind:value={pedidoDe}>
								{#each data.delegacoes as d (d.id)}<option value={d.id}>{d.nome}</option>{/each}
							</select>
						</label>
						<button class="botao botao--secundario botao--pequeno">Registrar pedido de fala</button>
					</form>
				{/if}
			</section>
		</div>

		<section class="cartao" aria-labelledby="t-palavra">
			<h2 id="t-palavra">Com a palavra</h2>
			{#if data.estado.orador}
				<p class="destaque com-bandeira"><Bandeira codigo={data.estado.orador.bandeira} /> {data.estado.orador.nome}</p>
			{:else}
				<p class="suave">Ninguém com a palavra.</p>
			{/if}
			<Cronometro cronometro={data.estado} avisoSeg={data.regras.aviso_fala_seg} {diferenca} grande />
			<div class="acoes">
				<button class="botao" type="button" disabled={!pausado && !correndo} onclick={pausarOuRetomar}>
					{pausado ? 'Retomar' : 'Pausar'}
				</button>
				<button
					class="botao botao--secundario"
					type="button"
					disabled={!data.estado.cronometro_inicio}
					onclick={() => rpc('somar_segundos', { p_comite: comite, p_seg: 30 })}>+30 s</button
				>
				<button
					class="botao botao--secundario"
					type="button"
					disabled={!data.estado.cronometro_inicio}
					onclick={() => rpc('somar_segundos', { p_comite: comite, p_seg: -10 })}>−10 s</button
				>
				<button class="botao botao--secundario" type="button" disabled={!data.estado.orador} onclick={() => darPalavra(null)}
					>Encerrar fala</button
				>
			</div>
			<label class="campo campo--curto">
				Tempo de fala (segundos)
				<input type="number" min="1" max="3600" bind:value={tempoFala} />
			</label>

			{#if data.fase !== 'plenaria'}
				<form class="formulario" onsubmit={mudarForma} aria-label="Forma de debate">
					<label class="campo">
						Forma de debate
						<select bind:value={forma}>
							<option value="formal_informal">{FORMAS.formal_informal}</option>
							<option value="informal_informal">{FORMAS.informal_informal}</option>
						</select>
					</label>
					<label class="campo campo--curto">
						Minutos {forma === 'informal_informal'
							? `(até ${data.regras.informal_informal_max_min} por sessão)`
							: '(opcional)'}
						<input type="number" min="1" max="120" bind:value={minutos} required={forma === 'informal_informal'} />
					</label>
					<button class="botao botao--secundario">Mudar a forma de debate</button>
				</form>
			{/if}
		</section>

		<div class="painel-coluna">
			{#if ehMesa && data.projetos.length}
				<section class="cartao" aria-labelledby="t-projetos">
					<h2 id="t-projetos">Projetos de resolução</h2>
					<ul class="lista">
						{#each data.projetos as p (p.id)}
							<li>
								<span>
									{nomeDoDocumento(p)}
									<span class="detalhe">
										<span class="selo {STATUS_DOCUMENTO[p.status].selo}">{STATUS_DOCUMENTO[p.status].rotulo}</span>
										{#if p.status === 'aprovado_mesa'}· os signatários pedem {p.aprovacao === 'consenso' ? 'consenso' : 'votação'}{/if}
									</span>
								</span>
								{#if p.status === 'aprovado_mesa' || (p.status === 'em_votacao' && !votacao?.aberta)}
									<span class="acoes">
										{#if p.status === 'aprovado_mesa'}
											<button
												class="botao botao--secundario botao--pequeno"
												type="button"
												aria-label={`Iniciar a votação (sala fechada): ${nomeDoDocumento(p)}`}
												onclick={() => rpc('iniciar_votacao_projeto', { p_documento: p.id })}>Iniciar a votação</button
											>
										{/if}
										<button
											class="botao botao--pequeno"
											type="button"
											aria-label={`Abrir a votação: ${nomeDoDocumento(p)}`}
											onclick={() => rpc('abrir_votacao_projeto', { p_documento: p.id })}
											>{p.status === 'em_votacao' ? 'Abrir a votação final' : 'Abrir votação'}</button
										>
										{#if p.status === 'aprovado_mesa'}
										<button
											class="botao botao--secundario botao--pequeno"
											type="button"
											aria-label={`Aprovar por consenso: ${nomeDoDocumento(p)}`}
											onclick={() => rpc('aprovar_por_consenso', { p_documento: p.id })}>Aprovar por consenso</button
										>
										{/if}
									</span>
								{/if}
							</li>
							{#if p.status === 'em_votacao' && !votacao?.aberta}
								{@const ops = data.operativas.filter((o) => o.documento_id === p.id)}
								<li>
									<fieldset class="opcoes">
										<legend>Divisão da questão: operativas votadas em separado</legend>
										{#each ops as o, i (o.id)}
											<label class="opcao"><input type="checkbox" value={o.id} bind:group={parte} /> {i + 1}. {o.texto}</label>
										{/each}
										<button
											class="botao botao--secundario botao--pequeno"
											type="button"
											disabled={!parte.length}
											onclick={() => rpc('abrir_votacao_parte', { p_documento: p.id, p_clausulas: parte }).then(() => (parte = []))}
											>Votar esta parte</button
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
					<h2 id="t-emendas">Emendas</h2>
					<ul class="lista">
						{#each data.emendas as e (e.id)}
							<li>
								<span>
									{ACOES_EMENDA[e.acao]}{e.clausula ? `: "${e.clausula.texto}"` : ''}{e.texto ? ` → "${e.texto}"` : ''}
									<span class="detalhe">{e.delegacao?.nome} · {e.assinaturas.length} de {data.regras.assinaturas_emenda} assinaturas</span>
								</span>
								<button
									class="botao botao--pequeno"
									type="button"
									disabled={e.assinaturas.length < data.regras.assinaturas_emenda}
									aria-label={`Votar a emenda de ${e.delegacao?.nome}`}
									onclick={() => rpc('abrir_votacao_emenda', { p_emenda: e.id })}>Votar a emenda</button
								>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
			{#if votacao}
				<section class="cartao cartao--destaque" aria-labelledby="t-votacao">
					<h2 id="t-votacao">{votacao.aberta ? 'Votação aberta' : 'Última votação'}</h2>
					<p class="destaque">{votacao.objeto}</p>
					{#if votacao.aberta}
						<p>
							{votacao.votos.length} de {votantes.length} votaram · {votacao.tipo === 'substantiva'
								? 'substantiva'
								: 'procedimental'}, {REGRAS_VOTACAO[votacao.regra]}
							{#if votacao.nominal}· <strong>votação nominal</strong>, em ordem alfabética{/if}
						</p>
						<GradeVotos delegacoes={votantes} votos={votacao.votos} />
						{#if ehMesa}
							<details bind:open={chamadaAberta}>
								<summary>{votacao.nominal ? 'Chamada nominal' : 'Registrar votos de placa'}</summary>
								<ul class="lista">
									{#each votantes as d (d.id)}
										{@const passou = votacao.passes.some((x) => x.delegacao_id === d.id)}
										{@const parteNaDisputa = votacao.partes.includes(d.id)}
										<li>
											<span>
												{d.nome}
												{#if passou}<span class="selo">Passou a vez</span>{/if}
												{#if parteNaDisputa}<span class="selo selo--alerta">Parte na disputa</span>{/if}
											</span>
											<span class="acoes">
												{#if votacao.nominal && !passou && !votacao.votos.some((v) => v.delegacao_id === d.id)}
													<button
														class="botao botao--secundario botao--pequeno"
														type="button"
														aria-label={`Passou a vez: ${d.nome}`}
														onclick={() => rpc('passar_vez', { p_votacao: votacao.id, p_delegacao: d.id })}>Passou</button
													>
												{/if}
												{#if votacao.regra === 'csnu'}
													<button
														class="botao botao--secundario botao--pequeno"
														type="button"
														aria-label={`${parteNaDisputa ? 'Não é parte' : 'Parte na disputa'}: ${d.nome}`}
														onclick={() => rpc('marcar_parte', { p_votacao: votacao.id, p_delegacao: d.id, p_parte: !parteNaDisputa })}
														>{parteNaDisputa ? 'Não é parte' : 'Parte'}</button
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
							Encerrar a votação
						</button>
					{:else}
						<p>{textoResultado(votacao)}</p>
					{/if}
				</section>
			{/if}

			<section class="cartao" aria-labelledby="t-pontos">
				<h2 id="t-pontos">Pontos e moções</h2>
				<ul class="lista">
					{#each pontosAbertos as ponto (ponto.id)}
						{@const nome = descreverPonto(ponto)}
						<li>
							<span>
								{nome}
								<span class="detalhe"
									>{ponto.delegacao?.nome}{ponto.detalhe ? ` · ${ponto.detalhe}` : ''}{ponto.tipo === 'voto_desconfianca'
										? ` · ${ponto.assinaturas.length} de ${assinaturasDesconfianca(data.regras.assinaturas_desconfianca_fracao, data.delegacoes)} assinaturas`
										: ''}</span
								>
							</span>
							<span class="acoes">
								{#if ponto.tipo === 'votacao_nominal' && ponto.status === 'aberto'}
									<button
										class="botao botao--pequeno"
										type="button"
										aria-label={`Reconhecer: ${nome}`}
										onclick={() => rpc('responder_ponto', { p_ponto: ponto.id, p_status: 'aceito' })}>Reconhecer</button
									>
								{:else if ehPonto(ponto.tipo)}
									<button
										class="botao botao--pequeno"
										type="button"
										aria-label={`Aceitar: ${nome}, ${ponto.delegacao?.nome}`}
										onclick={() => rpc('responder_ponto', { p_ponto: ponto.id, p_status: 'aceito' })}>Aceitar</button
									>
								{:else if ponto.status !== 'em_votacao'}
									{#if ponto.status === 'aberto' && MOCOES_COM_LISTA.includes(ponto.tipo as TipoPonto)}
										<button
											class="botao botao--pequeno"
											type="button"
											aria-label={`Abrir lista especial: ${nome}`}
											onclick={() => rpc('abrir_lista_especial', { p_ponto: ponto.id })}>Abrir lista especial</button
										>
									{/if}
									<button
										class="botao botao--pequeno"
										type="button"
										aria-label={`Votar: ${nome}`}
										onclick={() => rpc('abrir_votacao', { p_ponto: ponto.id })}>Votar</button
									>
								{/if}
								{#if ponto.status !== 'em_votacao'}
									<button
										class="botao botao--secundario botao--pequeno"
										type="button"
										aria-label={`${ehPonto(ponto.tipo) ? 'Recusar' : 'Fora de ordem'}: ${nome}, ${ponto.delegacao?.nome}`}
										onclick={() => rpc('responder_ponto', { p_ponto: ponto.id, p_status: 'recusado' })}
										>{ehPonto(ponto.tipo) ? 'Recusar' : 'Fora de ordem'}</button
									>
								{/if}
							</span>
						</li>
					{:else}
						<li class="suave">Nenhum ponto ou moção.</li>
					{/each}
				</ul>
				{#if data.fase === 'debate'}
					<button class="botao botao--secundario" type="button" onclick={() => rpc('passar_presidencia', { p_comite: comite })}
						>Passar a presidência</button
					>
				{/if}
			</section>
		</div>
	</div>
{/if}
