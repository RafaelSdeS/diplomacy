<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { contador } from '#lib/contador.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import Confirmar from '#lib/ui/Confirmar.svelte';
	// "Encerrar a coletiva" fica fora do formulário de abrir: o modal tem o próprio
	// <form method="dialog">, e formulário não se aninha.
	import { invalidate } from '$app/navigation';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Escolha from '#lib/ui/Escolha.svelte';
	import AcaoEmModal from '#lib/ui/AcaoEmModal.svelte';
	import MessageSquarePlus from '@lucide/svelte/icons/message-square-plus';
	import NomeDelegacao from '#lib/ui/NomeDelegacao.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import { andamentoDaPauta, SITUACAO_COLETIVA } from '#lib/press.ts';
	import { formatarTempo } from '#lib/cronometro.ts';
	import { guardarRascunho } from '#lib/rascunho.ts';
	import { goto } from '$app/navigation';
	import { dica } from '#lib/dica.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let novaPergunta = $state<AcaoEmModal>();
	let titulo = $state('Coletiva de imprensa');
	let delegacao = $state('');
	let pergunta = $state('');
	let erro = $state('');
	let mensagem = $state('');

	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, ok: string) {
		erro = mensagem = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		else mensagem = ok;
		await invalidate('app:coletiva');
		return !error;
	}

	// Passo 45, parte B: o que está em andamento, a próxima e o cartão da delegação chamada.
	const andamento = $derived(andamentoDaPauta(data.perguntas));
	const minhaChamada = $derived(
		data.perguntas.find((p) => (p.status === 'chamando' || p.status === 'respondendo') && data.minhasDelegacoes.includes(p.delegacao?.id ?? ''))
	);
	let agora = $state(Date.now());
	$effect(() => {
		const relogio = setInterval(() => (agora = Date.now()), 1000);
		return () => clearInterval(relogio);
	});
	const decorrido = (inicio: string | null) => formatarTempo(Math.max(0, Math.round((agora - Date.parse(inicio ?? '')) / 1000)) || 0);

	// A nota da press depois da fala, e a matéria montada a partir das notas.
	let modalNota = $state<Modal>();
	let notaDe = $state('');
	let notaTexto = $state('');
	function abrirNota(id: string, atual: string | null) {
		notaDe = id;
		notaTexto = atual ?? '';
		modalNota?.abrir();
	}
	function escreverMateria() {
		const minhas = data.perguntas.filter((p) => p.status === 'concluida' && data.comitesPress.includes(p.comite_id));
		const rascunho = minhas
			.map((p) => `${p.delegacao?.nome}: "${p.texto ?? ''}"${p.nota ? `\n\n${p.nota}` : ''}`)
			.join('\n\n');
		guardarRascunho('noticia', rascunho);
		void goto('/press/escrever');
	}
</script>

<svelte:head>
	<title>{tituloDaAba(t('Coletiva'), t('Press'))}</title>
</svelte:head>

<p class="rotulo">
	{t('Press · Simulação')}
	<AoVivo eventoId={data.evento} tabelas={['coletiva', 'coletiva_pergunta']} dependencia="app:coletiva" />
</p>
<h1>{t('Coletiva de imprensa')}</h1>
<p class="suave">
	{t('Cada jornalista escolhe até 4 delegações do próprio comitê, com uma pergunta para cada. Depois da coletiva, a resposta vira matéria.')}
</p>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

