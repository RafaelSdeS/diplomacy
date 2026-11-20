<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { formatarQuando } from '#lib/cronograma.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const agora = new Date();
	let delegacao = $state('');
	let tema = $state('');
	let erro = $state('');
	let mensagem = $state('');

	const SITUACAO: Record<string, string> = { pedida: 'Esperando a delegação', aceita: 'Aceita', recusada: 'Recusada' };

	async function pedir(evento: SubmitEvent) {
		evento.preventDefault();
		erro = mensagem = '';
		const { error } = await supabase.rpc('pedir_entrevista', { p_delegacao: delegacao, p_tema: tema });
		if (error) erro = mensagemDeErro(error);
		else {
			mensagem = 'Pedido enviado à delegação.';
			tema = '';
		}
		await invalidate('app:entrevistas');
	}
</script>

<svelte:head>
	<title>Entrevistas · Press · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">
	Press · Simulação
	<AoVivo comiteId={data.comites[0]} tabelas={['entrevista']} dependencia="app:entrevistas" />
</p>
<h1>Entrevistas</h1>
<p class="suave">Peça pelo app; a delegação aceita e escolhe o horário.</p>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

<form class="formulario" aria-label="Pedir entrevista" onsubmit={pedir}>
	<label class="campo">
		Delegação
		<select required bind:value={delegacao}>
			{#each data.delegacoes as d (d.id)}<option value={d.id}>{d.nome}</option>{/each}
		</select>
	</label>
	<label class="campo">
		Tema
		<input required maxlength="300" bind:value={tema} />
	</label>
	<button class="botao">Pedir entrevista</button>
</form>

<section aria-labelledby="t-pedidos">
	<h2 id="t-pedidos">Pedidos</h2>
	<ul class="lista">
		{#each data.entrevistas as e (e.id)}
			<li>
				<span>
					<strong>{e.delegacao?.nome}</strong>: {e.tema}
					<span class="detalhe">
						{SITUACAO[e.status]}{e.status === 'aceita' && e.horario ? `, ${formatarQuando(e.horario, agora)}` : ''}
					</span>
				</span>
			</li>
		{:else}
			<li class="suave">Nenhum pedido ainda.</li>
		{/each}
	</ul>
</section>
