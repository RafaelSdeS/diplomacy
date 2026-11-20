<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { invalidate } from '$app/navigation';
	import {
		esperando,
		formatarEspera,
		minutosDesde,
		ordenarFila,
		RESPOSTAS_PRONTAS,
		resumoDaFila,
		SELO_NOTA,
		STATUS_NOTA,
		type StatusNota
	} from '#lib/crise.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import { TABELAS_CRISE } from '#lib/tempo-real.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import type { PageProps } from './$types';

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
			alvos.length > 1 ? `${alvos.length} notas respondidas.` : 'Nota respondida.'
		);
		if (ok) {
			resposta = '';
			selecionadas = [];
		}
	}

	async function publicar(evento: SubmitEvent) {
		evento.preventDefault();
		const ok = await executar(
			supabase.rpc('publicar_atualizacao', { p_comites: comitesDaAtualizacao, p_texto: atualizacao }),
			'Atualização publicada.'
		);
		if (ok) atualizacao = '';
	}
</script>

<svelte:head>
	<title>Crise · {data.comite.sigla} · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">
	Equipe de crise · {data.comite.sigla}
	<AoVivo comiteId={data.comite.id} tabelas={TABELAS_CRISE} dependencia="app:crise" bind:diferenca />
</p>
<h1>Fila da crise</h1>

{#if !ehCrise}
	<p class="suave">Só a equipe de crise do comitê vê esta fila.</p>
{:else}
	<p class="contador-crise" aria-live="polite">
		<span class="selo {resumo.pendentes ? 'selo--info' : 'selo--ok'}">Pendentes: {resumo.pendentes}</span>
		{#if resumo.pendentes}
			<span class="selo {resumo.alerta ? 'selo--erro' : ''}">
				Mais antiga: {formatarEspera(resumo.esperaMin)}{resumo.alerta ? ' (acima do limite)' : ''}
			</span>
		{/if}
	</p>

	{#if erro}
		<p class="erro" role="alert">{erro}</p>
	{/if}
	{#if mensagem}
		<p class="sucesso" role="status">{mensagem}</p>
	{/if}

	<div class="crise">
		<section class="cartao" aria-labelledby="t-fila">
			<h2 id="t-fila">Notas</h2>
			<div class="acoes">
				<label class="campo">
					Delegação
					<select bind:value={filtro}>
						<option value="">Todas</option>
						{#each delegacoes as d (d.id)}
							<option value={d.id}>{d.nome}</option>
						{/each}
					</select>
				</label>
				<label class="opcao"><input type="checkbox" bind:checked={soEsperando} /> Só as que esperam</label>
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
						<button class="nota-na-fila" type="button" onclick={() => abrir(nota.id)}>
							<span class="com-bandeira"><Bandeira codigo={nota.delegacao?.bandeira} /> {nota.delegacao?.nome}</span>
							<strong>{nota.titulo}</strong>
							<span class="detalhe">
								<span class="selo {SELO_NOTA[status]}">{STATUS_NOTA[status]}</span>
								{nota.tipo === 'nota' ? 'Nota' : 'Diretiva'} ·
								<span class="idade">{formatarEspera(minutosDesde(nota.criado_em, agora + diferenca))}</span>
							</span>
						</button>
					</li>
				{:else}
					<li class="suave">Nenhuma nota.</li>
				{/each}
			</ol>
		</section>

		<section class="cartao" id="nota-aberta" aria-labelledby="t-aberta">
			<h2 id="t-aberta">{selecionadas.length > 1 ? `${selecionadas.length} notas selecionadas` : 'Nota aberta'}</h2>
			{#if selecionadas.length > 1}
				<ul class="lista">
					{#each data.notas.filter((n) => selecionadas.includes(n.id)) as n (n.id)}
						<li>{n.delegacao?.nome}: {n.titulo}</li>
					{/each}
				</ul>
			{:else if notaAberta}
				<p class="com-bandeira destaque"><Bandeira codigo={notaAberta.delegacao?.bandeira} /> {notaAberta.delegacao?.nome}</p>
				<p><strong>{notaAberta.titulo}</strong> · {notaAberta.tipo === 'nota' ? 'Nota' : 'Diretiva'}</p>
				<p class="texto-nota">{notaAberta.texto}</p>
				{#if notaAberta.resposta}
					<p class="telegrama" role="note" aria-label="Resposta enviada">{notaAberta.resposta}</p>
				{/if}
				{#if notaAberta.status === 'pendente'}
					<button
						class="botao botao--secundario"
						type="button"
						onclick={() => executar(supabase.rpc('assumir_nota', { p_id: notaAberta.id }), 'Nota assumida.')}
						>Assumir esta nota</button
					>
				{/if}
			{:else}
				<p class="suave">Abra uma nota da fila, ou selecione várias parecidas para responder de uma vez.</p>
			{/if}

			{#if alvos.length}
				<div class="formulario formulario--largo">
					<label class="campo">
						Resposta
						<textarea rows="4" maxlength="2000" bind:value={resposta}></textarea>
					</label>
					<div class="acoes" role="group" aria-label="Respostas prontas">
						{#each RESPOSTAS_PRONTAS as pronta (pronta)}
							<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => (resposta = pronta)}
								>{pronta.split(/[.:]/)[0]}</button
							>
						{/each}
					</div>
					<div class="acoes">
						<button class="botao" type="button" onclick={() => responder('aprovada')}>Aprovar</button>
						<button class="botao botao--secundario" type="button" onclick={() => responder('pede_ajuste')}
							>Pedir ajuste</button
						>
						<button class="botao botao--secundario" type="button" onclick={() => responder('rejeitada')}>Rejeitar</button>
					</div>
				</div>
			{/if}
		</section>
	</div>

	<section aria-labelledby="t-atualizacao">
		<h2 id="t-atualizacao">Atualização de crise</h2>
		<form class="formulario formulario--largo" onsubmit={publicar}>
			<label class="campo">
				Texto da atualização
				<textarea required maxlength="3000" rows="4" bind:value={atualizacao}></textarea>
			</label>
			{#if meusComites.length > 1}
				<fieldset class="opcoes">
					<legend>Comitês (crise conjunta)</legend>
					{#each meusComites as c (c.id)}
						<label class="opcao"><input type="checkbox" value={c.id} bind:group={comitesDaAtualizacao} /> {c.sigla}</label>
					{/each}
				</fieldset>
			{/if}
			<button class="botao">Publicar atualização</button>
		</form>
		{#if data.atualizacoes.length}
			<ul class="lista" aria-label="Atualizações publicadas">
				{#each data.atualizacoes as a (a.id)}
					<li>{a.texto}</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}
