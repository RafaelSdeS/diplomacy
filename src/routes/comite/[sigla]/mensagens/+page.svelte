<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { caixa, mensagemDoEnvio } from '#lib/caixa.ts';
	import { formatarQuando } from '#lib/cronograma.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const agora = new Date();

	const papeis = $derived(data.participacoes.filter((p) => p.comite_id === data.comite.id || p.papel === 'secretaria'));
	const eu = $derived(papeis.find((p) => p.papel === 'delegado'));
	const ehMesa = $derived(papeis.some((p) => p.papel === 'mesa' || p.papel === 'secretaria'));
	const ehCrise = $derived(papeis.some((p) => p.papel === 'crise'));
	const canais = $derived([
		...(eu?.delegacao_id ? [`delegacao:${eu.delegacao_id}`] : []),
		...(ehMesa ? [`mesa:${data.comite.id}`] : []),
		...(ehCrise ? [`crise:${data.comite.id}`] : [])
	]);
	const nome = (id: string | null) => data.delegacoes.find((d) => d.id === id)?.nome ?? 'Mesa';
	const do_tipo = (tipo: string) => data.mensagens.filter((m) => m.tipo === tipo);

	let erro = $state('');
	let mensagem = $state('');
	let texto = $state<Record<string, string>>({ bilhete: '', mesa: '', interno: '', resposta: '' });
	let para = $state('');
	let responderA = $state('');

	async function enviar(tipo: 'bilhete' | 'mesa' | 'interno', campo: string, destino: string | null, enviado: string) {
		erro = mensagem = '';
		const id = crypto.randomUUID();
		const resultado = await caixa.enviar({
			id,
			rpc: 'enviar_mensagem',
			args: { p_id: id, p_comite: data.comite.id, p_tipo: tipo, p_texto: texto[campo], p_para: destino ?? undefined },
			rotulo: tipo === 'bilhete' ? `Bilhete para ${nome(destino)}` : 'Mensagem'
		});
		({ erro, mensagem } = mensagemDoEnvio(resultado, enviado));
		if (!erro) texto[campo] = '';
		await invalidate('app:mensagens');
	}

	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, ok: string) {
		erro = mensagem = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		else mensagem = ok;
		await invalidate('app:mensagens');
	}

	// Mesa: a regra dos bilhetes do comitê.
	let mesaLe = $state(false);
	let bloqueados = $state(false);
	$effect(() => {
		mesaLe = data.regras.mesa_le_bilhetes;
		bloqueados = !!data.regras.bilhetes_bloqueados;
	});

	// Entrevistas pedidas à delegação: a hora escolhida para cada uma.
	let horario = $state<Record<string, string>>({});
</script>

<svelte:head>
	<title>Mensagens · {data.comite.sigla} · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">
	Comitê · {data.comite.sigla}
	<AoVivo comiteId={data.comite.id} {canais} tabelas={['mensagem', 'entrevista']} dependencia="app:mensagens" />
</p>
<h1>Mensagens</h1>
<p class="suave">
	Só mensagens da simulação: bilhetes entre delegações, em personagem, e conversas com a mesa. Não há grupo geral.
</p>
<p class="telegrama" role="note" aria-label="Regra dos bilhetes">
	{data.regras.bilhetes_bloqueados
		? 'A mesa bloqueou os bilhetes neste comitê.'
		: data.regras.mesa_le_bilhetes
			? 'A mesa pode ler os bilhetes deste comitê.'
			: 'Os bilhetes deste comitê só são lidos por quem envia e por quem recebe.'}
</p>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

