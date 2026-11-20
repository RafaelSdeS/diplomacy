<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { formatarQuando } from '#lib/cronograma.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const eu = $derived(data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado'));
	const meusBlocos = $derived(data.blocos.filter((b) => b.membros.some((m) => m.delegacao_id === eu?.delegacao_id)));
	const agora = new Date();

	let remetente = $state(''); // vazio: a própria delegação; senão, o id do bloco
	let publica = $state(false);
	let delegacoes = $state<string[]>([]);
	let blocos = $state<string[]>([]);
	let titulo = $state('');
	let corpo = $state('');
	let erro = $state('');
	let mensagem = $state('');

	const de = (c: (typeof data.cartas)[number]) => c.bloco_remetente?.nome ?? c.remetente?.nome ?? '';
	const para = (c: (typeof data.cartas)[number]) =>
		c.publica
			? 'Todo o comitê'
			: c.destinatarios.map((d) => d.delegacao?.nome ?? d.bloco?.nome).filter(Boolean).join(', ');

	async function enviar(evento: SubmitEvent) {
		evento.preventDefault();
		erro = mensagem = '';
		const { error } = await supabase.rpc('enviar_carta', {
			p_comite: data.comite.id,
			p_titulo: titulo,
			p_corpo: corpo,
			p_publica: publica,
			p_destinatarios: publica ? [] : delegacoes,
			p_blocos_destinatarios: publica ? [] : blocos,
			p_bloco_remetente: remetente || undefined
		});
		if (error) {
			erro = mensagemDeErro(error);
			return;
		}
		mensagem = 'Carta enviada.';
		titulo = corpo = '';
		delegacoes = [];
		blocos = [];
		await invalidate('app:cartas');
	}
</script>

<svelte:head>
	<title>Cartas · {data.comite.sigla} · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">
	Comitê · {data.comite.sigla}
	<AoVivo comiteId={data.comite.id} tabelas={['carta']} dependencia="app:cartas" />
</p>
<h1>Cartas diplomáticas</h1>

{#if eu}
	<section aria-labelledby="t-escrever">
		<h2 id="t-escrever">Escrever carta</h2>
		<form class="formulario formulario--largo" onsubmit={enviar}>
			<label class="campo">
				Em nome de
				<select bind:value={remetente}>
					<option value="">{eu.delegacao_nome}</option>
					{#each meusBlocos as b (b.id)}
						<option value={b.id}>{b.nome}</option>
					{/each}
				</select>
			</label>
			<label class="opcao"><input type="checkbox" bind:checked={publica} /> Carta pública (todo o comitê lê)</label>
			{#if !publica}
				<fieldset class="opcoes voluntarias">
					<legend>Para as delegações</legend>
					{#each data.delegacoes.filter((d) => d.id !== eu.delegacao_id) as d (d.id)}
						<label class="opcao"><input type="checkbox" value={d.id} bind:group={delegacoes} /> {d.nome}</label>
					{/each}
				</fieldset>
				{#if data.blocos.length}
					<fieldset class="opcoes voluntarias">
						<legend>Para os blocos</legend>
						{#each data.blocos as b (b.id)}
							<label class="opcao"><input type="checkbox" value={b.id} bind:group={blocos} /> {b.nome}</label>
						{/each}
					</fieldset>
				{/if}
			{/if}
			<label class="campo">
				Título
				<input required maxlength="200" bind:value={titulo} />
			</label>
			<label class="campo">
				Carta
				<textarea required maxlength="8000" rows="8" bind:value={corpo}></textarea>
			</label>
			{#if erro}
				<p class="erro" role="alert">{erro}</p>
			{/if}
			{#if mensagem}
				<p class="sucesso" role="status">{mensagem}</p>
			{/if}
			<button class="botao">Enviar carta</button>
		</form>
	</section>
{/if}

<section aria-labelledby="t-cartas">
	<h2 id="t-cartas">Cartas</h2>
	<ul class="lista">
		{#each data.cartas as c (c.id)}
			<li>
				<span>
					<strong>{c.titulo}</strong>
					{#if c.publica}<span class="selo selo--info">Pública</span>{/if}
					<span class="detalhe">De {de(c)} · para {para(c)} · {formatarQuando(c.enviada_em, agora)}</span>
				</span>
				<a href={`/imprimir/carta/${c.id}`} aria-label={`Abrir e imprimir a carta "${c.titulo}"`}>Abrir</a>
			</li>
		{:else}
			<li class="suave">Nenhuma carta ainda.</li>
		{/each}
	</ul>
</section>
