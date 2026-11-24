<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import Quando from '#lib/ui/Quando.svelte';
	import { contador } from '#lib/contador.ts';
	import { locale, t } from '#lib/i18n.svelte.ts';
	import Confirmar from '#lib/ui/Confirmar.svelte';
	import { invalidate } from '$app/navigation';
	import { paragrafos } from '#lib/impressao.ts';
	import { gerarImagem, hashtags, type Formato } from '#lib/imagem-redes.ts';
	import { APP, marca } from '#lib/titulo.svelte.ts';
	import { legendaDaNoticia, linkWhatsApp, linkX, TIPOS_NOTICIA } from '#lib/press.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const souPress = $derived(data.participacoes.some((p) => p.papel === 'press' && p.comite_id === data.comite.id));
	const modero = $derived(data.participacoes.some((p) => p.papel === 'secretaria' || p.papel === 'diretoria_press'));
	const noticia = $derived(data.noticias.find((n) => n.id === data.aberta));
	const denunciasDaAberta = $derived(data.denuncias.filter((d) => d.noticia_id === data.aberta));

	const SITUACAO: Record<string, { rotulo: string; selo: string } | undefined> = {
		aguardando: { rotulo: t('Aguardando revisão'), selo: 'selo--alerta' },
		oculta: { rotulo: t('Oculta'), selo: 'selo--erro' }
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
	// Passo 36: a legenda pronta para WhatsApp, X e para colar no Instagram.
	const legendaPronta = $derived(noticia ? legendaDaNoticia(noticia, hashtags(marca.evento ?? APP)) : '');
	let copiada = $state<boolean | null>(null);
	async function copiarLegenda() {
		try {
			await navigator.clipboard.writeText(legendaPronta);
			copiada = true;
		} catch {
			copiada = false; // sem permissão: a legenda aparece num campo, já selecionada
		}
	}
	async function compartilhar(formato: Formato) {
		if (!noticia) return;
		const evento = marca.evento ?? APP;
		legenda = `${noticia.titulo} ${hashtags(evento)}`;
		const png = await gerarImagem(formato, { veiculo: data.veiculo.nome, titulo: noticia.titulo, linhaFina: noticia.linha_fina, evento });
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
		new Date(`${d}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
</script>

<svelte:head>
	<title>{tituloDaAba(data.veiculo.nome, t('Press'))}</title>
</svelte:head>

<header class="jornal-cabecalho">
	<p class="rotulo">
		{t('Press')} · {data.comite.sigla} · {t('Simulação')}
		<AoVivo comiteId={data.comite.id} tabelas={['noticia']} dependencia="app:press" />
	</p>
	<h1>{data.veiculo.nome}</h1>
	{#if data.veiculo.linha_editorial}<p class="suave">{data.veiculo.linha_editorial}</p>{/if}
</header>
{#if souPress || modero}
	<p class="acoes">
		{#if souPress}<a class="botao" href="/press/escrever">{t('Escrever matéria')}</a>{/if}
		<a class="botao botao--secundario" href={`/imprimir/edicao/${data.comite.sigla}`}>{t('Edição do dia')}</a>
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
			{#if noticia.imagem}<img class="materia-imagem" src={noticia.imagem} alt={noticia.imagem_descricao ?? ''} loading="lazy" decoding="async" />{/if}
			{#each paragrafos(noticia.texto) as p, i (i)}<p>{p}</p>{/each}
			{#if noticia.citacoes.length}
				<p class="detalhe">{t('Cita')}: {noticia.citacoes.map((c) => c.delegacao?.nome).join(', ')}</p>
			{/if}
			<p class="detalhe">
				{noticia.autor?.nome ? `${t('Por')} ${noticia.autor.nome} · ` : ''}<Quando iso={noticia.publicada_em} />
			</p>
			{#if souPress && noticia.status === 'publicada'}
				<div class="acoes">
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => compartilhar('post')}>{t('Imagem para post')}</button>
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => compartilhar('story')}>{t('Imagem para story')}</button>
				</div>
				<div class="acoes">
					<a class="botao botao--secundario botao--pequeno" href={linkWhatsApp(legendaPronta)} target="_blank" rel="noopener">WhatsApp</a>
					<a class="botao botao--secundario botao--pequeno" href={linkX(legendaPronta)} target="_blank" rel="noopener">X</a>
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={copiarLegenda}>{t('Copiar legenda')}</button>
				</div>
				{#if copiada}
					<p class="sucesso" role="status">{t('Legenda copiada.')}</p>
				{:else if copiada === false}
					<label class="campo">
						{t('Copie a legenda')}
						<textarea readonly rows="4" value={legendaPronta} {@attach (campo) => campo.select()}></textarea>
					</label>
				{/if}
				<p class="suave">{t('Publique a imagem pelo Instagram no celular ou pelo Meta Business Suite.')}</p>
				{#if legenda}<p class="detalhe">{t('Legenda')}: {legenda}</p>{/if}
			{/if}
			{#if noticia.motivo_ocultacao}
				<p class="telegrama" role="note" aria-label={t('Motivo da ocultação')}>{noticia.motivo_ocultacao}</p>
			{/if}

			{#if modero}
				{#if denunciasDaAberta.length}
					<section aria-labelledby="t-denuncias">
						<h3 id="t-denuncias">{t('Denúncias')} ({denunciasDaAberta.length})</h3>
						<ul class="lista">
							{#each denunciasDaAberta as d (d.id)}<li>{d.motivo}</li>{/each}
						</ul>
					</section>
				{/if}
				<div class="formulario formulario--largo">
					{#if noticia.status === 'aguardando'}
						<button class="botao" type="button" onclick={() => executar(supabase.rpc('aprovar_noticia', { p_noticia: noticia.id }), t('Notícia publicada.'))}
							>{t('Aprovar e publicar')}</button
						>
					{/if}
					{#if noticia.status !== 'oculta'}
						<label class="campo">
							{t('Motivo da ocultação')}
							<textarea rows="2" maxlength="500" bind:value={motivo} {@attach contador(motivo)}></textarea>
						</label>
						<Confirmar
							rotulo={t('Ocultar notícia')}
							classe="botao botao--secundario"
							pergunta={t('Ocultar “{titulo}”?', { titulo: noticia.titulo })}
							explicacao={t('A notícia deixa de aparecer para o evento. O motivo fica registrado.')}
							acao={() => executar(supabase.rpc('ocultar_noticia', { p_noticia: noticia.id, p_motivo: motivo }), t('Notícia ocultada.'))}
						/>
					{/if}
				</div>
			{:else if !souPress}
				<details class="denunciar">
					<summary>{t('Denunciar')}</summary>
					<div class="formulario">
						<label class="campo">
							{t('Motivo da denúncia')}
							<textarea rows="2" maxlength="500" bind:value={motivo} {@attach contador(motivo)}></textarea>
						</label>
						<button
							class="botao botao--secundario"
							type="button"
							onclick={() =>
								executar(supabase.rpc('denunciar_noticia', { p_noticia: noticia.id, p_motivo: motivo }), t('Denúncia enviada à Diretoria da Press.'))}
							>{t('Enviar denúncia')}</button
						>
					</div>
				</details>
			{/if}
		</article>
	{/if}

	<section aria-labelledby="t-feed">
		<h2 id="t-feed">{t('Matérias')}</h2>
		<ol class="lista">
			{#each data.noticias as n (n.id)}
				<li>
					<a href={`?n=${n.id}`} aria-current={n.id === data.aberta ? 'true' : undefined}>
						<span>
							<strong>{n.titulo}</strong>
							<span class="detalhe">
								{TIPOS_NOTICIA[n.tipo]} · <Quando iso={n.publicada_em} />
								{#if SITUACAO[n.status]}<span class="selo {SITUACAO[n.status]?.selo}">{SITUACAO[n.status]?.rotulo}</span>{/if}
							</span>
						</span>
					</a>
				</li>
			{:else}
				<li class="suave">{t('Nenhuma matéria ainda.')}</li>
			{/each}
		</ol>
	</section>
</div>
