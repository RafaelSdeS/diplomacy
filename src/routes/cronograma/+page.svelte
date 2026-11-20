<script lang="ts">
	import { invalidate } from '$app/navigation';
	import Check from '@lucide/svelte/icons/check';
	import { agruparPorDia, formatarHora, itensAtuais } from '#lib/cronograma.ts';
	import { supabase } from '#lib/supabase.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let agora = $state(new Date());
	$effect(() => {
		const relogio = setInterval(() => (agora = new Date()), 30_000);
		return () => clearInterval(relogio);
	});

	const grupos = $derived(agruparPorDia(data.itens));
	const atuais = $derived(new Set(itensAtuais(data.itens, agora).map((i) => i.id)));
	const siglaDe = (id: string | null) => data.comites.find((c) => c.id === id)?.sigla;

	// Formulário da secretaria.
	let titulo = $state('');
	let local = $state('');
	let inicio = $state('');
	let fim = $state('');
	let comite = $state('');
	let erro = $state('');

	async function adicionar(evento: SubmitEvent) {
		evento.preventDefault();
		erro = '';
		const { error } = await supabase.from('cronograma_item').insert({
			evento_id: data.eventoDaSecretaria!,
			comite_id: comite || null,
			titulo: titulo.trim(),
			local: local.trim() || null,
			// datetime-local vem no horário do aparelho; o banco guarda com fuso.
			inicio: new Date(inicio).toISOString(),
			fim: new Date(fim).toISOString()
		});
		if (error) {
			erro =
				error.code === '23514'
					? 'O fim precisa ser depois do início.'
					: error.code === '23505'
						? 'Já existe um item com esse título nesse horário.'
						: 'Não foi possível adicionar o item.';
			return;
		}
		titulo = local = inicio = fim = comite = '';
		await invalidate('app:cronograma');
	}

	async function remover(id: string) {
		erro = '';
		const { error } = await supabase.from('cronograma_item').delete().eq('id', id);
		if (error) {
			erro = 'Não foi possível remover o item.';
			return;
		}
		await invalidate('app:cronograma');
	}
</script>

<svelte:head>
	<title>Cronograma · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">Evento</p>
<h1>Cronograma</h1>

{#each grupos as grupo (grupo.chave)}
	<section aria-labelledby={`dia-${grupo.chave}`}>
		<h2 id={`dia-${grupo.chave}`} class="capitalizar">{grupo.rotulo}</h2>
		<ul class="lista">
			{#each grupo.itens as item (item.id)}
				<li aria-current={atuais.has(item.id) ? 'time' : undefined}>
					<span>
						<span class="hora">{formatarHora(item.inicio)}–{formatarHora(item.fim)}</span>
						{item.titulo}
						{#if atuais.has(item.id)}
							<span class="selo selo--ok"><Check aria-hidden="true" size={14} /> Agora</span>
						{/if}
						<span class="detalhe">{[item.local, siglaDe(item.comite_id)].filter(Boolean).join(' · ')}</span>
					</span>
					{#if data.eventoDaSecretaria}
						<button
							class="botao botao--secundario botao--pequeno"
							type="button"
							aria-label={`Remover ${item.titulo}`}
							onclick={() => remover(item.id)}>Remover</button
						>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{:else}
	<p class="suave">O cronograma ainda está vazio.</p>
{/each}

{#if data.eventoDaSecretaria}
	<section aria-labelledby="t-novo-item">
		<h2 id="t-novo-item">Novo item</h2>
		<form class="formulario" onsubmit={adicionar}>
			<label class="campo">
				Título
				<input required maxlength="120" bind:value={titulo} />
			</label>
			<label class="campo">
				Local
				<input maxlength="120" bind:value={local} />
			</label>
			<label class="campo">
				Início
				<input type="datetime-local" required bind:value={inicio} />
			</label>
			<label class="campo">
				Fim
				<input type="datetime-local" required bind:value={fim} />
			</label>
			<label class="campo">
				Para
				<select bind:value={comite}>
					<option value="">Todos</option>
					{#each data.comites as c (c.id)}
						<option value={c.id}>{c.sigla}</option>
					{/each}
				</select>
			</label>
			{#if erro}
				<p class="erro" role="alert">{erro}</p>
			{/if}
			<button class="botao">Adicionar ao cronograma</button>
		</form>
	</section>
{/if}
