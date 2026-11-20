<script lang="ts">
	import { formatarHora, formatarQuando, itensAtuais, proximoItem } from '#lib/cronograma.ts';
	import { rotuloPapel } from '#lib/papeis.ts';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import { FASES } from '#lib/votacao.ts';
	import { SELO_NOTA, STATUS_NOTA, type StatusNota } from '#lib/crise.ts';
	import { STATUS_DPO } from '#lib/impressao.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// O relógio da tela anda sozinho, para o cartão "Acontecendo agora" virar na hora certa.
	let agora = $state(new Date());
	$effect(() => {
		const relogio = setInterval(() => (agora = new Date()), 30_000);
		return () => clearInterval(relogio);
	});

	const atuais = $derived(itensAtuais(data.cronograma, agora));
	const proximo = $derived(proximoItem(data.cronograma, agora));
	const vistosEm = $derived(data.avisosVistosEm ? new Date(data.avisosVistosEm) : null);
	const novos = $derived(data.avisos.filter((a) => !vistosEm || new Date(a.criado_em) > vistosEm));
	const junto = (...partes: (string | null | undefined)[]) => partes.filter(Boolean).join(' · ');
</script>

<svelte:head>
	<title>Agora · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">{data.participacoes[0]?.evento_nome}</p>
<h1>Agora</h1>

<div class="cartoes">
	<article class="cartao" aria-labelledby="c-agora">
		<h2 id="c-agora">Acontecendo agora</h2>
		{#each data.comitesAoVivo as c (c.comite?.sigla)}
			<p class="topico-atual">
				<span class="rotulo">{c.comite?.sigla}</span>
				{c.fase === 'debate' && c.topico_atual ? `Em debate: ${c.comite?.topicos[c.topico_atual - 1]}` : FASES[c.fase]}
			</p>
		{/each}
		{#each atuais as item (item.id)}
			<p class="destaque">{item.titulo}</p>
			<p class="suave">{junto(item.local, `até ${formatarHora(item.fim)}`)}</p>
		{:else}
			<p class="suave">Nada no cronograma neste momento.</p>
		{/each}
	</article>

	<article class="cartao" aria-labelledby="c-depois">
		<h2 id="c-depois">Depois</h2>
		{#if proximo}
			<p class="destaque">{proximo.titulo}</p>
			<p class="suave">{junto(proximo.local, formatarQuando(proximo.inicio, agora))}</p>
		{:else}
			<p class="suave">Nada mais no cronograma.</p>
		{/if}
		<p><a href="/cronograma">Ver o cronograma</a></p>
	</article>

	<article class="cartao" aria-labelledby="c-avisos">
		<h2 id="c-avisos">Avisos</h2>
		{#if novos.length > 0}
			<p class="destaque">{novos.length === 1 ? '1 aviso novo' : `${novos.length} avisos novos`}</p>
		{/if}
		{#each data.avisos.slice(0, 3) as aviso (aviso.id)}
			<p>{aviso.texto}</p>
		{:else}
			<p class="suave">Nenhum aviso.</p>
		{/each}
		<p><a href="/avisos">Ver todos os avisos</a></p>
	</article>

	{#if data.respostasCrise.length}
		<article class="cartao" aria-labelledby="c-crise">
			<h2 id="c-crise">Respostas da crise</h2>
			<ul class="lista">
				{#each data.respostasCrise as nota (nota.id)}
					<li>
						<span>
							<span class="selo {SELO_NOTA[nota.status as StatusNota]}">{STATUS_NOTA[nota.status as StatusNota]}</span>
							{nota.titulo}
							<span class="detalhe">{nota.resposta}</span>
						</span>
					</li>
				{/each}
			</ul>
			<p>
				<a href={`/comite/${data.participacoes.find((p) => p.comite_id === data.respostasCrise[0].comite_id)?.comite_sigla}/crise`}
					>Ver as notas de crise</a
				>
			</p>
		</article>
	{/if}

	{#if data.citacoes.length}
		<article class="cartao" aria-labelledby="c-press">
			<h2 id="c-press">Na press</h2>
			<ul class="lista">
				{#each data.citacoes as n (n.id)}
					<li>
						<span>
							<a href={`/press/${n.veiculo?.comite?.sigla}?n=${n.id}`}>{n.titulo}</a>
							<span class="detalhe">{n.veiculo?.nome} cita a sua delegação</span>
						</span>
					</li>
				{/each}
			</ul>
		</article>
	{/if}

	{#if data.dpos.length}
		<article class="cartao" aria-labelledby="c-dpo">
			<h2 id="c-dpo">Seus DPOs</h2>
			<ul class="lista">
				{#each data.dpos as dpo (dpo.id)}
					<li>
						<span>Tópico {dpo.topico}</span>
						<span class="selo {STATUS_DPO[dpo.status].selo}">{STATUS_DPO[dpo.status].rotulo}</span>
					</li>
				{/each}
			</ul>
			<p>
				<a href={`/comite/${data.participacoes.find((p) => p.comite_id === data.dpos[0].comite_id)?.comite_sigla}/dpo`}
					>Abrir os DPOs</a
				>
			</p>
		</article>
	{/if}

	<article class="cartao" aria-labelledby="c-voce">
		<h2 id="c-voce">Você</h2>
		<ul class="lista">
			{#each data.participacoes as p (p.id)}
				<li>
					<span class="com-bandeira">
						<Bandeira codigo={p.delegacao_bandeira} />
						{junto(rotuloPapel(p.papel), p.delegacao_nome, p.comite_sigla)}
					</span>
				</li>
			{/each}
		</ul>
	</article>
</div>
