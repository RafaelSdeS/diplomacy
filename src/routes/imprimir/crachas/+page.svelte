<script lang="ts">
	import { APP, marca } from '#lib/titulo.svelte.ts';
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import qrcode from 'qrcode-generator';
	import { rotuloPapel } from '#lib/papeis.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import BotaoImprimir from '#lib/ui/BotaoImprimir.svelte';
	import { dica } from '#lib/dica.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Os códigos só existem na emissão: imprima logo. Emitir de novo invalida os
	// crachás anteriores das mesmas pessoas.
	let comite = $state('');
	let crachas = $state<{ email: string; nome: string; link: string; qr: string }[]>([]);
	let erro = $state('');
	let emitindo = $state(false);

	const doComite = $derived(
		data.convites.filter((c) => !comite || c.comite_id === comite).map((c) => c.email.toLowerCase())
	);

	// Em lotes de 500: a API devolve no máximo 1000 linhas por chamada, e um código que
	// não volta não pode ser impresso.
	async function emitir() {
		emitindo = true;
		erro = '';
		const emails = [...new Set(doComite)];
		const emitidos: { email: string; nome: string; codigo: string }[] = [];
		for (let i = 0; i < emails.length; i += 500) {
			const { data: lote, error } = await supabase.rpc('emitir_crachas', { p_evento: data.evento, p_emails: emails.slice(i, i + 500) });
			if (error) {
				emitindo = false;
				return (erro = mensagemDeErro(error));
			}
			emitidos.push(...lote);
		}
		emitindo = false;
		crachas = emitidos.map((c) => {
			const link = `${location.origin}/entrar/cracha#${c.codigo}`;
			const qr = qrcode(0, 'M');
			qr.addData(link);
			qr.make();
			return { email: c.email, nome: c.nome, link, qr: qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true }) };
		});
	}

	const papeisDe = (email: string) => data.convites.filter((c) => c.email.toLowerCase() === email);
</script>

<svelte:head>
	<title>{tituloDaAba('Crachás')}</title>
</svelte:head>

<div class="impressao">
	{#if crachas.length}
		<BotaoImprimir voltar="/secretaria/participantes" />
		<h1 class="nao-imprimir">{crachas.length} crachás</h1>
		<div class="folha-crachas">
			{#each crachas as c (c.email)}
				{@const papeis = papeisDe(c.email)}
				<article class="cracha" aria-label={`Crachá de ${c.nome}`}>
					<p class="rotulo">{marca.evento ?? APP}</p>
					<p class="cracha-nome">{c.nome}</p>
					{#each papeis as p, i (i)}
						<p class="com-bandeira">
							{#if p.delegacao}<Bandeira codigo={p.delegacao.bandeira} />{p.delegacao.nome} ·{:else}{rotuloPapel(p.papel)} ·{/if}
							{p.comite?.sigla ?? 'Secretaria'}
						</p>
					{/each}
					<figure class="cracha-qr" data-link={c.link}>
						{@html c.qr}
						<figcaption>Leia para entrar no app</figcaption>
					</figure>
				</article>
			{/each}
		</div>
	{:else}
		<div class="formulario nao-imprimir">
			<p class="rotulo">Secretaria</p>
			<h1>Crachás</h1>
			<p class="suave">
				Cada crachá tem um QR que entra no app. Os códigos só aparecem agora: imprima logo. Emitir de novo invalida os
				crachás anteriores das mesmas pessoas (para quem perdeu um só, use o código da secretaria).
			</p>
			<label class="campo">
				Comitê
				<select bind:value={comite}>
					<option value="">Todos ({new Set(data.convites.map((c) => c.email.toLowerCase())).size} pessoas)</option>
					{#each data.comites as c (c.id)}<option value={c.id}>{c.sigla}</option>{/each}
				</select>
			</label>
			{#if erro}
				<p class="erro" role="alert">{erro}</p>
			{/if}
			<button class="botao" type="button" disabled={emitindo} onclick={emitir} {@attach dica(t('Gera um código novo para cada pessoa e monta os crachás com QR para imprimir.'))}>Emitir e montar os crachás</button>
			<p><a href="/secretaria/participantes">Voltar</a></p>
		</div>
	{/if}
</div>
