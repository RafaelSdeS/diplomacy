<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
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
	const nome = (id: string | null) => data.delegacoes.find((d) => d.id === id)?.nome ?? t('Mesa');
	const do_tipo = (tipo: string) => data.mensagens.filter((m) => m.tipo === tipo);

	let erro = $state('');
	let mensagem = $state('');
	let texto = $state<Record<string, string>>({ bilhete: '', mesa: '', interno: '', resposta: '' });
	let para = $state(page.url.searchParams.get('para') ?? '');
	let responderA = $state('');
	let bloquear = $state('');

	// Bloqueios de bilhetes (passo 24): os que a sua delegação fez e os que recebeu.
	const bloqueei = $derived(new Set(data.bloqueios.filter((b) => b.delegacao_id === eu?.delegacao_id).map((b) => b.bloqueada_id)));
	const meBloquearam = $derived(new Set(data.bloqueios.filter((b) => b.bloqueada_id === eu?.delegacao_id).map((b) => b.delegacao_id)));
	const bloquearBilhetes = (delegacao: string, sim: boolean) =>
		executar(
			supabase.rpc('bloquear_bilhetes', { p_comite: data.comite.id, p_delegacao: delegacao, p_bloquear: sim }),
			sim ? t('Bilhetes de {delegacao} bloqueados.', { delegacao: nome(delegacao) }) : t('Bilhetes de {delegacao} desbloqueados.', { delegacao: nome(delegacao) })
		);

	async function enviar(tipo: 'bilhete' | 'mesa' | 'interno', campo: string, destino: string | null, enviado: string) {
		erro = mensagem = '';
		const id = crypto.randomUUID();
		const resultado = await caixa.enviar({
			id,
			rpc: 'enviar_mensagem',
			args: { p_id: id, p_comite: data.comite.id, p_tipo: tipo, p_texto: texto[campo], p_para: destino ?? undefined },
			rotulo: tipo === 'bilhete' ? t('Bilhete para {delegacao}', { delegacao: nome(destino) }) : t('Mensagem')
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
	<title>{tituloDaAba(t('Mensagens'), data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">
	{t('Comitê')} · {data.comite.sigla}
	<AoVivo comiteId={data.comite.id} {canais} tabelas={['mensagem', 'entrevista', 'bloqueio_bilhete']} dependencia="app:mensagens" />
</p>
<h1>{t('Mensagens')}</h1>
<p class="suave">
	{t('Só mensagens da simulação: bilhetes entre delegações, em personagem, e conversas com a mesa. Não há grupo geral.')}
</p>
<p class="telegrama" role="note" aria-label={t('Regra dos bilhetes')}>
	{data.regras.bilhetes_bloqueados
		? t('A mesa bloqueou os bilhetes neste comitê.')
		: data.regras.mesa_le_bilhetes
			? t('A mesa pode ler os bilhetes deste comitê.')
			: t('Os bilhetes deste comitê só são lidos por quem envia e por quem recebe.')}
</p>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

{#if eu}
	<section aria-labelledby="t-bilhetes">
		<h2 id="t-bilhetes">{t('Bilhetes')}</h2>
		<ul class="lista">
			{#each do_tipo('bilhete') as m (m.id)}
				<li>
					<span>
						<strong>{nome(m.de_delegacao_id)} → {nome(m.para_delegacao_id)}</strong>
						{m.texto}
						<span class="detalhe">{formatarQuando(m.criado_em, agora)}</span>
					</span>
					<details class="denunciar">
						<summary>{t('Denunciar')}</summary>
						<button
							class="botao botao--secundario botao--pequeno"
							type="button"
							onclick={() =>
								executar(supabase.rpc('denunciar_mensagem', { p_mensagem: m.id, p_motivo: t('Fora do personagem ou ofensivo') }), t('Bilhete denunciado à mesa.'))}
							>{t('Denunciar à mesa')}</button
						>
					</details>
				</li>
			{:else}
				<li class="suave">{t('Nenhum bilhete.')}</li>
			{/each}
		</ul>
		{#if !data.regras.bilhetes_bloqueados}
			<form
				class="formulario"
				aria-label={t('Novo bilhete')}
				onsubmit={(e) => {
					e.preventDefault();
					void enviar('bilhete', 'bilhete', para, t('Bilhete enviado.'));
				}}
			>
				<label class="campo">
					{t('Para')}
					<select required bind:value={para}>
						{#each data.delegacoes.filter((d) => d.id !== eu.delegacao_id) as d (d.id)}
							<option value={d.id} disabled={meBloquearam.has(d.id)}
								>{d.nome}{meBloquearam.has(d.id) ? ` · ${t('não aceita seus bilhetes')}` : ''}</option
							>
						{/each}
					</select>
				</label>
				<label class="campo">
					{t('Bilhete')}
					<textarea required rows="3" maxlength="1000" bind:value={texto.bilhete}></textarea>
				</label>
				<button class="botao">{t('Enviar bilhete')}</button>
			</form>
		{/if}
	</section>

	<section aria-labelledby="t-bloqueios">
		<h2 id="t-bloqueios">{t('Bloqueios')}</h2>
		<h3>{t('Sua delegação não recebe bilhetes de')}</h3>
		<ul class="lista">
			{#each data.delegacoes.filter((d) => bloqueei.has(d.id)) as d (d.id)}
				<li>
					<span>{d.nome}</span>
					<button
						class="botao botao--secundario botao--pequeno"
						type="button"
						aria-label={t('Desbloquear {delegacao}', { delegacao: d.nome })}
						onclick={() => bloquearBilhetes(d.id, false)}>{t('Desbloquear')}</button
					>
				</li>
			{:else}
				<li class="suave">{t('Nenhuma delegação bloqueada.')}</li>
			{/each}
		</ul>
		<form
			class="formulario"
			aria-label={t('Bloquear bilhetes')}
			onsubmit={(e) => {
				e.preventDefault();
				if (bloquear) void bloquearBilhetes(bloquear, true).then(() => (bloquear = ''));
			}}
		>
			<label class="campo">
				{t('Delegação')}
				<select required bind:value={bloquear}>
					<option value="">{t('Escolha')}</option>
					{#each data.delegacoes.filter((d) => d.id !== eu.delegacao_id && !bloqueei.has(d.id)) as d (d.id)}
						<option value={d.id}>{d.nome}</option>
					{/each}
				</select>
			</label>
			<button class="botao botao--secundario">{t('Bloquear bilhetes desta delegação')}</button>
		</form>
		{#if meBloquearam.size}
			<h3>{t('Não aceitam bilhetes da sua delegação')}</h3>
			<ul class="lista" aria-label={t('Não aceitam bilhetes da sua delegação')}>
				{#each data.delegacoes.filter((d) => meBloquearam.has(d.id)) as d (d.id)}
					<li>{d.nome}</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section aria-labelledby="t-com-mesa">
		<h2 id="t-com-mesa">{t('Com a mesa')}</h2>
		<ul class="lista">
			{#each do_tipo('mesa') as m (m.id)}
				<li><span><strong>{m.de_delegacao_id ? t('Sua delegação') : t('Mesa')}:</strong> {m.texto} <span class="detalhe">{formatarQuando(m.criado_em, agora)}</span></span></li>
			{:else}
				<li class="suave">{t('Dúvidas e pedidos privados à mesa aparecem aqui.')}</li>
			{/each}
		</ul>
		<form
			class="formulario"
			aria-label={t('Mensagem à mesa')}
			onsubmit={(e) => {
				e.preventDefault();
				void enviar('mesa', 'mesa', null, t('Mensagem enviada à mesa.'));
			}}
		>
			<label class="campo">
				{t('Mensagem à mesa')}
				<textarea required rows="2" maxlength="1000" bind:value={texto.mesa}></textarea>
			</label>
			<button class="botao botao--secundario">{t('Enviar à mesa')}</button>
		</form>
	</section>

	{@const minhas = data.entrevistas.filter((e) => e.delegacao_id === eu.delegacao_id)}
	{#if minhas.length}
		<section aria-labelledby="t-entrevistas">
			<h2 id="t-entrevistas">{t('Pedidos de entrevista')}</h2>
			<ul class="lista">
				{#each minhas as e (e.id)}
					<li>
						<span>
							<strong>{e.veiculo?.nome}</strong>: {e.tema}
							<span class="detalhe">
								{e.status === 'aceita' && e.horario ? `${t('Aceita para')} ${formatarQuando(e.horario, agora)}` : e.status === 'recusada' ? t('Recusada') : t('Esperando a sua resposta')}
							</span>
						</span>
						{#if e.status === 'pedida'}
							<span class="acoes">
								<label class="campo campo--curto">
									{t('Horário')}
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
											t('Entrevista aceita.')
										)}>{t('Aceitar')}</button
								>
								<button
									class="botao botao--secundario botao--pequeno"
									type="button"
									onclick={() => executar(supabase.rpc('responder_entrevista', { p_entrevista: e.id, p_aceitar: false }), t('Entrevista recusada.'))}
									>{t('Recusar')}</button
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
		<h2 id="t-regra">{t('Regra dos bilhetes')}</h2>
		<form
			class="formulario"
			onsubmit={(e) => {
				e.preventDefault();
				void executar(supabase.rpc('definir_bilhetes', { p_comite: data.comite.id, p_mesa_le: mesaLe, p_bloqueados: bloqueados }), t('Regra salva.'));
			}}
		>
			<label class="opcao"><input type="checkbox" bind:checked={mesaLe} /> {t('A mesa pode ler os bilhetes')}</label>
			<label class="opcao"><input type="checkbox" bind:checked={bloqueados} /> {t('Bloquear os bilhetes')}</label>
			<button class="botao botao--secundario">{t('Salvar a regra')}</button>
		</form>
	</section>

	{#if data.bloqueios.length}
		<section aria-labelledby="t-bloqueios-comite">
			<h2 id="t-bloqueios-comite">{t('Bloqueios no comitê')}</h2>
			<ul class="lista">
				{#each data.bloqueios as b (`${b.delegacao_id}-${b.bloqueada_id}`)}
					<li>{t('{delegacao} não recebe bilhetes de {bloqueada}', { delegacao: nome(b.delegacao_id), bloqueada: nome(b.bloqueada_id) })}</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section aria-labelledby="t-delegacoes">
		<h2 id="t-delegacoes">{t('Com as delegações')}</h2>
		<ul class="lista">
			{#each do_tipo('mesa') as m (m.id)}
				<li><span><strong>{m.de_delegacao_id ? nome(m.de_delegacao_id) : `${t('Mesa')} → ${nome(m.para_delegacao_id)}`}:</strong> {m.texto}</span></li>
			{:else}
				<li class="suave">{t('Nenhuma mensagem das delegações.')}</li>
			{/each}
		</ul>
		<form
			class="formulario"
			aria-label={t('Resposta da mesa')}
			onsubmit={(e) => {
				e.preventDefault();
				void enviar('mesa', 'resposta', responderA, t('Resposta enviada.'));
			}}
		>
			<label class="campo">
				{t('Para a delegação')}
				<select required bind:value={responderA}>
					{#each data.delegacoes as d (d.id)}<option value={d.id}>{d.nome}</option>{/each}
				</select>
			</label>
			<label class="campo">
				{t('Resposta')}
				<textarea required rows="2" maxlength="1000" bind:value={texto.resposta}></textarea>
			</label>
			<button class="botao botao--secundario">{t('Responder')}</button>
		</form>
	</section>

	{#if do_tipo('bilhete').length}
		<section aria-labelledby="t-bilhetes-mesa">
			<h2 id="t-bilhetes-mesa">{t('Bilhetes do comitê')}</h2>
			<ul class="lista">
				{#each do_tipo('bilhete') as m (m.id)}
					<li>
						<span>
							<strong>{nome(m.de_delegacao_id)} → {nome(m.para_delegacao_id)}</strong>
							{m.texto}
							{#if m.oculta}<span class="selo selo--erro">{t('Oculto')}</span>{/if}
						</span>
						{#if !m.oculta}
							<button
								class="botao botao--secundario botao--pequeno"
								type="button"
								onclick={() => executar(supabase.rpc('ocultar_mensagem', { p_mensagem: m.id, p_motivo: t('Fora do personagem') }), t('Bilhete ocultado.'))}
								>{t('Ocultar')}</button
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
		<h2 id="t-interno">{ehMesa ? t('Com a equipe de crise') : t('Com a mesa')}</h2>
		<ul class="lista">
			{#each do_tipo('interno') as m (m.id)}
				<li><span><strong>{m.autor?.nome ?? ''}:</strong> {m.texto} <span class="detalhe">{formatarQuando(m.criado_em, agora)}</span></span></li>
			{:else}
				<li class="suave">{t('O canal interno entre a mesa e a crise começa aqui.')}</li>
			{/each}
		</ul>
		<form
			class="formulario"
			aria-label={t('Canal interno')}
			onsubmit={(e) => {
				e.preventDefault();
				void enviar('interno', 'interno', null, t('Mensagem enviada.'));
			}}
		>
			<label class="campo">
				{t('Mensagem do canal interno')}
				<textarea required rows="2" maxlength="1000" bind:value={texto.interno}></textarea>
			</label>
			<button class="botao botao--secundario">{t('Enviar')}</button>
		</form>
	</section>
{/if}
