<script lang="ts">
	import '@fontsource/source-serif-4/latin-600.css';
	import '../app.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import House from '@lucide/svelte/icons/house';
	import Users from '@lucide/svelte/icons/users';
	import { supabase, type Papel } from '#lib/supabase.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// Cada passo adiciona aqui as telas que cria. Sem "papeis", todos veem.
	const telas: { href: string; rotulo: string; icone: typeof House; papeis?: Papel[] }[] = [
		{ href: '/', rotulo: 'Início', icone: House },
		{ href: '/secretaria/participantes', rotulo: 'Participantes', icone: Users, papeis: ['secretaria'] }
	];

	const papeis = $derived(new Set(data.participacoes.map((p) => p.papel)));
	const itens = $derived(telas.filter((t) => !t.papeis || t.papeis.some((p) => papeis.has(p))));
	const comMenu = $derived(data.participacoes.length > 0);

	async function sair() {
		await supabase.auth.signOut();
		await goto('/entrar', { invalidateAll: true });
	}
</script>

<a class="pular" href="#conteudo">Pular para o conteúdo</a>

<div class="app" class:app--sem-menu={!comMenu}>
	<header class="timbre">
		<a class="marca" href="/">
			<span class="marca-sigla">UFRGSMUN</span>
			<span class="marca-nome">Simulação das Nações Unidas</span>
		</a>
		{#if data.usuario}
			<div class="conta">
				<span class="conta-nome">{data.usuario.user_metadata?.nome ?? data.usuario.email}</span>
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={sair}>Sair</button>
			</div>
		{/if}
	</header>

	{#if comMenu}
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
	{/if}

	<main id="conteudo">
		{@render children()}
	</main>
</div>
