<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import { FASES, presidenciaEmVigor } from '#lib/votacao.ts';
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

	const ehMesa = $derived(
		data.participacoes.some((p) => (p.papel === 'mesa' && p.comite_id === data.comite.id) || p.papel === 'secretaria')
	);
	const previstas = $derived(data.delegacoes.filter((d) => d.situacao !== 'suspensa'));
	const presencas = $derived(new Map((data.sessao?.presenca ?? []).map((p) => [p.delegacao_id, p.situacao])));
	const presentes = $derived(presencas.size);
	const haQuorum = $derived(presentes >= data.quorum);

	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, falha: string) {
		erro = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error, falha);
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

	const sortear = () =>
		executar(supabase.rpc('sortear_presidencia', { p_comite: data.comite.id }), 'Não foi possível sortear.');
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
				Sessão {data.sessao.numero} aberta · {FASES[data.fase]} · Presidência: {presidenciaEmVigor(
					data.fase,
					false,
					data.sessao.presidencia?.nome
				)}.
			{:else}
				Nenhuma sessão aberta.
			{/if}
		</p>
		<div class="acoes">
			<button
				class="botao"
				type="button"
				onclick={() =>
					executar(
						supabase.rpc('abrir_sessao', { p_comite: data.comite.id }),
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
			A ordem é sorteada entre todas as delegações membros (observadoras não presidem), e cada uma preside no máximo
			{data.regras.max_sessoes_presidencia} sessões. O bureau preside a plenária de abertura e a fase de ação; no debate,
			preside a próxima da ordem, e as que sobram ficam na lista de espera.
		</p>
		{#if data.rodizio.length}
			<ol class="lista" aria-label="Ordem sorteada">
				{#each data.rodizio as vez (vez.ordem)}
					<li>
						<span class="com-bandeira"><Bandeira codigo={vez.delegacao?.bandeira} /> {vez.delegacao?.nome}</span>
						{#if vez.vezes}<span class="selo">Presidiu {vez.vezes === 1 ? '1 sessão' : `${vez.vezes} sessões`}</span>{/if}
					</li>
				{/each}
			</ol>
		{/if}
		<button class="botao" type="button" onclick={sortear}>
			{data.rodizio.length ? 'Sortear de novo' : 'Sortear a ordem'}
		</button>
	</section>
{/if}
