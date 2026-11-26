<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { contador } from '#lib/contador.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { tick, untrack } from 'svelte';
	import { invalidate } from '$app/navigation';
	import {
		esperando,
		formatarEspera,
		minutosDesde,
		ordenarFila,
		respostasProntas,
		resumoDaFila,
		SELO_NOTA,
		STATUS_NOTA,
		type StatusNota
	} from '#lib/crise.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { pedirNotificacao } from '#lib/push.ts';
	import { supabase } from '#lib/supabase.ts';
	import { TABELAS_CRISE } from '#lib/tempo-real.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import NomeDelegacao from '#lib/ui/NomeDelegacao.svelte';
	import AlertaCrise from '#lib/ui/AlertaCrise.svelte';
	import Escolha from '#lib/ui/Escolha.svelte';
	import AcaoEmModal from '#lib/ui/AcaoEmModal.svelte';
	import { dica } from '#lib/dica.ts';
	import Modal from '#lib/ui/Modal.svelte';
	import Siren from '@lucide/svelte/icons/siren';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import FlagOff from '@lucide/svelte/icons/flag-off';
	import type { PageProps, Snapshot } from './$types';

	let { data }: PageProps = $props();

	const ehCrise = $derived(
		data.participacoes.some((p) => (p.papel === 'crise' && p.comite_id === data.comite.id) || p.papel === 'secretaria')
	);
	// Os comitês em que a pessoa é da crise: uma atualização pode valer para vários.
	const meusComites = $derived(
		data.participacoes.filter((p) => p.papel === 'crise' && p.comite_id).map((p) => ({ id: p.comite_id!, sigla: p.comite_sigla! }))
	);

	let diferenca = $state(0);
	let agora = $state(Date.now());
	$effect(() => {
		const relogio = setInterval(() => (agora = Date.now()), 30_000);
		return () => clearInterval(relogio);
	});

	let filtro = $state('');
	let soEsperando = $state(false);
	let aberta = $state<string | null>(null);
	let selecionadas = $state<string[]>([]);
	let resposta = $state('');
	let erro = $state('');
	let mensagem = $state('');
	let atualizacao = $state('');
	let comitesDaAtualizacao = $state<string[]>(untrack(() => [data.comite.id]));

	// Passo 35: crise com prazo.
	const ativos = $derived(data.incidentes.filter((i) => !i.encerrado_em));
	let crise = $state({ titulo: '', texto: '', minutos: 20 });
	let comitesDaCrise = $state<string[]>(untrack(() => [data.comite.id]));
	let efeitos = $state<{ delegacao_id: string; texto: string; minutos: number | null }[]>([]);
	let desfecho = $state<Record<string, { resultado: string; texto: string }>>({});
	// Passo 51 (lote da crise): lançar, atualizar e encerrar abrem num modal; o erro aparece nele.
	let modalLancar = $state<AcaoEmModal>();
	let modalAtualizar = $state<AcaoEmModal>();
	let modalAtualizacoes = $state<Modal>();
	let modalEncerrar = $state<Modal>();
	let encerrando = $state<string | null>(null);
	let erroModal = $state('');
	const emEncerramento = $derived(ativos.find((i) => i.id === encerrando));
	$effect(() => {
		for (const i of ativos) if (!desfecho[i.id]) desfecho[i.id] = { resultado: 'resolvido', texto: '' };
	});

	async function lancar(evento: SubmitEvent) {
		evento.preventDefault();
		erro = erroModal = mensagem = '';
		const { data: id, error } = await supabase.rpc('lancar_incidente', {
			p_comites: comitesDaCrise,
			p_titulo: crise.titulo,
			p_texto: crise.texto,
			p_minutos: crise.minutos,
			p_efeitos: efeitos
				.filter((e) => e.delegacao_id && e.texto)
				.map((e) => ({ delegacao_id: e.delegacao_id, texto: e.texto, ...(e.minutos ? { minutos: e.minutos } : {}) }))
		});
		if (error) erroModal = mensagemDeErro(error);
		else {
			modalLancar?.fechar();
			pedirNotificacao('crise', [id]);
			mensagem = t('Crise lançada.');
			crise = { titulo: '', texto: '', minutos: 20 };
			efeitos = [];
		}
		await invalidate('app:crise');
	}

	async function encerrar(id: string) {
		erro = erroModal = mensagem = '';
		const d = desfecho[id] ?? { resultado: 'resolvido', texto: '' };
		const { error } = await supabase.rpc('encerrar_incidente', { p_id: id, p_desfecho: d.resultado, p_texto: d.texto });
		if (error) erroModal = mensagemDeErro(error);
		else {
			mensagem = t('Crise encerrada.');
			modalEncerrar?.fechar();
		}
		await invalidate('app:crise');
	}

	const fila = $derived(
		ordenarFila(data.notas).filter(
			(n) => (!filtro || n.delegacao?.id === filtro) && (!soEsperando || esperando(n.status))
		)
	);
	const resumo = $derived(resumoDaFila(data.notas, agora + diferenca));
	const delegacoes = $derived(
		[...new Map(data.notas.map((n) => [n.delegacao?.id, n.delegacao])).values()]
			.filter((d) => d !== null && d !== undefined)
			.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
	);
	const notaAberta = $derived(data.notas.find((n) => n.id === aberta));
	const alvos = $derived(selecionadas.length ? selecionadas : aberta ? [aberta] : []);

	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, ok = '') {
		erro = mensagem = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		else mensagem = ok;
		await invalidate('app:crise');
		return !error;
	}

	async function abrir(id: string) {
		aberta = id;
		await tick();
		// No celular a nota aberta fica abaixo da fila: rola até ela.
		document.getElementById('nota-aberta')?.scrollIntoView({ block: 'start' });
	}

	async function responder(status: StatusNota) {
		const ok = await executar(
			supabase.rpc('responder_notas', { p_ids: alvos, p_status: status, p_resposta: resposta }),
			alvos.length > 1 ? t('{n} notas respondidas.', { n: alvos.length }) : t('Nota respondida.')
		);
		if (ok) {
			pedirNotificacao('nota', alvos);
			resposta = '';
			selecionadas = [];
		}
	}

	async function publicar(evento: SubmitEvent) {
		evento.preventDefault();
		erro = erroModal = mensagem = '';
		const { error } = await supabase.rpc('publicar_atualizacao', { p_comites: comitesDaAtualizacao, p_texto: atualizacao });
		if (error) erroModal = mensagemDeErro(error);
		else {
			mensagem = t('Atualização publicada.');
			atualizacao = '';
			modalAtualizar?.fechar();
		}
		await invalidate('app:crise');
	}

	// O "Voltar" devolve o filtro e a nota aberta (snapshot do SvelteKit).
	export const snapshot: Snapshot<[string, boolean, string | null]> = {
		capture: () => [filtro, soEsperando, aberta],
		restore: (v) => ([filtro, soEsperando, aberta] = v)
	};
