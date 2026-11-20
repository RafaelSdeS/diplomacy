<script lang="ts">
	import { esquecerConta } from '#lib/conta.ts';
	import { untrack } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { reduzirImagem } from '#lib/imagem.ts';
	import { rotuloPapel } from '#lib/papeis.ts';
	import { supabase } from '#lib/supabase.ts';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let nome = $state(untrack(() => data.pessoa.nome));
	let bio = $state(untrack(() => data.pessoa.bio ?? ''));
	let fotoUrl = $state(untrack(() => data.fotoUrl));
	let mensagem = $state('');
	let erro = $state('');
	let enviandoFoto = $state(false);

	async function salvar(evento: SubmitEvent) {
		evento.preventDefault();
		mensagem = erro = '';
		const { error } = await supabase
			.from('pessoa')
			.update({ nome: nome.trim(), bio: bio.trim() || null })
			.eq('id', data.usuario!.id);
		if (error) {
			erro = 'Não foi possível salvar o perfil.';
			return;
		}
		mensagem = 'Perfil salvo.';
		esquecerConta();
		await invalidate('app:sessao'); // o nome do cabeçalho
	}

	async function enviarFoto(evento: Event & { currentTarget: HTMLInputElement }) {
		const arquivo = evento.currentTarget.files?.[0];
		if (!arquivo) return;
		mensagem = erro = '';
		enviandoFoto = true;
		try {
			const imagem = await reduzirImagem(arquivo);
			const caminho = `${data.usuario!.id}/foto`;
			const envio = await supabase.storage
				.from('fotos')
				.upload(caminho, imagem, { upsert: true, contentType: imagem.type });
			if (envio.error) throw envio.error;
			const atualizacao = await supabase.from('pessoa').update({ foto_path: caminho }).eq('id', data.usuario!.id);
			if (atualizacao.error) throw atualizacao.error;
			const assinada = await supabase.storage.from('fotos').createSignedUrl(caminho, 3600);
			fotoUrl = assinada.data?.signedUrl ?? null;
			mensagem = 'Foto atualizada.';
		} catch {
			erro = 'Não foi possível enviar a foto. Tente outra imagem.';
		} finally {
			enviandoFoto = false;
		}
	}
</script>

<svelte:head>
	<title>Perfil · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">Conta</p>
<h1>Perfil</h1>

<section aria-labelledby="t-participacao">
	<h2 id="t-participacao">Sua participação</h2>
	<ul class="lista">
		{#each data.participacoes as p (p.id)}
			<li>
				<span class="com-bandeira">
					<Bandeira codigo={p.delegacao_bandeira} />
					{[rotuloPapel(p.papel), p.delegacao_nome, p.comite_sigla, p.evento_nome].filter(Boolean).join(' · ')}
				</span>
			</li>
		{/each}
	</ul>
</section>

<section aria-labelledby="t-dados">
	<h2 id="t-dados">Seus dados</h2>
	{#if fotoUrl}
		<img class="foto" src={fotoUrl} alt="Sua foto" width="96" height="96" />
	{/if}
	<form class="formulario" onsubmit={salvar}>
		<label class="campo">
			Foto
			<input type="file" accept="image/*" disabled={enviandoFoto} onchange={enviarFoto} />
		</label>
		<label class="campo">
			Nome
			<input required maxlength="80" autocomplete="name" bind:value={nome} />
		</label>
		<label class="campo">
			Minibiografia
			<textarea maxlength="500" bind:value={bio}></textarea>
		</label>
		{#if mensagem}
			<p class="sucesso" role="status">{mensagem}</p>
		{/if}
		{#if erro}
			<p class="erro" role="alert">{erro}</p>
		{/if}
		<button class="botao">Salvar perfil</button>
	</form>
</section>
