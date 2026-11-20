<script lang="ts">
	import '@fontsource/source-serif-4/latin-600.css';
	import '../app.css';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import House from '@lucide/svelte/icons/house';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Users from '@lucide/svelte/icons/users';
	import { supabase, type Papel } from '#lib/supabase.ts';
	import { assinarAvisos } from '#lib/tempo-real.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	type Tela = { href: string; rotulo: string; icone: typeof House; papeis?: Papel[] };

	const papeis = $derived(new Set(data.participacoes.map((p) => p.papel)));
	const sigla = $derived(data.participacoes.find((p) => p.comite_sigla)?.comite_sigla);

	// Cada passo adiciona aqui as telas que cria. Sem "papeis", todos veem.
	const telas: Tela[] = $derived([
		{ href: '/', rotulo: 'Agora', icone: House },
		...(sigla ? [{ href: `/comite/${sigla}`, rotulo: 'Comitê', icone: Landmark }] : []),
		{ href: '/cronograma', rotulo: 'Cronograma', icone: CalendarDays },
		{ href: '/avisos', rotulo: 'Avisos', icone: Megaphone },
		{ href: '/secretaria/participantes', rotulo: 'Participantes', icone: Users, papeis: ['secretaria'] }
	]);
	const itens = $derived(telas.filter((t) => !t.papeis || t.papeis.some((p) => papeis.has(p))));
	const comMenu = $derived(data.participacoes.length > 0);
	// A própria tela é a "page"; numa subtela (as regras do comitê), o item do menu
	// continua marcado como o lugar em que a pessoa está.
	const atual = (href: string) =>
		page.url.pathname === href ? 'page' : href !== '/' && page.url.pathname.startsWith(`${href}/`) ? 'true' : undefined;

	// Avisos chegam na hora para quem está no app.
	$effect(() => {
		if (!data.usuario) return;
		return assinarAvisos(() => invalidate('app:avisos'));
	});

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
				<span class="conta-nome">{data.nome}</span>
				{#if comMenu}
					<a
						class="botao botao--secundario botao--pequeno"
						href="/perfil"
						aria-current={page.url.pathname === '/perfil' ? 'page' : undefined}>Perfil</a
					>
				{/if}
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={sair}>Sair</button>
			</div>
		{/if}
	</header>

	{#if comMenu}
		<nav class="navegacao" aria-label="Principal">
			<ul>
				{#each itens as item (item.href)}
					<li>
						<a href={item.href} aria-current={atual(item.href)}>
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
