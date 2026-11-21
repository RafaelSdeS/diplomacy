<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { ficha, fecharFicha } from '#lib/ficha.svelte.ts';
	import { STATUS_DPO } from '#lib/impressao.ts';
	import { supabase } from '#lib/supabase.ts';
	import { ESCOLHAS } from '#lib/votacao.ts';
	import Bandeira from './Bandeira.svelte';

	// Passo 43: a ficha da delegação, aberta por cima da tela ao vivo. O resumo da página da
	// delegação (a RLS decide o que aparece); a página completa fica a um clique.
	async function carregar(id: string) {
		const [delegacao, delegados, dpos, votos] = await Promise.all([
			supabase.from('delegacao').select('id, nome, nome_oficial, bandeira, situacao').eq('id', id).maybeSingle(),
			supabase.from('participacao').select('pessoa(nome)').eq('delegacao_id', id).eq('papel', 'delegado'),
			supabase.from('dpo').select('topico, status').eq('delegacao_id', id).order('topico'),
			supabase
				.from('voto')
				.select('escolha, votacao!inner(id, objeto, encerrada_em)')
				.eq('delegacao_id', id)
				.not('votacao.encerrada_em', 'is', null)
				.order('votacao(encerrada_em)', { ascending: false })
				.limit(5)
		]);
		for (const r of [delegacao, delegados, dpos, votos]) if (r.error) throw r.error;
		return {
			delegacao: delegacao.data,
			delegados: delegados.data!.map((p) => p.pessoa?.nome).filter((n) => !!n),
			dpos: dpos.data!,
			votos: votos.data!
		};
	}

	let caixa = $state<HTMLDialogElement>();
	let dados = $state<Awaited<ReturnType<typeof carregar>> | null>(null);
	let erro = $state('');
	const SITUACAO: Record<string, string> = { observadora: 'Observadora', suspensa: 'Suspensa' };

	$effect(() => {
		const id = ficha.id;
		if (!id || !caixa) return;
		dados = null;
		erro = '';
		if (!caixa.open) caixa.showModal();
		carregar(id)
			.then((d) => {
				if (ficha.id === id) dados = d;
			})
			.catch(() => (erro = t('Não foi possível carregar a delegação.')));
	});
</script>

<dialog bind:this={caixa} class="ficha" aria-labelledby="ficha-titulo" onclose={fecharFicha}>
	{#if dados?.delegacao}
		{@const d = dados.delegacao}
		<p class="ficha-bandeira"><Bandeira codigo={d.bandeira} /></p>
		<h3 id="ficha-titulo">{d.nome}</h3>
		<p class="suave">{d.nome_oficial}{SITUACAO[d.situacao] ? ` · ${t(SITUACAO[d.situacao])}` : ''}</p>
		<dl class="ficha-dados">
			<dt>{dados.delegados.length === 1 ? t('Delegado') : t('Delegados')}</dt>
			<dd>{dados.delegados.join(', ') || '—'}</dd>
			<dt>{t('DPO')}</dt>
			<dd>
				{#each dados.dpos as dpo (dpo.topico)}
					<span class="ficha-dpo">{t('Tópico')} {dpo.topico} <span class="selo {STATUS_DPO[dpo.status].selo}">{STATUS_DPO[dpo.status].rotulo}</span></span>
				{:else}
					—
				{/each}
			</dd>
		</dl>
		{#if dados.votos.length}
			<h4>{t('Votos recentes')}</h4>
			<ul class="lista">
				{#each dados.votos as v (v.votacao.id)}
					<li><span>{v.votacao.objeto}</span> <span class="detalhe">{ESCOLHAS[v.escolha]}</span></li>
				{/each}
			</ul>
		{/if}
	{:else}
		<h3 id="ficha-titulo">{t('Delegação')}</h3>
		<p class={erro ? 'erro' : 'suave'}>{erro || t('Carregando…')}</p>
	{/if}
	<div class="acoes">
		{#if dados?.delegacao}
			<a class="botao botao--secundario" href={`/comite/${ficha.sigla}/delegacao/${dados.delegacao.id}`} onclick={() => caixa?.close()}
				>{t('Abrir a página da delegação')}</a
			>
		{/if}
		<form method="dialog"><button class="botao">{t('Fechar')}</button></form>
	</div>
</dialog>
