<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Situacao = 'ausente' | 'presente' | 'presente_e_votando';
	const OPCOES: { valor: Situacao; rotulo: string }[] = [
		{ valor: 'ausente', rotulo: 'Ausente' },
		{ valor: 'presente', rotulo: 'Presente' },
		{ valor: 'presente_e_votando', rotulo: 'Presente e votando' }
	];

	let erro = $state('');
	let votacao = $state(false);
	let voluntarias = $state<string[]>([]);

	const ehMesa = $derived(
		data.participacoes.some((p) => (p.papel === 'mesa' && p.comite_id === data.comite.id) || p.papel === 'secretaria')
	);
	const previstas = $derived(data.delegacoes.filter((d) => d.situacao !== 'suspensa'));
	const presencas = $derived(new Map((data.sessao?.presenca ?? []).map((p) => [p.delegacao_id, p.situacao])));
	const presentes = $derived(presencas.size);
	const haQuorum = $derived(presentes >= data.quorum);

	async function executar(acao: PromiseLike<{ error: unknown }>, falha: string) {
		erro = '';
		const { error } = await acao;
		if (error) erro = falha;
		await invalidate('app:sessao-ao-vivo');
	}

	function marcar(delegacao: string, situacao: Situacao) {
		const sessao = data.sessao!.id;
		return executar(
			situacao === 'ausente'
				? supabase.from('presenca').delete().eq('sessao_id', sessao).eq('delegacao_id', delegacao)
				: supabase
						.from('presenca')
						.upsert({ sessao_id: sessao, comite_id: data.comite.id, delegacao_id: delegacao, situacao }),
			'Não foi possível marcar a presença.'
		);
	}

	function sortear(evento: SubmitEvent) {
		evento.preventDefault();
		void executar(
			supabase.rpc('sortear_presidencia', { p_comite: data.comite.id, p_voluntarias: voluntarias }),
			'Não foi possível sortear.'
		).then(() => (voluntarias = []));
	}
</script>

<svelte:head>
	<title>Chamada · {data.comite.sigla} · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">Comitê · {data.comite.sigla} <AoVivo comiteId={data.comite.id} /></p>
<h1>Chamada</h1>

{#if !ehMesa}
	<p class="suave">Só a mesa faz a chamada.</p>
{:else}
	{#if erro}
		<p class="erro" role="alert">{erro}</p>
	{/if}

	<section aria-labelledby="t-sessao">
		<h2 id="t-sessao">Sessão</h2>
		<p>
			{#if data.sessao}
				Sessão {data.sessao.numero} aberta{data.sessao.de_votacao ? ' (de votação)' : ''} · Presidência: {data.sessao
					.presidencia?.nome ?? 'Mesa'}.
			{:else}
				Nenhuma sessão aberta.
			{/if}
		</p>
		<div class="acoes">
			<label class="opcao">
				<input type="checkbox" bind:checked={votacao} /> Sessão de votação (a mesa preside)
			</label>
			<button
				class="botao"
				type="button"
				onclick={() =>
					executar(
						supabase.rpc('abrir_sessao', { p_comite: data.comite.id, p_votacao: votacao }),
						'Não foi possível abrir a sessão.'
					)}>{data.sessao ? 'Abrir a próxima sessão' : 'Abrir sessão'}</button
			>
			{#if data.sessao}
				<button
					class="botao botao--secundario"
					type="button"
					onclick={() =>
						executar(supabase.rpc('encerrar_sessao', { p_comite: data.comite.id }), 'Não foi possível encerrar.')}
					>Encerrar sessão</button
				>
			{/if}
		</div>
	</section>

	{#if data.sessao}
		<section aria-labelledby="t-chamada">
			<h2 id="t-chamada">Presença</h2>
			<p class="quorum" aria-live="polite">
				Presentes: {presentes} de {previstas.length} · Quórum: {data.quorum}
				<span class="selo {haQuorum ? 'selo--ok' : 'selo--alerta'}">{haQuorum ? 'Há quórum' : 'Sem quórum'}</span>
			</p>
			<ul class="lista">
				{#each previstas as d (d.id)}
					{@const atual = presencas.get(d.id) ?? 'ausente'}
					<li>
						<fieldset class="presenca">
							<legend class="com-bandeira"><Bandeira codigo={d.bandeira} /> {d.nome}</legend>
							{#each OPCOES as opcao (opcao.valor)}
								<label class="opcao">
									<input
										type="radio"
										name={`presenca-${d.id}`}
										checked={atual === opcao.valor}
										onchange={() => marcar(d.id, opcao.valor)}
									/>
									{opcao.rotulo}
								</label>
							{/each}
						</fieldset>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section aria-labelledby="t-rodizio">
		<h2 id="t-rodizio">Rodízio da presidência</h2>
		<p class="suave">
			O bureau preside a primeira sessão e as de votação. Nas outras, preside a próxima delegação da ordem sorteada;
			as que sobram ficam na lista de espera.
		</p>
		{#if data.rodizio.length}
			<ol class="lista" aria-label="Ordem sorteada">
				{#each data.rodizio as vez (vez.ordem)}
					<li>
						<span class="com-bandeira"><Bandeira codigo={vez.delegacao?.bandeira} /> {vez.delegacao?.nome}</span>
						{#if vez.vez_usada}<span class="selo">Já presidiu</span>{/if}
					</li>
				{/each}
			</ol>
		{/if}
		<form class="formulario" onsubmit={sortear}>
			<fieldset class="voluntarias">
				<legend>Delegações voluntárias</legend>
				{#each previstas as d (d.id)}
					<label class="opcao"><input type="checkbox" value={d.id} bind:group={voluntarias} /> {d.nome}</label>
				{/each}
			</fieldset>
			<button class="botao" disabled={voluntarias.length === 0}>
				{data.rodizio.length ? 'Sortear de novo' : 'Sortear a ordem'}
			</button>
		</form>
	</section>
{/if}
