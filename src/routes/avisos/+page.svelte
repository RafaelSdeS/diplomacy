<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { invalidate } from '$app/navigation';
	import Bell from '@lucide/svelte/icons/bell';
	import { formatarQuando } from '#lib/cronograma.ts';
	import { supabase } from '#lib/supabase.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// "Novo" vale para esta visita: guarda quando a pessoa tinha visto antes de abrir.
	const vistosAntes = untrack(() => (data.vistosEm ? new Date(data.vistosEm) : null));
	const ehNovo = (criadoEm: string) => !vistosAntes || new Date(criadoEm) > vistosAntes;
	onMount(() => {
		void supabase.rpc('marcar_avisos_vistos');
	});

	const agora = new Date();
	const destinoDe = (id: string | null) =>
		id ? `Para o ${data.comites.find((c) => c.id === id)?.sigla ?? 'comitê'}` : 'Para todos';
	const podeRemover = (autorId: string | null) => data.secretaria || autorId === data.usuario?.id;

	let texto = $state('');
	let destino = $state(untrack(() => data.destinos[0]?.id ?? ''));
	let erro = $state('');

	async function publicar(evento: SubmitEvent) {
		evento.preventDefault();
		erro = '';
		const { error } = await supabase
			.from('aviso')
			.insert({ evento_id: data.evento!, comite_id: destino || null, texto: texto.trim() });
		if (error) {
			erro = 'Não foi possível publicar o aviso.';
			return;
		}
		texto = '';
		await invalidate('app:avisos');
	}

	async function remover(id: string) {
		erro = '';
		const { error } = await supabase.from('aviso').delete().eq('id', id);
		if (error) {
			erro = 'Não foi possível remover o aviso.';
			return;
		}
		await invalidate('app:avisos');
	}
</script>

<svelte:head>
	<title>Avisos · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">Evento</p>
<h1>Avisos</h1>

{#if data.destinos.length > 0}
	<section aria-labelledby="t-publicar">
		<h2 id="t-publicar">Publicar aviso</h2>
		<form class="formulario" onsubmit={publicar}>
			<label class="campo">
				Aviso
				<textarea required maxlength="1000" bind:value={texto}></textarea>
			</label>
			<label class="campo">
				Para
				<select bind:value={destino}>
					{#each data.destinos as d (d.id)}
						<option value={d.id}>{d.rotulo}</option>
					{/each}
				</select>
			</label>
			{#if erro}
				<p class="erro" role="alert">{erro}</p>
			{/if}
			<button class="botao">Publicar</button>
		</form>
	</section>
{/if}

<section aria-labelledby="t-avisos">
	<h2 id="t-avisos">Todos os avisos</h2>
	<ul class="lista">
		{#each data.avisos as aviso (aviso.id)}
			<li>
				<span>
					{#if ehNovo(aviso.criado_em)}
						<span class="selo selo--info"><Bell aria-hidden="true" size={14} /> Novo</span>
					{/if}
					{aviso.texto}
					<span class="detalhe">{destinoDe(aviso.comite_id)} · {formatarQuando(aviso.criado_em, agora)}</span>
				</span>
				{#if podeRemover(aviso.autor_id)}
					<button
						class="botao botao--secundario botao--pequeno"
						type="button"
						aria-label={`Remover o aviso "${aviso.texto.slice(0, 40)}"`}
						onclick={() => remover(aviso.id)}>Remover</button
					>
				{/if}
			</li>
		{:else}
			<li class="suave">Nenhum aviso ainda.</li>
		{/each}
	</ul>
</section>
