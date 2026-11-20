<script lang="ts">
	import { goto } from '$app/navigation';
	import { paragrafos } from '#lib/impressao.ts';
	import { reduzirImagem } from '#lib/imagem.ts';
	import { palavroes } from '#lib/palavroes.ts';
	import { TIPOS_NOTICIA } from '#lib/press.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// O id nasce com o rascunho: se a internet cair no meio, publicar de novo não duplica.
	let id = crypto.randomUUID();
	let veiculoId = $state(''); // vazio: o primeiro veículo
	let tipo = $state('reportagem');
	let titulo = $state('');
	let linhaFina = $state('');
	let texto = $state('');
	let dataSimulacao = $state('');
	let citadas = $state<string[]>([]);
	let arquivos = $state<FileList | undefined>();
	let descricao = $state('');
	let erro = $state('');
	let enviando = $state(false);

	const veiculo = $derived(data.veiculos.find((v) => v.id === veiculoId) ?? data.veiculos[0]);
	const delegacoes = $derived(data.delegacoes.filter((d) => d.comite_id === veiculo.comite_id));
	const achados = $derived(palavroes(`${titulo} ${linhaFina} ${texto}`));
	const previa = $derived(arquivos?.[0] ? URL.createObjectURL(arquivos[0]) : null);
	$effect(() => {
		const url = previa;
		return () => {
			if (url) URL.revokeObjectURL(url);
		};
	});

	async function publicar(evento: SubmitEvent) {
		evento.preventDefault();
		erro = '';
		enviando = true;
		try {
			let caminho: string | null = null;
			const arquivo = arquivos?.[0];
			if (arquivo) {
				const imagem = await reduzirImagem(arquivo, 1280);
				caminho = `${veiculo.id}/${id}.${imagem.type === 'image/webp' ? 'webp' : 'jpg'}`;
				const envio = await supabase.storage
					.from('press')
					.upload(caminho, imagem, { contentType: imagem.type, upsert: true });
				if (envio.error) throw envio.error;
			}
			const { error } = await supabase.rpc('publicar_noticia', {
				p_id: id,
				p_veiculo: veiculo.id,
				p_tipo: tipo,
				p_titulo: titulo,
				p_texto: texto,
				p_linha_fina: linhaFina,
				p_imagem_path: caminho ?? undefined,
				p_imagem_descricao: descricao,
				p_data_simulacao: dataSimulacao || undefined,
				p_citadas: citadas
			});
			if (error) throw error;
			const publicada = id;
			id = crypto.randomUUID();
			await goto(`/press/${veiculo.comite?.sigla}?n=${publicada}`);
		} catch (e) {
			erro = mensagemDeErro(e as { code?: string; message?: string });
		} finally {
			enviando = false;
		}
	}
</script>

<svelte:head>
	<title>Escrever matéria · Press · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">Press · Simulação</p>
<h1>Escrever matéria</h1>

<div class="escrever">
	<form class="formulario formulario--largo" onsubmit={publicar}>
		{#if data.veiculos.length > 1}
			<label class="campo">
				Veículo
				<select bind:value={veiculoId}>
					{#each data.veiculos as v (v.id)}<option value={v.id}>{v.nome}</option>{/each}
				</select>
			</label>
		{/if}
		<label class="campo">
			Tipo
			<select bind:value={tipo}>
				{#each Object.entries(TIPOS_NOTICIA) as [valor, rotulo] (valor)}<option value={valor}>{rotulo}</option>{/each}
			</select>
		</label>
		<label class="campo">
			Título
			<input required maxlength="200" bind:value={titulo} />
		</label>
		<label class="campo">
			Linha fina (opcional)
			<input maxlength="300" bind:value={linhaFina} />
		</label>
		<label class="campo">
			Texto (parágrafos separados por uma linha em branco)
			<textarea required rows="10" maxlength="10000" bind:value={texto}></textarea>
		</label>
		<p class="aviso-palavrao" aria-live="polite">
			{#if achados.length}
				Atenção: o texto tem {achados.length === 1 ? 'uma palavra' : 'palavras'} que pode{achados.length === 1 ? '' : 'm'} ferir o decoro
				({achados.join(', ')}). Você ainda pode publicar.
			{/if}
		</p>
		<label class="campo">
			Data na simulação (opcional, para comitês históricos)
			<input type="date" bind:value={dataSimulacao} />
		</label>
		<label class="campo">
			Imagem (opcional)
			<input type="file" accept="image/*" bind:files={arquivos} />
		</label>
		{#if arquivos?.[0]}
			<label class="campo">
				Descrição da imagem (para quem usa leitor de tela)
				<input required maxlength="300" bind:value={descricao} />
			</label>
		{/if}
		{#if delegacoes.length}
			<fieldset class="opcoes voluntarias">
				<legend>Delegações citadas</legend>
				{#each delegacoes as d (d.id)}
					<label class="opcao"><input type="checkbox" value={d.id} bind:group={citadas} /> {d.nome}</label>
				{/each}
			</fieldset>
		{/if}
		{#if erro}
			<p class="erro" role="alert">{erro}</p>
		{/if}
		<button class="botao" disabled={enviando}>{enviando ? 'Publicando…' : 'Publicar'}</button>
	</form>

	<section class="cartao materia previa" aria-labelledby="t-previa">
		<h2 id="t-previa" class="rotulo">Prévia · {veiculo.nome}</h2>
		<p class="rotulo">{TIPOS_NOTICIA[tipo]}</p>
		<p class="previa-titulo">{titulo || 'Título da matéria'}</p>
		{#if linhaFina}<p class="linha-fina">{linhaFina}</p>{/if}
		{#if previa}<img class="materia-imagem" src={previa} alt={descricao} />{/if}
		{#each paragrafos(texto) as p, i (i)}<p>{p}</p>{/each}
	</section>
</div>