</script>

<svelte:head>
	<title>{tituloDaAba(t('Crise'), data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">
	{t('Equipe de crise')} · {data.comite.sigla}
	<AoVivo
		comiteId={data.comite.id}
		canais={[`crise:${data.comite.id}`]}
		tabelas={TABELAS_CRISE}
		dependencia="app:crise"
		bind:diferenca
	/>
</p>
<h1>{t('Fila da crise')}</h1>

{#if !ehCrise}
	<p class="suave">{t('Só a equipe de crise do comitê vê esta fila.')}</p>
{:else}
	<p class="contador-crise" aria-live="polite">
		<span class="selo {resumo.pendentes ? 'selo--info' : 'selo--ok'}">{t('Pendentes: {n}', { n: resumo.pendentes })}</span>
		{#if resumo.pendentes}
			<span class="selo {resumo.alerta ? 'selo--erro' : ''}">
				{t('Mais antiga')}: {formatarEspera(resumo.esperaMin)}{resumo.alerta ? ` (${t('acima do limite')})` : ''}
			</span>
		{/if}
	</p>

	<div class="acoes">
		<AcaoEmModal bind:this={modalLancar} rotulo={t('Lançar uma crise')} icone={Siren} descricao={t('O comitê vê o briefing e o prazo na hora, no telão e na sessão.')}>
			{@render formularioDaCrise()}
		</AcaoEmModal>
		<AcaoEmModal
			bind:this={modalAtualizar}
			secundario
			rotulo={t('Nova atualização')}
			titulo={t('Publicar uma atualização de crise')}
			icone={Megaphone}
			descricao={t('Uma novidade da crise que as delegações leem na página de crise do comitê.')}
		>
			{@render formularioDaAtualizacao()}
		</AcaoEmModal>
		{#each ativos as i (i.id)}
			<button
				class="botao botao--secundario"
				type="button"
				onclick={() => {
					erroModal = '';
					encerrando = i.id;
					modalEncerrar?.abrir();
				}}
				{@attach dica(t('Diga se a crise foi resolvida ou fracassou e o que aconteceu.'))}><FlagOff aria-hidden="true" size={18} strokeWidth={1.75} /> {t('Encerrar: {crise}', { crise: i.titulo })}</button
			>
		{/each}
		{#if data.atualizacoes.length}
			<button class="botao botao--secundario" type="button" onclick={() => modalAtualizacoes?.abrir()}
				{@attach dica(t('Mostra as atualizações já publicadas neste comitê.'))}
				>{t('Atualizações publicadas')} <span class="selo">{data.atualizacoes.length}</span></button
			>
		{/if}
		<a class="botao botao--secundario" href={`/comite/${data.comite.sigla}/mensagens`}
			{@attach dica(t('A conversa privada da equipe de crise com a mesa do comitê.'))}
			><MessagesSquare aria-hidden="true" size={18} strokeWidth={1.75} /> {t('Canal interno com a mesa')}</a
		>
	</div>
	<AlertaCrise incidentes={data.incidentes} {diferenca} />

	{#if erro}
		<p class="erro" role="alert">{erro}</p>
	{/if}
	{#if mensagem}
		<p class="sucesso" role="status">{mensagem}</p>
	{/if}

	<div class="crise">
		<!-- Passo 51: as colunas rolam sozinhas no notebook; com tabindex, o teclado também as rola. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<section class="cartao" aria-labelledby="t-fila" tabindex="0">
			<h2 id="t-fila">{t('Notas')}</h2>
			<div class="acoes">
				<label class="campo">
					{t('Delegação')}
					<select bind:value={filtro}>
						<option value="">{t('Todas')}</option>
						{#each delegacoes as d (d.id)}
							<option value={d.id}>{d.nome}</option>
						{/each}
					</select>
				</label>
				<label class="opcao"><input type="checkbox" bind:checked={soEsperando} /> {t('Só as que esperam')}</label>
				{#if filtro || soEsperando}
					<span class="detalhe">{t('{n} de {total}', { n: fila.length, total: data.notas.length })}</span>
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => ((filtro = ''), (soEsperando = false))} {@attach dica(t('Mostra de novo todas as notas da fila.'))}
						>{t('Limpar')}</button
					>
				{/if}
			</div>
			<ol class="lista fila-crise">
				{#each fila as nota (nota.id)}
					{@const status = nota.status as StatusNota}
					<li aria-current={nota.id === aberta ? 'true' : undefined}>
						<input
							type="checkbox"
							value={nota.id}
							bind:group={selecionadas}
							aria-label={`Selecionar: ${nota.titulo}, ${nota.delegacao?.nome}`}
						/>
						<button class="nota-na-fila" type="button" onclick={() => abrir(nota.id)} {@attach dica(t('Abre a nota ao lado para ler e responder.'))}>
							<span class="com-bandeira"><Bandeira codigo={nota.delegacao?.bandeira} /> {nota.delegacao?.nome}</span>
							<strong>{nota.titulo}</strong>
							<span class="detalhe">
								<span class="selo {SELO_NOTA[status]}">{STATUS_NOTA[status]}</span>
								{nota.tipo === 'nota' ? t('Nota') : t('Diretiva')} ·
								<span class="idade">{formatarEspera(minutosDesde(nota.criado_em, agora + diferenca))}</span>
							</span>
						</button>
					</li>
				{:else}
					<li class="suave">{t('Nenhuma nota.')}</li>
				{/each}
			</ol>
		</section>

		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<section class="cartao" id="nota-aberta" aria-labelledby="t-aberta" tabindex="0">
			<h2 id="t-aberta">{selecionadas.length > 1 ? t('{n} notas selecionadas', { n: selecionadas.length }) : t('Nota aberta')}</h2>
			{#if selecionadas.length > 1}
				<ul class="lista">
					{#each data.notas.filter((n) => selecionadas.includes(n.id)) as n (n.id)}
						<li>{n.delegacao?.nome}: {n.titulo}</li>
					{/each}
				</ul>
			{:else if notaAberta}
				<p class="destaque"><NomeDelegacao sigla={data.comite.sigla} delegacao={notaAberta.delegacao} /></p>
				<p><strong>{notaAberta.titulo}</strong> · {notaAberta.tipo === 'nota' ? t('Nota') : t('Diretiva')}</p>
				<p class="texto-nota">{notaAberta.texto}</p>
				{#if notaAberta.resposta}
					<p class="telegrama" role="note" aria-label={t('Resposta enviada')}>{notaAberta.resposta}</p>
				{/if}
				{#if notaAberta.status === 'pendente'}
					<button
						class="botao botao--secundario"
						type="button"
						onclick={() => executar(supabase.rpc('assumir_nota', { p_id: notaAberta.id }), t('Nota assumida.'))}
						{@attach dica(t('Marca que você cuida desta nota, para ninguém da equipe responder junto.'))}
						>{t('Assumir esta nota')}</button
					>
				{/if}
			{:else}
				<p class="suave">{t('Abra uma nota da fila, ou selecione várias parecidas para responder de uma vez.')}</p>
			{/if}

			{#if alvos.length}
				<div class="formulario formulario--largo">
					<label class="campo">
						{t('Resposta')}
						<textarea rows="4" maxlength="2000" bind:value={resposta} {@attach contador(resposta)}></textarea>
					</label>
					<div class="acoes" role="group" aria-label={t('Respostas prontas')}>
						{#each respostasProntas() as pronta (pronta)}
							<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => (resposta = pronta)}
								{@attach dica(t('Põe esta resposta pronta no campo, para você completar.'))}
								>{pronta.split(/[.:]/)[0]}</button
							>
						{/each}
					</div>
					<div class="acoes">
						<button class="botao" type="button" onclick={() => responder('aprovada')} {@attach dica(t('Aprova o pedido e manda a resposta à delegação.'))}>{t('Aprovar')}</button>
						<button class="botao botao--secundario" type="button" onclick={() => responder('pede_ajuste')}
							{@attach dica(t('Devolve com a resposta, para a delegação mudar e mandar de novo.'))}
							>{t('Pedir ajuste')}</button
						>
						<button class="botao botao--secundario" type="button" onclick={() => responder('rejeitada')} {@attach dica(t('Recusa o pedido e manda a resposta à delegação.'))}>{t('Rejeitar')}</button>
					</div>
				</div>
			{/if}
		</section>
	</div>

	<Modal bind:this={modalEncerrar} rotulo="t-encerrar" classe="modal-acao" onclose={() => (encerrando = null)}>
		{#if emEncerramento && desfecho[emEncerramento.id]}
			{@const i = emEncerramento}
			<h3 id="t-encerrar">{t('Encerrar: {crise}', { crise: i.titulo })}</h3>
			<form
				class="formulario"
				aria-label={t('Encerrar: {crise}', { crise: i.titulo })}
				onsubmit={(e) => {
					e.preventDefault();
					void encerrar(i.id);
				}}
			>
				<fieldset class="opcoes">
					<legend>{t('Desfecho de {crise}', { crise: i.titulo })}</legend>
					<label class="opcao"><input type="radio" value="resolvido" bind:group={desfecho[i.id].resultado} /> {t('Resolvida')}</label>
					<label class="opcao"><input type="radio" value="fracassou" bind:group={desfecho[i.id].resultado} /> {t('Fracassou')}</label>
				</fieldset>
				<label class="campo">{t('O que aconteceu')} <textarea rows="2" maxlength="3000" bind:value={desfecho[i.id].texto} {@attach contador(desfecho[i.id].texto)}></textarea></label>
				{#if erroModal}<p class="erro" role="alert">{erroModal}</p>{/if}
				<button class="botao">{t('Encerrar a crise')}</button>
			</form>
		{/if}
	</Modal>

	<Modal bind:this={modalAtualizacoes} rotulo="t-atualizacoes" classe="modal-acao">
		<h3 id="t-atualizacoes">{t('Atualizações publicadas')}</h3>
		<ul class="lista">
			{#each data.atualizacoes as a (a.id)}
				<li>{a.texto}</li>
			{/each}
		</ul>
		<form method="dialog" class="acoes"><button class="botao botao--secundario">{t('Fechar')}</button></form>
	</Modal>
{/if}

{#snippet formularioDaCrise()}
	<form class="formulario formulario--largo" onsubmit={lancar} aria-label={t('Lançar uma crise')}>
		<label class="campo">{t('Título')} <input required maxlength="120" bind:value={crise.titulo} {@attach contador(crise.titulo)} /></label>
		<label class="campo">
			{t('Briefing')}
			<textarea required rows="4" maxlength="3000" bind:value={crise.texto} {@attach contador(crise.texto)}></textarea>
		</label>
		<label class="campo campo--curto">
			{t('Prazo (minutos)')}
			<input type="number" required min="1" max="240" bind:value={crise.minutos} />
		</label>
		{#if meusComites.length > 1}
			<fieldset class="opcoes">
				<legend>{t('Comitês (crise conjunta)')}</legend>
				{#each meusComites as c (c.id)}
					<label class="opcao"><input type="checkbox" value={c.id} bind:group={comitesDaCrise} /> {c.sigla}</label>
				{/each}
			</fieldset>
		{/if}
		<fieldset class="opcoes">
			<legend>{t('Delegações atingidas (ficam sem voz)')}</legend>
			{#each efeitos as e, i (i)}
				<div class="acoes efeito">
					<Escolha unica rotulo={t('Delegação')} botao={t('Escolher')} opcoes={data.delegacoes} bind:valor={e.delegacao_id} />
					<label class="campo">{t('O que aconteceu com ela')} <input required maxlength="200" bind:value={e.texto} {@attach contador(e.texto)} /></label>
					<label class="campo campo--curto">
						{t('Minutos (vazio: até o fim)')}
						<input type="number" min="1" max="240" bind:value={e.minutos} />
					</label>
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => (efeitos = efeitos.filter((_, j) => j !== i))}
						{@attach dica(t('Tira esta delegação da lista das atingidas.'))}
						>{t('Tirar')}</button
					>
				</div>
			{/each}
			<button
				class="botao botao--secundario botao--pequeno"
				type="button"
				onclick={() => (efeitos = [...efeitos, { delegacao_id: '', texto: '', minutos: null }])}
				{@attach dica(t('Escolha uma delegação que fica sem voz por causa da crise.'))}>{t('Adicionar uma delegação atingida')}</button
			>
		</fieldset>
		{#if erroModal}<p class="erro" role="alert">{erroModal}</p>{/if}
		<button class="botao">{t('Lançar a crise')}</button>
	</form>
{/snippet}

{#snippet formularioDaAtualizacao()}
	<form class="formulario formulario--largo" onsubmit={publicar} aria-label={t('Publicar uma atualização de crise')}>
		<label class="campo">
			{t('Texto da atualização')}
			<textarea required maxlength="3000" rows="4" bind:value={atualizacao} {@attach contador(atualizacao)}></textarea>
		</label>
		{#if meusComites.length > 1}
			<fieldset class="opcoes">
				<legend>{t('Comitês (crise conjunta)')}</legend>
				{#each meusComites as c (c.id)}
					<label class="opcao"><input type="checkbox" value={c.id} bind:group={comitesDaAtualizacao} /> {c.sigla}</label>
				{/each}
			</fieldset>
		{/if}
		{#if erroModal}<p class="erro" role="alert">{erroModal}</p>{/if}
		<button class="botao">{t('Publicar atualização')}</button>
	</form>
{/snippet}
