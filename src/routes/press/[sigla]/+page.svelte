<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { formatarQuando } from '#lib/cronograma.ts';
	import { paragrafos } from '#lib/impressao.ts';
	import { gerarImagem, HASHTAGS, type Formato } from '#lib/imagem-redes.ts';
	import { TIPOS_NOTICIA } from '#lib/press.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const agora = new Date();

	const souPress = $derived(data.participacoes.some((p) => p.papel === 'press' && p.comite_id === data.comite.id));
	const modero = $derived(data.participacoes.some((p) => p.papel === 'secretaria' || p.papel === 'diretoria_press'));
	const noticia = $derived(data.noticias.find((n) => n.id === data.aberta));
	const denunciasDaAberta = $derived(data.denuncias.filter((d) => d.noticia_id === data.aberta));

	const SITUACAO: Record<string, { rotulo: string; selo: string } | undefined> = {
		aguardando: { rotulo: 'Aguardando revisão', selo: 'selo--alerta' },
		oculta: { rotulo: 'Oculta', selo: 'selo--erro' }
	};

	let motivo = $state('');
	let erro = $state('');
	let mensagem = $state('');

	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, ok: string) {
		erro = mensagem = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		else {
			mensagem = ok;
			motivo = '';
		}
		await invalidate('app:press');
	}

	// Imagem para as redes: no celular, o botão de compartilhar do sistema; no notebook, o download.
	let legenda = $state('');
	async function compartilhar(formato: Formato) {
		if (!noticia) return;
		legenda = `${noticia.titulo} ${HASHTAGS}`;
		const png = await gerarImagem(formato, { veiculo: data.veiculo.nome, titulo: noticia.titulo, linhaFina: noticia.linha_fina });
		const arquivo = new File([png], `${data.veiculo.nome}-${formato}.png`.replace(/\s+/g, '-'), { type: 'image/png' });
		if (navigator.canShare?.({ files: [arquivo] })) {
			await navigator.share({ files: [arquivo], text: legenda }).catch(() => {});
			return;
		}
		const link = document.createElement('a');
		link.href = URL.createObjectURL(arquivo);
		link.download = arquivo.name;
		link.click();
		setTimeout(() => URL.revokeObjectURL(link.href), 1000);
	}

	const dataDaSimulacao = (d: string) =>
		new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
</script>

<svelte:head>
	<title>{data.veiculo.nome} · Press · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">
	Press · {data.comite.sigla} · Simulação
	<AoVivo comiteId={data.comite.id} tabelas={['noticia']} dependencia="app:press" />
</p>
<h1>{data.veiculo.nome}</h1>
{#if data.veiculo.linha_editorial}<p class="suave">{data.veiculo.linha_editorial}</p>{/if}
{#if souPress || modero}
	<p class="acoes">
		{#if souPress}<a class="botao" href="/press/escrever">Escrever matéria</a>{/if}
		<a class="botao botao--secundario" href={`/imprimir/edicao/${data.comite.sigla}`}>Edição do dia</a>
	</p>
{/if}

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

<div class="press-feed">
	{#if noticia}
		<article class="cartao materia" aria-labelledby="t-materia">
			<p class="rotulo">
				{TIPOS_NOTICIA[noticia.tipo]}
				{#if noticia.data_simulacao}· {dataDaSimulacao(noticia.data_simulacao)}{/if}
				{#if SITUACAO[noticia.status]}<span class="selo {SITUACAO[noticia.status]?.selo}">{SITUACAO[noticia.status]?.rotulo}</span>{/if}
			</p>
			<h2 id="t-materia">{noticia.titulo}</h2>
			{#if noticia.linha_fina}<p class="linha-fina">{noticia.linha_fina}</p>{/if}
			{#if noticia.imagem}<img class="materia-imagem" src={noticia.imagem} alt={noticia.imagem_descricao ?? ''} />{/if}
			{#each paragrafos(noticia.texto) as p, i (i)}<p>{p}</p>{/each}
			{#if noticia.citacoes.length}
				<p class="detalhe">Cita: {noticia.citacoes.map((c) => c.delegacao?.nome).join(', ')}</p>
			{/if}
			<p class="detalhe">
				{noticia.autor?.nome ? `Por ${noticia.autor.nome} · ` : ''}{formatarQuando(noticia.publicada_em, agora)}
			</p>
			{#if souPress && noticia.status === 'publicada'}
				<div class="acoes">
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => compartilhar('post')}>Imagem para post</button>
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => compartilhar('story')}>Imagem para story</button>
				</div>
				{#if legenda}<p class="detalhe">Legenda: {legenda}</p>{/if}
			{/if}
			{#if noticia.motivo_ocultacao}
				<p class="telegrama" role="note" aria-label="Motivo da ocultação">{noticia.motivo_ocultacao}</p>
			{/if}

			{#if modero}
				{#if denunciasDaAberta.length}
					<section aria-labelledby="t-denuncias">
						<h3 id="t-denuncias">Denúncias ({denunciasDaAberta.length})</h3>
						<ul class="lista">
							{#each denunciasDaAberta as d (d.id)}<li>{d.motivo}</li>{/each}
						</ul>
					</section>
				{/if}
				<div class="formulario formulario--largo">
					{#if noticia.status === 'aguardando'}
						<button class="botao" type="button" onclick={() => executar(supabase.rpc('aprovar_noticia', { p_noticia: noticia.id }), 'Notícia publicada.')}
							>Aprovar e publicar</button
						>
					{/if}
					{#if noticia.status !== 'oculta'}
						<label class="campo">
							Motivo da ocultação
							<textarea rows="2" maxlength="500" bind:value={motivo}></textarea>
						</label>
						<button
							class="botao botao--secundario"
							type="button"
							onclick={() => executar(supabase.rpc('ocultar_noticia', { p_noticia: noticia.id, p_motivo: motivo }), 'Notícia ocultada.')}
							>Ocultar notícia</button
						>
					{/if}
				</div>
			{:else if !souPress}
				<details class="denunciar">
					<summary>Denunciar</summary>
					<div class="formulario">
						<label class="campo">
							Motivo da denúncia
							<textarea rows="2" maxlength="500" bind:value={motivo}></textarea>
						</label>
						<button
							class="botao botao--secundario"
							type="button"
							onclick={() =>
								executar(supabase.rpc('denunciar_noticia', { p_noticia: noticia.id, p_motivo: motivo }), 'Denúncia enviada à Diretoria da Press.')}
							>Enviar denúncia</button
						>
					</div>
				</details>
			{/if}
		</article>
	{/if}

	<section aria-labelledby="t-feed">
		<h2 id="t-feed">Matérias</h2>
		<ol class="lista">
			{#each data.noticias as n (n.id)}
				<li>
					<a href={`?n=${n.id}`} aria-current={n.id === data.aberta ? 'true' : undefined}>
						<span>
							<strong>{n.titulo}</strong>
							<span class="detalhe">
								{TIPOS_NOTICIA[n.tipo]} · {formatarQuando(n.publicada_em, agora)}
								{#if SITUACAO[n.status]}<span class="selo {SITUACAO[n.status]?.selo}">{SITUACAO[n.status]?.rotulo}</span>{/if}
							</span>
						</span>
					</a>
				</li>
			{:else}
				<li class="suave">Nenhuma matéria ainda.</li>
			{/each}
		</ol>
	</section>
</div>
