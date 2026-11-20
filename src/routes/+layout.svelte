<script lang="ts">
	import '@fontsource/source-serif-4/latin-600.css';
	import '../app.css';
	import { page } from '$app/state';
	import House from '@lucide/svelte/icons/house';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Cada passo adiciona aqui as telas que cria (a lista por função vem no passo 03).
	const itens = [{ href: '/', rotulo: 'Início', icone: House }];
</script>

<a class="pular" href="#conteudo">Pular para o conteúdo</a>

<div class="app">
	<header class="timbre">
		<a class="marca" href="/">
			<span class="marca-sigla">UFRGSMUN</span>
			<span class="marca-nome">Simulação das Nações Unidas</span>
		</a>
	</header>

	<nav class="navegacao" aria-label="Principal">
		<ul>
			{#each itens as item (item.href)}
				<li>
					<a href={item.href} aria-current={page.url.pathname === item.href ? 'page' : undefined}>
						<item.icone aria-hidden="true" size={20} strokeWidth={1.5} />
						<span>{item.rotulo}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<main id="conteudo">
		{@render children()}
	</main>
</div>
