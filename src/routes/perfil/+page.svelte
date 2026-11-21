<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
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
	let idiomaEscolhido = $state(untrack(() => data.pessoa.idioma ?? ''));
	let fotoUrl = $state(untrack(() => data.fotoUrl));
	let mensagem = $state('');
	let erro = $state('');
	let enviandoFoto = $state(false);

	async function salvar(evento: SubmitEvent) {
		evento.preventDefault();
		mensagem = erro = '';
		const { error } = await supabase
			.from('pessoa')
			.update({ nome: nome.trim(), bio: bio.trim() || null, idioma: idiomaEscolhido || null })
			.eq('id', data.usuario!.id);
		if (error) {
			erro = t('Não foi possível salvar o perfil.');
			return;
		}
		mensagem = t('Perfil salvo.');
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
			mensagem = t('Foto atualizada.');
		} catch {
			erro = t('Não foi possível enviar a foto. Tente outra imagem.');
		} finally {
			enviandoFoto = false;
		}
	}
</script>

<svelte:head>
	<title>{t('Perfil · UFRGSMUN')}</title>
</svelte:head>

<p class="rotulo">{t('Conta')}</p>
<h1>{t('Perfil')}</h1>
<p class="acoes"><a class="botao botao--secundario" href="/perfil/meus-dados">{t('Meus dados (LGPD)')}</a> <a class="botao botao--secundario" href="/pesquisa">{t('Pesquisa de satisfação')}</a></p>

<section aria-labelledby="t-participacao">
	<h2 id="t-participacao">{t('Sua participação')}</h2>
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
	<h2 id="t-dados">{t('Seus dados')}</h2>
	{#if fotoUrl}
		<img class="foto" src={fotoUrl} alt={t('Sua foto')} width="96" height="96" />
	{/if}
	<form class="formulario" onsubmit={salvar}>
		<label class="campo">
			{t('Foto')}
			<input type="file" accept="image/*" disabled={enviandoFoto} onchange={enviarFoto} />
		</label>
		<label class="campo">
			{t('Nome')}
			<input required maxlength="80" autocomplete="name" bind:value={nome} />
		</label>
		<label class="campo">
			{t('Minibiografia')}
			<textarea maxlength="500" bind:value={bio}></textarea>
		</label>
		<label class="campo">
			{t('Idioma do app')}
			<select bind:value={idiomaEscolhido}>
				<option value="">{t('O do meu comitê')}</option>
				<option value="pt">Português</option>
				<option value="en">English</option>
			</select>
		</label>
		{#if mensagem}
			<p class="sucesso" role="status">{mensagem}</p>
		{/if}
		{#if erro}
			<p class="erro" role="alert">{erro}</p>
		{/if}
		<button class="botao">{t('Salvar perfil')}</button>
	</form>

{#if data.recortes.length}
	<section aria-labelledby="t-recortes">
		<h2 id="t-recortes">{t('Recortes da sua delegação')}</h2>
		<ul class="lista">
			{#each data.recortes as n (n.id)}
				<li>
					<span>
						<a href={`/press/${n.veiculo?.comite?.sigla}?n=${n.id}`}>{n.titulo}</a>
						<span class="detalhe">{n.veiculo?.nome}</span>
					</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}
</section>
