<script lang="ts">
	// Passo 56: propor a agenda sem aprender uma sintaxe. Cada item é uma linha, com botões para
	// mudar o nível e a ordem. Teclado: Enter cria o próximo item, Tab desce de nível e
	// Shift+Tab sobe (quando não dá, o Tab segue o caminho normal, sem prender o foco).
	// "Colar uma lista" monta os itens de um texto já escrito, com a sintaxe antiga.
	import { flushSync } from 'svelte';
	import { t } from '#lib/i18n.svelte.ts';
	import { dica } from '#lib/dica.ts';
	import { inserir, mover, NIVEL_MAX, recuar, remover } from '#lib/itens.ts';
	import { lerEsboco, type ItemEsboco } from '#lib/votacao.ts';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import IndentDecrease from '@lucide/svelte/icons/indent-decrease';
	import IndentIncrease from '@lucide/svelte/icons/indent-increase';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';

	let { itens = $bindable() }: { itens: ItemEsboco[] } = $props();
	let lista = $state<HTMLOListElement>();
	let colar = $state('');

	// Na hora (flushSync), para a próxima tecla já cair no item novo.
	function focar(i: number) {
		flushSync();
		lista?.querySelectorAll('input')[i]?.focus();
	}
	const podeDescer = (i: number) => i > 0 && itens[i].nivel < NIVEL_MAX && itens[i].nivel <= itens[i - 1].nivel;

	function tecla(evento: KeyboardEvent, i: number) {
		if (evento.key === 'Enter') {
			evento.preventDefault();
			itens = inserir(itens, i);
			focar(i + 1);
		} else if (evento.key === 'Tab' && (evento.shiftKey ? itens[i].nivel > 0 : podeDescer(i))) {
			evento.preventDefault();
			itens = recuar(itens, i, evento.shiftKey ? -1 : 1);
		} else if (evento.key === 'Backspace' && !itens[i].texto && itens.length > 1) {
			evento.preventDefault();
			itens = remover(itens, i);
			focar(Math.max(0, i - 1));
		}
	}
	function novo(nivel: number) {
		itens = inserir(itens, itens.length - 1, nivel);
		focar(itens.length - 1);
	}
</script>

<ol class="editor-itens" bind:this={lista} aria-label={t('Itens da agenda')}>
	{#each itens as item, i (i)}
		<li class="editor-item" style:--nivel={item.nivel}>
			<input
				aria-label={t('Item {n}, nível {m}', { n: i + 1, m: item.nivel + 1 })}
				maxlength="300"
				bind:value={item.texto}
				onkeydown={(e) => tecla(e, i)}
			/>
			<span class="editor-item-acoes">
				<button class="botao botao--secundario botao--pequeno botao--icone" type="button" aria-label={t('Subir um nível: item {n}', { n: i + 1 })} disabled={item.nivel === 0} onclick={() => (itens = recuar(itens, i, -1))}
					{@attach dica(t('Tira o item de dentro do item de cima.'))}
					><IndentDecrease aria-hidden="true" size={16} strokeWidth={1.75} /></button
				>
				<button class="botao botao--secundario botao--pequeno botao--icone" type="button" aria-label={t('Descer um nível: item {n}', { n: i + 1 })} disabled={!podeDescer(i)} onclick={() => (itens = recuar(itens, i, 1))}
					{@attach dica(t('Põe o item dentro do item de cima, como subitem.'))}
					><IndentIncrease aria-hidden="true" size={16} strokeWidth={1.75} /></button
				>
				<button class="botao botao--secundario botao--pequeno botao--icone" type="button" aria-label={t('Para cima: item {n}', { n: i + 1 })} disabled={i === 0} onclick={() => (itens = mover(itens, i, -1))}
					{@attach dica(t('Troca o item de lugar com o de cima.'))}
					><ArrowUp aria-hidden="true" size={16} strokeWidth={1.75} /></button
				>
				<button class="botao botao--secundario botao--pequeno botao--icone" type="button" aria-label={t('Para baixo: item {n}', { n: i + 1 })} disabled={i === itens.length - 1} onclick={() => (itens = mover(itens, i, 1))}
					{@attach dica(t('Troca o item de lugar com o de baixo.'))}
					><ArrowDown aria-hidden="true" size={16} strokeWidth={1.75} /></button
				>
				<button class="botao botao--secundario botao--pequeno botao--icone" type="button" aria-label={t('Tirar: item {n}', { n: i + 1 })} disabled={itens.length === 1} onclick={() => (itens = remover(itens, i))}
					{@attach dica(t('Apaga este item da agenda proposta.'))}
					><X aria-hidden="true" size={16} strokeWidth={1.75} /></button
				>
			</span>
		</li>
	{/each}
</ol>
<div class="acoes">
	<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => novo(0)} {@attach dica(t('Acrescenta um item no fim, no primeiro nível.'))}><Plus aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Item')}</button>
	<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => novo((itens.at(-1)?.nivel ?? -1) + 1)}
		{@attach dica(t('Acrescenta um subitem dentro do último item.'))}
		><Plus aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Subitem')}</button
	>
</div>
<p class="suave">{t('Enter cria o próximo item; Tab põe o item dentro do de cima, e Shift+Tab o tira.')}</p>
<details class="colar-lista">
	<summary {@attach dica(t('Monta os itens a partir de um texto já escrito.'))}>{t('Colar uma lista')}</summary>
	<label class="campo">
		{t('Uma linha por item. Dois espaços (ou um traço) no começo põem o item dentro do anterior.')}
		<textarea rows="5" bind:value={colar}></textarea>
	</label>
	<button class="botao botao--secundario botao--pequeno" type="button" disabled={!colar.trim()} onclick={() => ((itens = lerEsboco(colar)), (colar = ''))}
		{@attach dica(t('Troca todos os itens acima pelos da lista colada.'))}

		>{t('Montar os itens')}</button
	>
</details>
