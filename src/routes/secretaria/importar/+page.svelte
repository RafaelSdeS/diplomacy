<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { invalidateAll } from '$app/navigation';
	import { adivinharColunas, CAMPOS, lerCsv, montarConvites, type Campo, type Mapa } from '#lib/importar.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import type { PageProps } from './$types';
	import { t } from '#lib/i18n.svelte.ts';
	import { dica } from '#lib/dica.ts';

	let { data }: PageProps = $props();

	const ROTULOS: Record<Campo, string> = {
		nome: 'Nome',
		email: 'E-mail',
		papel: 'Papel (sem coluna: todos delegados)',
		comite: 'Comitê (sigla ou nome)',
		delegacao: 'Delegação'
	};

	let linhas = $state<string[][]>([]);
	let mapa = $state<Mapa | null>(null);
	let erro = $state('');
	let mensagem = $state('');
	let enviando = $state(false);

	const cabecalho = $derived(linhas[0] ?? []);
	const resultado = $derived(
		mapa ? montarConvites(linhas.slice(1), mapa, { ...data, existentes: data.existentes }) : null
	);

	async function abrir(evento: Event) {
		const arquivo = (evento.currentTarget as HTMLInputElement).files?.[0];
		erro = mensagem = '';
		if (!arquivo) return;
		linhas = lerCsv(await arquivo.text());
		mapa = linhas.length ? adivinharColunas(linhas[0]) : null;
		if (!linhas.length) erro = 'O arquivo está vazio.';
	}

	async function criar() {
		if (!resultado?.convites.length) return;
		enviando = true;
		erro = mensagem = '';
		// Em lotes de 100: um lote com erro não desfaz os anteriores, e a tela diz quantos foram.
		let criados = 0;
		for (let i = 0; i < resultado.convites.length; i += 100) {
			const { error } = await supabase.from('convite').insert(resultado.convites.slice(i, i + 100));
			if (error) {
				erro = `Parou depois de ${criados} convites: ${mensagemDeErro(error)}`;
				break;
			}
			criados += Math.min(100, resultado.convites.length - i);
		}
		enviando = false;
		if (!erro) mensagem = `${criados} convites criados.`;
		linhas = [];
		mapa = null;
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>{tituloDaAba('Importar inscrições', 'Secretaria')}</title>
</svelte:head>

<p class="rotulo">Secretaria</p>
<h1>Importar inscrições</h1>
<p class="suave">
	Exporte as respostas do Google Forms como CSV. Cada linha vira um convite: quem entrar com o crachá ou o código
	ganha o papel na hora. Os dados ficam só no projeto do evento.
</p>

<label class="campo">
	Arquivo CSV
	<input type="file" accept=".csv,text/csv" onchange={abrir} />
</label>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

{#if mapa && resultado}
	<section aria-labelledby="t-colunas">
		<h2 id="t-colunas">Colunas</h2>
		<div class="formulario formulario--largo">
			{#each CAMPOS as campo (campo)}
				<label class="campo">
					{ROTULOS[campo]}
					<select bind:value={mapa[campo]}>
						<option value={-1}>Nenhuma</option>
						{#each cabecalho as titulo, i (i)}<option value={i}>{titulo}</option>{/each}
					</select>
				</label>
			{/each}
		</div>
	</section>

	<section aria-labelledby="t-previa">
		<h2 id="t-previa">Prévia</h2>
		<p>{resultado.convites.length} convites prontos de {linhas.length - 1} linhas.</p>
		{#if resultado.convites.length}
			<div class="tabela-rolavel">
				<table>
					<thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Comitê</th><th>Delegação</th></tr></thead>
					<tbody>
						{#each resultado.convites.slice(0, 10) as c (c.email + c.papel + c.comite_id)}
							<tr>
								<td>{c.nome ?? ''}</td>
								<td>{c.email}</td>
								<td>{c.papel}</td>
								<td>{data.comites.find((x) => x.id === c.comite_id)?.sigla ?? ''}</td>
								<td>{data.delegacoes.find((x) => x.id === c.delegacao_id)?.nome ?? ''}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
		{#if resultado.problemas.length}
			<h3>Linhas com problema ({resultado.problemas.length}), que ficam de fora</h3>
			<ul class="lista" aria-label="Linhas com problema">
				{#each resultado.problemas as p (p.linha)}<li>Linha {p.linha}: {p.mensagem}</li>{/each}
			</ul>
		{/if}
		<button class="botao" type="button" disabled={enviando}
			onclick={criar}
			{@attach dica(
				resultado.convites.length ? t('Cria os convites da prévia; as linhas com problema ficam de fora.') : t('Nenhum convite válido na prévia: confira a planilha.'),
				!resultado.convites.length
			)}>

			Criar {resultado.convites.length} convites
		</button>
	</section>
{/if}
