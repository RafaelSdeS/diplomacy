<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { invalidate } from '$app/navigation';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import type { PageProps } from './$types';
	import { t } from '#lib/i18n.svelte.ts';
	import { dica } from '#lib/dica.ts';

	let { data }: PageProps = $props();
	let erro = $state('');
	let mensagem = $state('');

	async function emitir() {
		erro = mensagem = '';
		const { data: novos, error } = await supabase.rpc('emitir_certificados', { p_evento: data.evento });
		if (error) erro = mensagemDeErro(error);
		else mensagem = novos ? `${novos} certificados novos.` : 'Nenhum certificado novo: todos os presentes já têm o seu.';
		await invalidate('app:certificados');
	}
</script>

<svelte:head>
	<title>{tituloDaAba('Certificados', 'Secretaria')}</title>
</svelte:head>

<p class="rotulo">Secretaria</p>
<h1>Certificados</h1>
<p class="suave">
	Cada pessoa com check-in em algum dia recebe um certificado, com a função de cada convite e um código para conferir
	em /verificar. Emitir de novo só cria os que faltam.
</p>
<p>{data.presentes} pessoas com check-in · {data.certificados} certificados emitidos.</p>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

<p class="acoes">
	<button class="botao" type="button" onclick={emitir} {@attach dica(t('Cria o certificado de quem fez check-in e ainda não tem o seu.'))}>Emitir certificados</button>
	{#if data.certificados}<a class="botao botao--secundario" href="/imprimir/certificados" {@attach dica(t('Abre os certificados emitidos para imprimir ou salvar em PDF.'))}>
Imprimir os certificados</a>{/if}
</p>