{#if data.diretoria}
	<form
		class="formulario"
		aria-label={t('Abrir coletiva')}
		onsubmit={(e) => {
			e.preventDefault();
			void executar(supabase.rpc('abrir_coletiva', { p_evento: data.evento, p_titulo: titulo }), t('Coletiva aberta.'));
		}}
	>
		<label class="campo">
			{t('Título da coletiva')}
			<input required maxlength="200" bind:value={titulo} {@attach contador(titulo)} />
		</label>
		<button class="botao" {@attach dica(t('Começa uma coletiva com este título; a press já pode mandar perguntas.'))}>{t('Abrir uma coletiva')}</button>
	</form>
	{#if data.coletiva?.aberta}
		<Confirmar
			rotulo={t('Encerrar a coletiva')}
			classe="botao botao--secundario"
			pergunta={t('Encerrar a coletiva?')}
			explicacao={t('A press não pode mais enviar perguntas a esta coletiva.')}
			acao={() => executar(supabase.rpc('encerrar_coletiva', { p_coletiva: data.coletiva!.id }), t('Coletiva encerrada.'))}
		/>
	{/if}
{/if}

{#if data.coletiva}
	<section aria-labelledby="t-pauta">
		<h2 id="t-pauta">{data.coletiva.titulo} {data.coletiva.aberta ? '' : '(encerrada)'}</h2>
		{#if data.souPress && data.coletiva.aberta}
			<div class="acoes">
				<AcaoEmModal
					bind:this={novaPergunta}
					rotulo={t('Nova pergunta')}
					icone={MessageSquarePlus}
					descricao={t('A pergunta entra na pauta da coletiva, para a delegação escolhida.')}
				>
					<form
						class="formulario"
						aria-label={t('Nova pergunta')}
						onsubmit={async (e) => {
							e.preventDefault();
							if (await executar(supabase.rpc('perguntar_na_coletiva', { p_coletiva: data.coletiva!.id, p_delegacao: delegacao, p_pergunta: pergunta }), t('Pergunta na pauta.'))) {
								pergunta = '';
								novaPergunta?.fechar();
							}
						}}
					>
						<Escolha unica rotulo={t('Delegação')} botao={t('Escolher')} opcoes={data.delegacoes} bind:valor={delegacao} />
						<label class="campo">
							{t('Pergunta')}
							<input required maxlength="300" bind:value={pergunta} {@attach contador(pergunta)} />
						</label>
						{#if erro}<p class="erro">{erro}</p>{/if}
						<div class="acoes">
							<button class="botao" {@attach dica(t('Põe a pergunta na fila da coletiva; a delegação só a ouve na hora.'))}>{t('Pôr na pauta')}</button>
							<button class="botao botao--secundario" type="button" onclick={() => novaPergunta?.fechar()}>{t('Cancelar')}</button>
						</div>
					</form>
				</AcaoEmModal>
			</div>
		{/if}
		<!-- Passo 45, parte B: a delegação chamada vê o aviso, sem a pergunta, até começar a responder. -->
		{#if minhaChamada}
			<article class="cartao cartao--destaque coletiva-chamada" aria-labelledby="t-chamada">
				<h3 id="t-chamada">{minhaChamada.status === 'chamando' ? t('Sua delegação foi chamada') : t('Sua delegação está respondendo')}</h3>
				<p>{minhaChamada.veiculo?.nome} · {data.coletiva.titulo}</p>
				{#if minhaChamada.status === 'chamando'}
					<p class="destaque">{t('Aguarde o microfone: a pergunta é feita em voz alta.')}</p>
					{#if minhaChamada.presente}
						<p><span class="selo selo--ok">{t('A Diretoria sabe que vocês estão prontos.')}</span></p>
					{:else}
						<button
							class="botao"
							type="button"
							onclick={() =>
								executar(supabase.rpc('confirmar_chamada_coletiva', { p_pergunta: minhaChamada!.id }), t('A Diretoria sabe que vocês estão prontos.'))}
							{@attach dica(t('Avisa a Diretoria que a delegação está pronta para responder.'))}
							>{t('Estamos prontos')}</button
						>
					{/if}
				{:else}
					{#if minhaChamada.texto}<p class="telegrama">{minhaChamada.texto}</p>{/if}
					<p class="suave">{t('Respondendo há {tempo}', { tempo: decorrido(minhaChamada.resposta_iniciada_em) })}</p>
				{/if}
			</article>
		{/if}

		{#if data.diretoria && data.coletiva.aberta}
			<article class="cartao cartao--destaque" aria-labelledby="t-conduzir">
				<h3 id="t-conduzir">{t('Conduzir a coletiva')}</h3>
				{#if andamento.atual}
					{@const a = andamento.atual}
					<p>
						<span class="selo {SITUACAO_COLETIVA[a.status].selo}">{SITUACAO_COLETIVA[a.status].rotulo}</span>
						<strong><NomeDelegacao sigla={a.delegacao?.comite?.sigla ?? ''} delegacao={a.delegacao} /></strong>
						· {a.veiculo?.nome}
						{#if a.presente}<span class="selo selo--ok">{t('prontos')}</span>{/if}
					</p>
					{#if a.texto}<p class="telegrama">{a.texto}</p>{/if}
					{#if a.status === 'respondendo'}<p class="suave">{t('Respondendo há {tempo}', { tempo: decorrido(a.resposta_iniciada_em) })}</p>{/if}
					<div class="acoes">
						{#if a.status === 'chamando'}
							<button class="botao" type="button" onclick={() => executar(supabase.rpc('iniciar_resposta_coletiva', { p_pergunta: a.id }), t('Resposta em andamento.'))}
								{@attach dica(t('Mostra a pergunta à delegação e começa a contar o tempo da resposta.'))}
								>{t('Iniciar resposta')}</button
							>
							<button
								class="botao botao--secundario"
								type="button"
								onclick={() => executar(supabase.rpc('adiar_pergunta_coletiva', { p_pergunta: a.id }), t('A pergunta foi para o fim da pauta.'))}
								{@attach dica(t('Manda esta pergunta para o fim da fila e segue com a próxima.'))}
								>{t('Para o fim da pauta')}</button
							>
						{:else}
							<Confirmar
								rotulo={t('Concluir resposta')}
								pergunta={t('Concluir a resposta de {delegacao}?', { delegacao: a.delegacao?.nome ?? '' })}
								explicacao={t('A pauta segue para a próxima pergunta.')}
								acao={() => executar(supabase.rpc('concluir_resposta_coletiva', { p_pergunta: a.id }), t('Resposta concluída.'))}
							/>
						{/if}
						<Confirmar
							classe="botao botao--secundario"
							rotulo={t('Retirar')}
							pergunta={t('Retirar a pergunta de {veiculo} a {delegacao}?', { veiculo: a.veiculo?.nome ?? '', delegacao: a.delegacao?.nome ?? '' })}
							explicacao={t('Ela sai da pauta e não conta no limite do veículo.')}
							acao={() => executar(supabase.rpc('retirar_pergunta_da_coletiva', { p_pergunta: a.id }), t('Pergunta retirada.'))}
						/>
					</div>
				{:else if andamento.proxima}
					{@const prox = andamento.proxima}
					<p>{t('Próxima')}: <strong><NomeDelegacao sigla={prox.delegacao?.comite?.sigla ?? ''} delegacao={prox.delegacao} /></strong> · {prox.veiculo?.nome}</p>
					<button class="botao" type="button" onclick={() => executar(supabase.rpc('chamar_na_coletiva', { p_pergunta: prox.id }), t('Delegação chamada.'))}
						{@attach dica(t('Avisa a próxima delegação da pauta que chegou a vez dela.'))}
						>{t('Chamar a próxima')}</button
					>
				{:else}
					<p class="suave">{t('Nenhuma pergunta esperando na pauta.')}</p>
				{/if}
				<p><a class="botao botao--secundario botao--pequeno" href="/telao/coletiva" {@attach dica(t('Abre a tela da coletiva para projetar na sala.'))}>{t('Abrir o telão da coletiva')}</a></p>
			</article>
		{/if}

		<ol class="lista" aria-label={t('Pauta')}>
			{#each data.perguntas as p (p.id)}
				<li>
					<span>
						<span class="selo {SITUACAO_COLETIVA[p.status].selo}">{SITUACAO_COLETIVA[p.status].rotulo}</span>
						<strong><NomeDelegacao sigla={p.delegacao?.comite?.sigla ?? ''} delegacao={p.delegacao} /></strong>
						<span class="detalhe">{p.veiculo?.nome}</span>
						{#if p.texto}{p.texto}{:else}<span class="suave">{t('a pergunta só é conhecida quando for feita em voz alta')}</span>{/if}
						{#if p.status === 'retirada' && p.retirada_motivo}<span class="detalhe">{p.retirada_motivo}</span>{/if}
						{#if p.nota}<span class="detalhe">{t('Nota')}: {p.nota}</span>{/if}
					</span>
					{#if p.status === 'concluida' && data.comitesPress.includes(p.comite_id)}
						<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => abrirNota(p.id, p.nota)}
							{@attach dica(t('Guarda o que a delegação disse, para usar na matéria.'))}
							>{p.nota ? t('Editar a nota') : t('Anotar a fala')}</button
						>
					{/if}
				</li>
			{:else}
				<li class="suave">{t('Nenhuma pergunta na pauta ainda.')}</li>
			{/each}
		</ol>
		{#if data.perguntas.some((p) => p.status === 'concluida' && data.comitesPress.includes(p.comite_id))}
			<p><button class="botao botao--secundario" type="button" onclick={escreverMateria} {@attach dica(t('Abre o editor de matéria já com as falas e as notas do seu veículo.'))}>
{t('Escrever a matéria da coletiva')}</button></p>
		{/if}
		<Modal bind:this={modalNota} rotulo="t-nota-fala" classe="modal-acao">
			<h3 id="t-nota-fala">{t('Nota da fala')}</h3>
			<p class="suave">{t('Só o seu veículo e a Diretoria leem. Serve de base para a matéria.')}</p>
			<form
				class="formulario"
				onsubmit={async (e) => {
					e.preventDefault();
					if (await executar(supabase.rpc('salvar_nota_coletiva', { p_pergunta: notaDe, p_texto: notaTexto }), t('Nota guardada.'))) modalNota?.fechar();
				}}
			>
				<label class="campo">
					{t('O que a delegação disse')}
					<textarea required rows="4" maxlength="1000" bind:value={notaTexto} {@attach contador(notaTexto)}></textarea>
				</label>
				<div class="acoes">
					<button class="botao">{t('Guardar a nota')}</button>
					<button class="botao botao--secundario" type="button" onclick={() => modalNota?.fechar()}>{t('Cancelar')}</button>
				</div>
			</form>
		</Modal>
	</section>
{:else}
	<p class="suave">{t('Nenhuma coletiva aberta.')}</p>
{/if}
