<script lang="ts">
	import '@fontsource/source-serif-4/latin-600.css';
	import '../app.css';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Gavel from '@lucide/svelte/icons/gavel';
	import Siren from '@lucide/svelte/icons/siren';
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
	const siglaCrise = $derived(data.participacoes.find((p) => p.papel === 'crise')?.comite_sigla);

	// Cada passo adiciona aqui as telas que cria. Sem "papeis", todos veem.
	const telas: Tela[] = $derived([
		{ href: '/', rotulo: 'Agora', icone: House },
		...(sigla
			? [
					{ href: `/comite/${sigla}/sessao`, rotulo: 'Sessão', icone: Gavel },
					{ href: `/comite/${sigla}`, rotulo: 'Comitê', icone: Landmark }
				]
			: []),
		...(siglaCrise ? [{ href: `/crise/${siglaCrise}`, rotulo: 'Crise', icone: Siren, papeis: ['crise' as const] }] : []),
		{ href: '/cronograma', rotulo: 'Cronograma', icone: CalendarDays },
		{ href: '/avisos', rotulo: 'Avisos', icone: Megaphone },
		{ href: '/secretaria/participantes', rotulo: 'Participantes', icone: Users, papeis: ['secretaria'] }
	]);
	const itens = $derived(telas.filter((t) => !t.papeis || t.papeis.some((p) => papeis.has(p))));
	const comMenu = $derived(data.participacoes.length > 0);
	// O telão e as páginas de impressão ocupam a tela inteira, sem cabeçalho nem menu.
	const semMoldura = $derived(/^\/(telao|imprimir)\//.test(page.url.pathname));
	// O item do menu mais específico que contém a tela atual: "page" se é a própria
	// tela; "true" numa subtela (as regras do comitê ficam sob "Comitê").
	const marcado = $derived(
		itens
			.map((i) => i.href)
			.filter((h) => page.url.pathname === h || (h !== '/' && page.url.pathname.startsWith(`${h}/`)))
			.sort((a, b) => b.length - a.length)[0]
	);
	const atual = (href: string) => (href !== marcado ? undefined : href === page.url.pathname ? 'page' : 'true');

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

{#if semMoldura}
	<main id="conteudo" class="main-sem-moldura">
		{@render children()}
	</main>
{:else}
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
{/if}
