<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { formatarEspera, minutosDesde, SELO_NOTA, STATUS_NOTA, type StatusNota } from '#lib/crise.ts';
	import { formatarQuando } from '#lib/cronograma.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import { TABELAS_CRISE } from '#lib/tempo-real.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const eu = $derived(data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado'));
	let tipo = $state<'nota' | 'diretiva'>('nota');
	let titulo = $state('');
	let texto = $state('');
	let erro = $state('');
	let mensagem = $state('');
	let enviando = $state(false);
	// O id nasce com o rascunho: se a rede cair no envio, reenviar não duplica a nota.
	let id = $state(crypto.randomUUID());
	// O tempo de espera anda sozinho.
	let agora = $state(Date.now());
	$effect(() => {
		const relogio = setInterval(() => (agora = Date.now()), 30_000);
		return () => clearInterval(relogio);
	});

	async function enviar(evento: SubmitEvent) {
		evento.preventDefault();
		erro = mensagem = '';
		enviando = true;
		const { error } = await supabase.rpc('enviar_nota', {
			p_id: id,
			p_comite: data.comite.id,
			p_tipo: tipo,
			p_titulo: titulo,
			p_texto: texto
		});
		enviando = false;
		if (error) {
			erro = mensagemDeErro(error, 'Não foi possível enviar. Confira a conexão e tente de novo: a nota não será duplicada.');
			return;
		}
		mensagem = `${tipo === 'nota' ? 'Nota' : 'Diretiva'} enviada à crise.`;
		titulo = texto = '';
		id = crypto.randomUUID();
		await invalidate('app:crise');
	}
</script>

<svelte:head>
	<title>Crise · {data.comite.sigla} · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">
	Comitê · {data.comite.sigla}
	<AoVivo
		comiteId={data.comite.id}
		canais={eu?.delegacao_id ? [`delegacao:${eu.delegacao_id}`] : []}
		tabelas={TABELAS_CRISE}
		dependencia="app:crise"
	/>
</p>
<h1>Crise</h1>

{#if !data.comite.crise_ligada}
	<p class="suave">Este comitê não tem crise.</p>
{:else}
	{#if data.atualizacoes.length}
		<section aria-labelledby="t-plantao">
			<h2 id="t-plantao">Atualizações de crise</h2>
			<ul class="lista">
				{#each data.atualizacoes as a (a.id)}
					<li>
						<span>
							{a.texto}
							<span class="detalhe">{formatarQuando(a.publicada_em, new Date(agora))}</span>
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if eu}
		<section aria-labelledby="t-escrever">
			<h2 id="t-escrever">Escrever à crise</h2>
			<form class="formulario formulario--largo" onsubmit={enviar}>
				<fieldset class="opcoes">
					<legend>Tipo</legend>
					<label class="opcao"><input type="radio" value="nota" bind:group={tipo} /> Nota (pergunta ou pedido)</label>
					<label class="opcao"><input type="radio" value="diretiva" bind:group={tipo} /> Diretiva (ação da delegação)</label>
				</fieldset>
				<label class="campo">
					Título
					<input required maxlength="120" bind:value={titulo} />
				</label>
				<label class="campo">
					Texto
					<textarea required maxlength="2000" rows="6" bind:value={texto}></textarea>
				</label>
				{#if erro}
					<p class="erro" role="alert">{erro}</p>
				{/if}
				{#if mensagem}
					<p class="sucesso" role="status">{mensagem}</p>
				{/if}
				<button class="botao" disabled={enviando}>Enviar à crise</button>
			</form>
			<p class="suave">
				Cada delegação pode ter até {data.regras.limite_notas_pendentes} notas esperando resposta. Só a sua delegação e a
				equipe de crise leem as suas notas.
			</p>
		</section>

		<section aria-labelledby="t-minhas">
			<h2 id="t-minhas">Notas de {eu.delegacao_nome}</h2>
			<ul class="lista">
				{#each data.notas as nota (nota.id)}
					{@const status = nota.status as StatusNota}
					<li class="nota">
						<span>
							<span class="selo {SELO_NOTA[status]}">{STATUS_NOTA[status]}</span>
							{#if nota.posicao}<span class="selo">{nota.posicao}ª na fila</span>{/if}
							<strong>{nota.titulo}</strong>
							<span class="detalhe"
								>{nota.tipo === 'nota' ? 'Nota' : 'Diretiva'} · {formatarEspera(minutosDesde(nota.criado_em, agora))}</span
							>
							{#if nota.resposta}
								<span class="telegrama" role="note" aria-label="Resposta da crise">{nota.resposta}</span>
							{/if}
						</span>
					</li>
				{:else}
					<li class="suave">Nenhuma nota ainda.</li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}
