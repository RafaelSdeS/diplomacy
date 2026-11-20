<script lang="ts">
	import { rotuloPapel } from '#lib/papeis.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase, type Papel } from '#lib/supabase.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// As perguntas do questionário do piloto (docs/piloto.md), por função.
	const COMUNS = [
		'Em algum momento você não soube o que fazer na tela? Qual?',
		'O app travou ou ficou sem atualizar no seu aparelho? Quando?'
	];
	const POR_PAPEL: Partial<Record<Papel, string[]>> = {
		delegado: ['Levantar a placa, votar e mandar nota de crise pelo celular foi mais fácil ou mais difícil do que no papel?'],
		mesa: ['O painel da presidência deu conta do ritmo da sessão? O que faltou?', 'Você usaria o app no evento? Por quê?'],
		crise: ['A fila de notas deu conta? Alguma nota se perdeu ou chegou duplicada?', 'Você usaria o app no evento? Por quê?'],
		press: ['Publicar do celular foi rápido o bastante para cobrir a sessão?']
	};

	const papeis = $derived([...new Set(data.participacoes.map((p) => p.papel))]);
	let papel = $state<Papel | ''>('');
	const papelEscolhido = $derived<Papel>(papel || papeis[0]);
	const perguntas = $derived([...COMUNS, ...(POR_PAPEL[papelEscolhido] ?? [])]);
	let nota = $state(0);
	let respostas = $state<Record<string, string>>({});
	let erro = $state('');
	let enviada = $state(false);

	async function enviar(evento: SubmitEvent) {
		evento.preventDefault();
		erro = '';
		const { error } = await supabase.rpc('responder_pesquisa', {
			p_evento: data.evento!,
			p_papel: papelEscolhido,
			p_nota: nota,
			p_respostas: Object.fromEntries(perguntas.map((p) => [p, respostas[p] ?? '']))
		});
		if (error) erro = mensagemDeErro(error);
		else enviada = true;
	}
</script>

<svelte:head>
	<title>Pesquisa de satisfação · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">Pesquisa</p>
<h1>Pesquisa de satisfação</h1>
<p class="suave">Anônima: a resposta não guarda quem respondeu. Uma resposta por pessoa.</p>

{#if data.jaRespondeu || enviada}
	<p class="sucesso" role="status">Obrigado por responder!</p>
{:else if data.evento}
	<form class="formulario formulario--largo" onsubmit={enviar}>
		{#if papeis.length > 1}
			<label class="campo">
				Responder como
				<select bind:value={papel}>
					{#each papeis as p (p)}<option value={p}>{rotuloPapel(p)}</option>{/each}
				</select>
			</label>
		{/if}
		<fieldset class="opcoes">
			<legend>De 1 a 5, o app ajudou ou atrapalhou o evento?</legend>
			{#each [1, 2, 3, 4, 5] as n (n)}
				<label class="opcao"><input type="radio" required value={n} bind:group={nota} /> {n}</label>
			{/each}
		</fieldset>
		{#each perguntas as pergunta (pergunta)}
			<label class="campo">
				{pergunta}
				<textarea rows="2" maxlength="1000" bind:value={respostas[pergunta]}></textarea>
			</label>
		{/each}
		{#if erro}
			<p class="erro" role="alert">{erro}</p>
		{/if}
		<button class="botao">Enviar respostas</button>
	</form>
{/if}
