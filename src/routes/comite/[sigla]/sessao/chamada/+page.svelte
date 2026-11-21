<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { untrack } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import { FASES, presidenciaEmVigor } from '#lib/votacao.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let erro = $state('');
	// A preparação (sorteio do rodízio) fica recolhida depois que a ordem existe.
	let preparacaoAberta = $state(untrack(() => !data.rodizio.length));

	const ehMesa = $derived(
		data.participacoes.some((p) => (p.papel === 'mesa' && p.comite_id === data.comite.id) || p.papel === 'secretaria')
	);
	const previstas = $derived(data.delegacoes.filter((d) => d.situacao !== 'suspensa'));
	const presentes = $derived(new Set((data.sessao?.presenca ?? []).map((p) => p.delegacao_id)));
	const haQuorum = $derived(presentes.size >= data.quorum);

	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, falha: string) {
		erro = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error, falha);
		await invalidate('app:sessao-ao-vivo');
	}

	// Um toque alterna entre ausente e presente (no UFRGSMUN, "presente e votando" é o mesmo).
	function alternar(delegacao: string) {
		const sessao = data.sessao!.id;
		return executar(
			presentes.has(delegacao)
				? supabase.from('presenca').delete().eq('sessao_id', sessao).eq('delegacao_id', delegacao)
				: supabase.from('presenca').upsert({ sessao_id: sessao, comite_id: data.comite.id, delegacao_id: delegacao }),
			t('Não foi possível marcar a presença.')
		);
	}
</script>

<svelte:head>
	<title>{t('Chamada')} · {data.comite.sigla} · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">{t('Comitê')} · {data.comite.sigla} <AoVivo comiteId={data.comite.id} /></p>
<h1>{t('Chamada')}</h1>

{#if !ehMesa}
	<p class="suave">{t('Só a mesa faz a chamada.')}</p>
{:else}
	<p class="suave">{t('Abra a sessão, faça a chamada e conclua: o painel da presidência conduz o resto.')}</p>
	{#if erro}
		<p class="erro" role="alert">{erro}</p>
	{/if}

	<details class="preparacao" bind:open={preparacaoAberta}>
		<summary>{t('Preparação: rodízio da presidência')}</summary>
		<section aria-labelledby="t-rodizio">
			<h2 id="t-rodizio">{t('Rodízio da presidência')}</h2>
			<p class="suave">
				{t(
					'A ordem é sorteada entre todas as delegações membros (observadoras não presidem), e cada uma preside no máximo {n} sessões. O bureau preside a plenária de abertura e a fase de ação; no debate, preside a próxima da ordem, e as que sobram ficam na lista de espera.',
					{ n: data.regras.max_sessoes_presidencia }
				)}
			</p>
			{#if data.rodizio.length}
				<ol class="lista" aria-label={t('Ordem sorteada')}>
					{#each data.rodizio as vez (vez.ordem)}
						<li>
							<span class="com-bandeira"><Bandeira codigo={vez.delegacao?.bandeira} /> {vez.delegacao?.nome}</span>
							{#if vez.vezes}<span class="selo">{vez.vezes === 1 ? t('Presidiu 1 sessão') : t('Presidiu {n} sessões', { n: vez.vezes })}</span>{/if}
						</li>
					{/each}
				</ol>
			{/if}
			<button
				class="botao botao--secundario"
				type="button"
				onclick={() => executar(supabase.rpc('sortear_presidencia', { p_comite: data.comite.id }), t('Não foi possível sortear.'))}
			>
				{data.rodizio.length ? t('Sortear de novo') : t('Sortear a ordem')}
			</button>
		</section>
	</details>

	<section aria-labelledby="t-sessao">
		<h2 id="t-sessao">{t('Sessão')}</h2>
		{#if data.sessao}
			<p>
				{t('Sessão {n} aberta', { n: data.sessao.numero })} · {FASES[data.fase]} · {t('Presidência')}: {presidenciaEmVigor(
					data.fase,
					false,
					data.sessao.presidencia?.nome
				)}.
			</p>
		{:else}
			<p>{t('Nenhuma sessão aberta.')}</p>
			<button
				class="botao"
				type="button"
				onclick={() => executar(supabase.rpc('abrir_sessao', { p_comite: data.comite.id }), t('Não foi possível abrir a sessão.'))}
				>{t('Abrir sessão')}</button
			>
		{/if}
	</section>

	{#if data.sessao}
		<section aria-labelledby="t-chamada">
			<h2 id="t-chamada">{t('Presença')}</h2>
			<p class="quorum" aria-live="polite">
				{t('Presentes: {n} de {total}', { n: presentes.size, total: previstas.length })} · {t('Quórum')}: {data.quorum}
				<span class="selo {haQuorum ? 'selo--ok' : 'selo--alerta'}">{haQuorum ? t('Há quórum') : t('Sem quórum')}</span>
			</p>
			<p>
				<button
					class="botao botao--secundario botao--pequeno"
					type="button"
					onclick={() =>
						executar(supabase.rpc('marcar_todas_presentes', { p_comite: data.comite.id }), t('Não foi possível marcar a presença.'))}
					>{t('Marcar todas como presentes')}</button
				>
			</p>
			<ul class="chamada">
				{#each previstas as d (d.id)}
					{@const presente = presentes.has(d.id)}
					<li>
						<button class="chamada-item" type="button" aria-pressed={presente} onclick={() => alternar(d.id)}>
							<span class="com-bandeira"><Bandeira codigo={d.bandeira} /> {d.nome}</span>
							<span class="selo {presente ? 'selo--ok' : ''}" aria-hidden="true">{presente ? t('Presente') : t('Ausente')}</span>
						</button>
					</li>
				{/each}
			</ul>
		</section>

		<section aria-labelledby="t-concluir">
			<h2 id="t-concluir">{t('Concluir a chamada')}</h2>
			<p class="suave">{t('Quem chegar depois avisa pelo app, e a mesa confirma no painel. Esta tela continua aberta para correções.')}</p>
			<a class="botao" href={`/comite/${data.comite.sigla}/sessao/presidencia`}>{t('Concluir chamada')}</a>
		</section>
	{/if}
{/if}