{#if eu}
	<section aria-labelledby="t-bilhetes">
		<h2 id="t-bilhetes">Bilhetes</h2>
		<ul class="lista">
			{#each do_tipo('bilhete') as m (m.id)}
				<li>
					<span>
						<strong>{nome(m.de_delegacao_id)} → {nome(m.para_delegacao_id)}</strong>
						{m.texto}
						<span class="detalhe">{formatarQuando(m.criado_em, agora)}</span>
					</span>
					<details class="denunciar">
						<summary>Denunciar</summary>
						<button
							class="botao botao--secundario botao--pequeno"
							type="button"
							onclick={() =>
								executar(supabase.rpc('denunciar_mensagem', { p_mensagem: m.id, p_motivo: 'Fora do personagem ou ofensivo' }), 'Bilhete denunciado à mesa.')}
							>Denunciar à mesa</button
						>
					</details>
				</li>
			{:else}
				<li class="suave">Nenhum bilhete.</li>
			{/each}
		</ul>
		{#if !data.regras.bilhetes_bloqueados}
			<form
				class="formulario"
				aria-label="Novo bilhete"
				onsubmit={(e) => {
					e.preventDefault();
					void enviar('bilhete', 'bilhete', para, 'Bilhete enviado.');
				}}
			>
				<label class="campo">
					Para
					<select required bind:value={para}>
						{#each data.delegacoes.filter((d) => d.id !== eu.delegacao_id) as d (d.id)}<option value={d.id}>{d.nome}</option>{/each}
					</select>
				</label>
				<label class="campo">
					Bilhete
					<textarea required rows="3" maxlength="1000" bind:value={texto.bilhete}></textarea>
				</label>
				<button class="botao">Enviar bilhete</button>
			</form>
		{/if}
	</section>

	<section aria-labelledby="t-com-mesa">
		<h2 id="t-com-mesa">Com a mesa</h2>
		<ul class="lista">
			{#each do_tipo('mesa') as m (m.id)}
				<li><span><strong>{m.de_delegacao_id ? 'Sua delegação' : 'Mesa'}:</strong> {m.texto} <span class="detalhe">{formatarQuando(m.criado_em, agora)}</span></span></li>
			{:else}
				<li class="suave">Dúvidas e pedidos privados à mesa aparecem aqui.</li>
			{/each}
		</ul>
		<form
			class="formulario"
			aria-label="Mensagem à mesa"
			onsubmit={(e) => {
				e.preventDefault();
				void enviar('mesa', 'mesa', null, 'Mensagem enviada à mesa.');
			}}
		>
			<label class="campo">
				Mensagem à mesa
				<textarea required rows="2" maxlength="1000" bind:value={texto.mesa}></textarea>
			</label>
			<button class="botao botao--secundario">Enviar à mesa</button>
		</form>
	</section>

	{@const minhas = data.entrevistas.filter((e) => e.delegacao_id === eu.delegacao_id)}
	{#if minhas.length}
		<section aria-labelledby="t-entrevistas">
			<h2 id="t-entrevistas">Pedidos de entrevista</h2>
			<ul class="lista">
				{#each minhas as e (e.id)}
					<li>
						<span>
							<strong>{e.veiculo?.nome}</strong>: {e.tema}
							<span class="detalhe">
								{e.status === 'aceita' && e.horario ? `Aceita para ${formatarQuando(e.horario, agora)}` : e.status === 'recusada' ? 'Recusada' : 'Esperando a sua resposta'}
							</span>
						</span>
						{#if e.status === 'pedida'}
							<span class="acoes">
								<label class="campo campo--curto">
									Horário
									<input type="datetime-local" bind:value={horario[e.id]} />
								</label>
								<button
									class="botao botao--pequeno"
									type="button"
									disabled={!horario[e.id]}
									onclick={() =>
										executar(
											supabase.rpc('responder_entrevista', {
												p_entrevista: e.id,
												p_aceitar: true,
												p_horario: new Date(horario[e.id]).toISOString()
											}),
											'Entrevista aceita.'
										)}>Aceitar</button
								>
								<button
									class="botao botao--secundario botao--pequeno"
									type="button"
									onclick={() => executar(supabase.rpc('responder_entrevista', { p_entrevista: e.id, p_aceitar: false }), 'Entrevista recusada.')}
									>Recusar</button
								>
							</span>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}

{#if ehMesa}
	<section aria-labelledby="t-regra">
		<h2 id="t-regra">Regra dos bilhetes</h2>
		<form
			class="formulario"
			onsubmit={(e) => {
				e.preventDefault();
				void executar(supabase.rpc('definir_bilhetes', { p_comite: data.comite.id, p_mesa_le: mesaLe, p_bloqueados: bloqueados }), 'Regra salva.');
			}}
		>
			<label class="opcao"><input type="checkbox" bind:checked={mesaLe} /> A mesa pode ler os bilhetes</label>
			<label class="opcao"><input type="checkbox" bind:checked={bloqueados} /> Bloquear os bilhetes</label>
			<button class="botao botao--secundario">Salvar a regra</button>
		</form>
	</section>

	<section aria-labelledby="t-delegacoes">
		<h2 id="t-delegacoes">Com as delegações</h2>
		<ul class="lista">
			{#each do_tipo('mesa') as m (m.id)}
				<li><span><strong>{m.de_delegacao_id ? nome(m.de_delegacao_id) : `Mesa → ${nome(m.para_delegacao_id)}`}:</strong> {m.texto}</span></li>
			{:else}
				<li class="suave">Nenhuma mensagem das delegações.</li>
			{/each}
		</ul>
		<form
			class="formulario"
			aria-label="Resposta da mesa"
			onsubmit={(e) => {
				e.preventDefault();
				void enviar('mesa', 'resposta', responderA, 'Resposta enviada.');
			}}
		>
			<label class="campo">
				Para a delegação
				<select required bind:value={responderA}>
					{#each data.delegacoes as d (d.id)}<option value={d.id}>{d.nome}</option>{/each}
				</select>
			</label>
			<label class="campo">
				Resposta
				<textarea required rows="2" maxlength="1000" bind:value={texto.resposta}></textarea>
			</label>
			<button class="botao botao--secundario">Responder</button>
		</form>
	</section>

	{#if do_tipo('bilhete').length}
		<section aria-labelledby="t-bilhetes-mesa">
			<h2 id="t-bilhetes-mesa">Bilhetes do comitê</h2>
			<ul class="lista">
				{#each do_tipo('bilhete') as m (m.id)}
					<li>
						<span>
							<strong>{nome(m.de_delegacao_id)} → {nome(m.para_delegacao_id)}</strong>
							{m.texto}
							{#if m.oculta}<span class="selo selo--erro">Oculto</span>{/if}
						</span>
						{#if !m.oculta}
							<button
								class="botao botao--secundario botao--pequeno"
								type="button"
								onclick={() => executar(supabase.rpc('ocultar_mensagem', { p_mensagem: m.id, p_motivo: 'Fora do personagem' }), 'Bilhete ocultado.')}
								>Ocultar</button
							>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}

{#if ehMesa || ehCrise}
	<section aria-labelledby="t-interno">
		<h2 id="t-interno">{ehMesa ? 'Com a equipe de crise' : 'Com a mesa'}</h2>
		<ul class="lista">
			{#each do_tipo('interno') as m (m.id)}
				<li><span><strong>{m.autor?.nome ?? ''}:</strong> {m.texto} <span class="detalhe">{formatarQuando(m.criado_em, agora)}</span></span></li>
			{:else}
				<li class="suave">O canal interno entre a mesa e a crise começa aqui.</li>
			{/each}
		</ul>
		<form
			class="formulario"
			aria-label="Canal interno"
			onsubmit={(e) => {
				e.preventDefault();
				void enviar('interno', 'interno', null, 'Mensagem enviada.');
			}}
		>
			<label class="campo">
				Mensagem do canal interno
				<textarea required rows="2" maxlength="1000" bind:value={texto.interno}></textarea>
			</label>
			<button class="botao botao--secundario">Enviar</button>
		</form>
	</section>
{/if}
