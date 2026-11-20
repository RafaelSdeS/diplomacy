<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { PAPEIS } from '#lib/papeis.ts';
	import { supabase, type Papel } from '#lib/supabase.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let email = $state('');
	let papel = $state<Papel>('delegado');
	let comite = $state('');
	let delegacao = $state('');
	let erro = $state('');
	let enviando = $state(false);

	const delegacoesDoComite = $derived(data.delegacoes.filter((d) => d.comite_id === comite));

	function descrever(item: { papel: Papel; comite_id: string | null; delegacao_id: string | null }) {
		const partes = [PAPEIS.find((p) => p.valor === item.papel)?.rotulo ?? item.papel];
		const sigla = data.comites.find((c) => c.id === item.comite_id)?.sigla;
		const delegacao = data.delegacoes.find((d) => d.id === item.delegacao_id)?.nome;
		if (sigla) partes.push(sigla);
		if (delegacao) partes.push(delegacao);
		return partes.join(' · ');
	}

	async function convidar(evento: SubmitEvent) {
		evento.preventDefault();
		enviando = true;
		erro = '';
		const { error } = await supabase.from('convite').insert({
			email: email.trim().toLowerCase(),
			evento_id: data.evento,
			papel,
			comite_id: papel === 'secretaria' || papel === 'diretoria_press' ? null : comite,
			delegacao_id: papel === 'delegado' ? delegacao : null
		});
		enviando = false;
		if (error) {
			erro =
				error.code === '23505'
					? 'Este convite já existe.'
					: 'Não foi possível criar o convite. Confira o e-mail, o comitê e a delegação.';
			return;
		}
		email = '';
		await invalidate('app:participantes');
	}

	async function remover(id: string) {
		erro = '';
		const { error } = await supabase.from('convite').delete().eq('id', id);
		if (error) {
			erro = 'Não foi possível remover o convite.';
			return;
		}
		await invalidate('app:participantes');
	}
</script>

<svelte:head>
	<title>Participantes · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">Secretaria</p>
<h1>Participantes</h1>
<nav class="atalhos" aria-label="Ferramentas da secretaria">
	<a class="botao botao--secundario" href="/secretaria/importar">Importar inscrições</a>
	<a class="botao botao--secundario" href="/imprimir/crachas">Crachás</a>
	<a class="botao botao--secundario" href="/secretaria/checkin">Check-in</a>
	<a class="botao botao--secundario" href="/secretaria/certificados">Certificados</a>
	<a class="botao botao--secundario" href="/secretaria/dados">Dados e arquivo</a>
</nav>
<p class="suave">
	Cada convite dá um papel a um e-mail. Quem já tem conta recebe o papel na hora; quem ainda não tem,
	quando a conta for criada. Remover um convite não tira o papel de quem já o recebeu.
</p>

<section aria-labelledby="t-novo">
	<h2 id="t-novo">Novo convite</h2>
	<form class="formulario" onsubmit={convidar}>
		<label class="campo">
			E-mail
			<input type="email" required autocomplete="off" bind:value={email} />
		</label>
		<label class="campo">
			Papel
			<select bind:value={papel}>
				{#each PAPEIS as p (p.valor)}
					<option value={p.valor}>{p.rotulo}</option>
				{/each}
			</select>
		</label>
		{#if papel !== 'secretaria' && papel !== 'diretoria_press'}
			<label class="campo">
				Comitê
				<select required bind:value={comite} onchange={() => (delegacao = '')}>
					<option value="" disabled>Escolha o comitê</option>
					{#each data.comites as c (c.id)}
						<option value={c.id}>{c.sigla} · {c.nome}</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if papel === 'delegado'}
			<label class="campo">
				Delegação
				<select required bind:value={delegacao}>
					<option value="" disabled>Escolha a delegação</option>
					{#each delegacoesDoComite as d (d.id)}
						<option value={d.id}>{d.nome}</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if erro}
			<p class="erro" role="alert">{erro}</p>
		{/if}
		<button class="botao" disabled={enviando}>Convidar</button>
	</form>
</section>

<section aria-labelledby="t-convites">
	<h2 id="t-convites">Convites ({data.convites.length})</h2>
	<ul class="lista">
		{#each data.convites as c (c.id)}
			<li>
				<span>
					{c.email}
					<span class="detalhe">{descrever(c)}</span>
				</span>
				<button
					class="botao botao--secundario botao--pequeno"
					type="button"
					aria-label={`Remover o convite de ${c.email}`}
					onclick={() => remover(c.id)}>Remover</button
				>
			</li>
		{/each}
	</ul>
</section>

<section aria-labelledby="t-inscritos">
	<h2 id="t-inscritos">Com acesso ({data.inscritos.length})</h2>
	<ul class="lista">
		{#each data.inscritos as p (p.id)}
			<li>
				<span>
					{p.pessoa?.nome}
					<span class="detalhe">{descrever(p)}</span>
				</span>
			</li>
		{/each}
	</ul>
</section>
