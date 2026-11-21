<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { contador } from '#lib/contador.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { guardarRascunho, lerRascunho } from '#lib/rascunho.ts';
	import { goto } from '$app/navigation';
	import { caixa, mensagemDoEnvio } from '#lib/caixa.ts';
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
	let texto = $state(lerRascunho('noticia'));
	$effect(() => guardarRascunho('noticia', texto));
	let dataSimulacao = $state('');
	let citadas = $state<string[]>([]);
	let arquivos = $state<FileList | undefined>();
	let descricao = $state('');
	let erro = $state('');
	let aviso = $state('');
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
		erro = aviso = '';
		enviando = true;
		try {
			// Pela caixa de saída (com a imagem já reduzida): sem internet, a matéria fica no
			// aparelho e é publicada sozinha depois.
			const arquivo = arquivos?.[0];
			const imagem = arquivo ? await reduzirImagem(arquivo, 1280) : null;
			const caminho = imagem ? `${veiculo.id}/${id}.${imagem.type === 'image/webp' ? 'webp' : 'jpg'}` : null;
			const resultado = await caixa.enviar({
				id,
				rpc: 'publicar_noticia',
				args: {
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
				},
				imagem: imagem && caminho ? { bucket: 'press', caminho, blob: imagem } : undefined,
				rotulo: `Matéria: ${titulo}`
			});
			const envio = mensagemDoEnvio(resultado, '');
			if (envio.erro) {
				erro = envio.erro;
				return;
			}
			const publicada = id;
			id = crypto.randomUUID();
			if (resultado === 'guardado') {
				aviso = envio.mensagem;
				titulo = linhaFina = texto = descricao = '';
				citadas = [];
				return;
			}
			guardarRascunho('noticia', '');
			await goto(`/press/${veiculo.comite?.sigla}?n=${publicada}`);
		} catch (e) {
			erro = mensagemDeErro(e as { code?: string; message?: string });
		} finally {
			enviando = false;
		}
	}
</script>

<svelte:head>
	<title>{tituloDaAba(t('Escrever matéria'), t('Press'))}</title>
</svelte:head>

<p class="rotulo">{t('Press · Simulação')}</p>
<h1>{t('Escrever matéria')}</h1>

<div class="escrever">
	<form class="formulario formulario--largo" onsubmit={publicar}>
		{#if data.veiculos.length > 1}
			<label class="campo">
				{t('Veículo')}
				<select bind:value={veiculoId}>
					{#each data.veiculos as v (v.id)}<option value={v.id}>{v.nome}</option>{/each}
				</select>
			</label>
		{/if}
		<label class="campo">
			{t('Tipo')}
			<select bind:value={tipo}>
				{#each Object.entries(TIPOS_NOTICIA) as [valor, rotulo] (valor)}<option value={valor}>{rotulo}</option>{/each}
			</select>
		</label>
		<label class="campo">
			{t('Título')}
			<input required maxlength="200" bind:value={titulo} {@attach contador(titulo)} />
		</label>
		<label class="campo">
			{t('Linha fina (opcional)')}
			<input maxlength="300" bind:value={linhaFina} {@attach contador(linhaFina)} />
		</label>
		<label class="campo">
			{t('Texto (parágrafos separados por uma linha em branco)')}
			<textarea required rows="10" maxlength="10000" bind:value={texto} {@attach contador(texto)}></textarea>
		</label>
		<p class="aviso-palavrao" aria-live="polite">
			{#if achados.length}
				{t('Atenção: o texto tem palavras que podem ferir o decoro ({palavras}). Você ainda pode publicar.', { palavras: achados.join(', ') })}
			{/if}
		</p>
		<label class="campo">
			{t('Data na simulação (opcional, para comitês históricos)')}
			<input type="date" bind:value={dataSimulacao} />
		</label>
		<label class="campo">
			{t('Imagem (opcional)')}
			<input type="file" accept="image/*" bind:files={arquivos} />
		</label>
		{#if arquivos?.[0]}
			<label class="campo">
				{t('Descrição da imagem (para quem usa leitor de tela)')}
				<input required maxlength="300" bind:value={descricao} {@attach contador(descricao)} />
			</label>
		{/if}
		{#if delegacoes.length}
			<fieldset class="opcoes voluntarias">
				<legend>{t('Delegações citadas')}</legend>
				{#each delegacoes as d (d.id)}
					<label class="opcao"><input type="checkbox" value={d.id} bind:group={citadas} /> {d.nome}</label>
				{/each}
			</fieldset>
		{/if}
		{#if erro}
			<p class="erro" role="alert">{erro}</p>
		{/if}
		{#if aviso}
			<p class="sucesso" role="status">{aviso}</p>
		{/if}
		<button class="botao" disabled={enviando}>{enviando ? t('Publicando…') : t('Publicar')}</button>
	</form>

	<section class="cartao materia previa" aria-labelledby="t-previa">
		<h2 id="t-previa" class="rotulo">{t('Prévia')} · {veiculo.nome}</h2>
		<p class="rotulo">{TIPOS_NOTICIA[tipo]}</p>
		<p class="previa-titulo">{titulo || t('Título da matéria')}</p>
		{#if linhaFina}<p class="linha-fina">{linhaFina}</p>{/if}
		{#if previa}<img class="materia-imagem" src={previa} alt={descricao} />{/if}
		{#each paragrafos(texto) as p, i (i)}<p>{p}</p>{/each}
	</section>
</div>
