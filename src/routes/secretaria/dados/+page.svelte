<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import AcaoEmModal from '#lib/ui/AcaoEmModal.svelte';
	import CopyPlus from '@lucide/svelte/icons/copy-plus';
	import Eraser from '@lucide/svelte/icons/eraser';
	import { contador } from '#lib/contador.ts';
	import { invalidate } from '$app/navigation';
	import { rotuloPapel } from '#lib/papeis.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase, todasAsLinhas } from '#lib/supabase.ts';
	import type { PageProps } from './$types';
	import { t } from '#lib/i18n.svelte.ts';
	import { dica } from '#lib/dica.ts';

	let { data }: PageProps = $props();
	let erro = $state('');
	let mensagem = $state('');
	let confirmacao = $state('');
	let novoNome = $state('');
	let novoAno = $state(new Date().getFullYear() + 1);

	const falhar = (e: { code?: string; message?: string }) => ((erro = mensagemDeErro(e)), false);

	function baixar(nome: string, conteudo: unknown) {
		const link = document.createElement('a');
		link.href = URL.createObjectURL(new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json' }));
		link.download = nome;
		link.click();
		setTimeout(() => URL.revokeObjectURL(link.href), 1000);
	}

	// As fotos ficam no Storage, que só apaga pela API: saem antes das contas.
	async function apagarFotos(caminhos: string[]) {
		if (!caminhos.length) return true;
		const { error } = await supabase.storage.from('fotos').remove(caminhos);
		return error ? falhar(error) : true;
	}

	async function apagarPessoa(pessoa: string, nome: string) {
		erro = mensagem = '';
		const foto = (await supabase.from('pessoa').select('foto_path').eq('id', pessoa).maybeSingle()).data?.foto_path;
		if (!(await apagarFotos(foto ? [foto] : []))) return;
		const { error } = await supabase.rpc('apagar_pessoa', { p_pessoa: pessoa });
		if (error) return falhar(error);
		mensagem = `A conta de ${nome} foi apagada.`;
		await invalidate('app:dados');
	}

	async function apagarEvento(evento: SubmitEvent) {
		evento.preventDefault();
		erro = mensagem = '';
		let fotos: string[];
		try {
			fotos = await todasAsLinhas((de, ate) => supabase.rpc('fotos_do_evento', { p_evento: data.evento }).range(de, ate));
		} catch (e) {
			return falhar(e as { message: string });
		}
		for (let i = 0; i < fotos.length; i += 500) if (!(await apagarFotos(fotos.slice(i, i + 500)))) return;
		const { data: contas, error } = await supabase.rpc('apagar_dados_pessoais', { p_evento: data.evento });
		if (error) return falhar(error);
		mensagem = `Dados pessoais apagados: ${contas} contas. Ficaram os documentos públicos e os certificados.`;
		confirmacao = '';
		modalApagar?.fechar();
		await invalidate('app:dados');
	}

	async function baixarArquivo() {
		erro = '';
		const { data: arquivo, error } = await supabase.rpc('arquivo_publico', { p_evento: data.evento });
		if (error) return falhar(error);
		baixar(`arquivo-${data.nomeEvento.replace(/\s+/g, '-')}.json`, arquivo);
	}

	async function copiar(evento: SubmitEvent) {
		evento.preventDefault();
		erro = mensagem = '';
		const { error } = await supabase.rpc('copiar_evento', { p_origem: data.evento, p_nome: novoNome, p_ano: novoAno });
		if (error) return falhar(error);
		mensagem = `Evento ${novoNome} ${novoAno} criado com os comitês, as regras, as delegações e os veículos.`;
		modalProxima?.fechar();
	}
	// Passo 51 (lote da secretaria): as duas ações raras e longas abrem num modal.
	let modalProxima = $state<AcaoEmModal>();
	let modalApagar = $state<AcaoEmModal>();

	const resumo = $derived(
		[...new Set(data.pesquisa.map((r) => r.papel))].map((papel) => {
			const respostas = data.pesquisa.filter((r) => r.papel === papel);
			return { papel, n: respostas.length, media: respostas.reduce((s, r) => s + r.nota, 0) / respostas.length };
		})
	);
</script>

<svelte:head>
	<title>{tituloDaAba('Dados e arquivo', 'Secretaria')}</title>
</svelte:head>

<p class="rotulo">Secretaria · {data.nomeEvento}</p>
<h1>Dados e arquivo</h1>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

<div class="cartoes">
	<section class="cartao" aria-labelledby="t-pedidos">
		<h2 id="t-pedidos">Pedidos de exclusão</h2>
		<ul class="lista">
			{#each data.pedidos as p (p.id)}
				<li>
					<span>{p.nome} <span class="detalhe">pedido em {new Date(p.criado_em).toLocaleDateString('pt-BR')}</span></span>
					{#if p.pessoa_id}
						<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => apagarPessoa(p.pessoa_id!, p.nome)}
							{@attach dica(t('Apaga a conta e os dados pessoais de quem pediu a exclusão.'))}
							>Apagar a conta de {p.nome}</button
						>
					{/if}
				</li>
			{:else}
				<li class="suave">Nenhum pedido. Quem pede a exclusão no Perfil aparece aqui.</li>
			{/each}
		</ul>
	</section>

	<section class="cartao" aria-labelledby="t-arquivo">
		<h2 id="t-arquivo">Arquivo da edição</h2>
		<p>Os documentos públicos para a organização: agenda aprovada, resoluções, atualizações de crise e notícias, com as regras de cada comitê.</p>
		<p class="acoes">
			<a class="botao" href="/imprimir/arquivo" {@attach dica(t('Abre o arquivo da edição para imprimir ou salvar em PDF.'))}>Imprimir o arquivo (PDF)</a>
			<button class="botao botao--secundario" type="button" onclick={baixarArquivo} {@attach dica(t('Salva os documentos públicos da edição num arquivo JSON.'))}>Baixar os dados públicos (JSON)</button>
		</p>
	</section>

	<section class="cartao" aria-labelledby="t-pesquisa">
		<h2 id="t-pesquisa">Pesquisa de satisfação</h2>
		<ul class="lista">
			{#each resumo as r (r.papel)}
				<li><span>{rotuloPapel(r.papel)}: {r.n} respostas, nota média {r.media.toFixed(1)}</span></li>
			{:else}
				<li class="suave">Nenhuma resposta ainda. A pesquisa aparece no Perfil de cada pessoa.</li>
			{/each}
		</ul>
		{#if data.pesquisa.length}
			<button class="botao botao--secundario" type="button" onclick={() => baixar('pesquisa.json', data.pesquisa)} {@attach dica(t('Salva as respostas da pesquisa num arquivo JSON.'))}>Baixar as respostas</button>
		{/if}
	</section>

	<section class="cartao" aria-labelledby="t-fim">
		<h2 id="t-fim">Depois do evento</h2>
		<div class="acoes">
			<AcaoEmModal
				bind:this={modalProxima}
				secundario
				rotulo="Preparar a próxima edição"
				icone={CopyPlus}
				descricao="Cria um evento novo com os comitês, as regras, as delegações e os veículos deste. Ninguém é convidado."
			>
				<form class="formulario" onsubmit={copiar}>
					<label class="campo">
						Nome do evento novo
						<input required maxlength="120" bind:value={novoNome} {@attach contador(novoNome)} />
					</label>
					<label class="campo campo--curto">
						Ano
						<input type="number" required min="2020" max="2100" bind:value={novoAno} />
					</label>
					{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
					<button class="botao" {@attach dica(t('Cria o evento novo com o nome e o ano escritos acima.'))}>Copiar comitês, regras e delegações</button>

				</form>
			</AcaoEmModal>
			<AcaoEmModal
				bind:this={modalApagar}
				secundario
				rotulo="Apagar os dados pessoais"
				icone={Eraser}
				descricao="No prazo combinado com a organização: apaga as contas, os e-mails, as mensagens, as notas de crise e os rascunhos. Ficam os documentos públicos e os certificados. Não dá para desfazer. Antes, imprima e baixe o arquivo da edição."
			>
				<form class="formulario" onsubmit={apagarEvento}>
					<label class="campo">
						Para confirmar, escreva o nome do evento ({data.nomeEvento})
						<input autocomplete="off" bind:value={confirmacao} />
					</label>
					{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
					<button
						class="botao"
						{@attach dica(
							confirmacao.trim() !== data.nomeEvento ? t('Digite o nome do evento, exatamente como aparece, para confirmar.') : t('Apaga os dados pessoais do evento; não tem volta.'),
							confirmacao.trim() !== data.nomeEvento
						)}>Apagar os dados pessoais</button
					>
				</form>
			</AcaoEmModal>
		</div>
	</section>
</div>
