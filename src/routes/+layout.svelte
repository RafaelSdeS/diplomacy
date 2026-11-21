<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import '@fontsource/spectral/latin-600.css';
	import '../app.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Gavel from '@lucide/svelte/icons/gavel';
	import Siren from '@lucide/svelte/icons/siren';
	import House from '@lucide/svelte/icons/house';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Newspaper from '@lucide/svelte/icons/newspaper';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import Users from '@lucide/svelte/icons/users';
	import { caixa } from '#lib/caixa.ts';
	import { esquecerConta } from '#lib/conta.ts';
	import { desativarPush } from '#lib/push.ts';
	import { APP, marca } from '#lib/titulo.svelte.ts';
	import { trilha } from '#lib/trilha.ts';
	import { papelPrincipal, rotuloPapel } from '#lib/papeis.ts';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import Trilha from '#lib/ui/Trilha.svelte';
	import { supabase, type Papel } from '#lib/supabase.ts';
	import { assinarAvisos, esquecerLeituras, recarregarAoVivo } from '#lib/tempo-real.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	type Tela = { href: string; rotulo: string; icone: typeof House; papeis?: Papel[] };

	const papeis = $derived(new Set(data.participacoes.map((p) => p.papel)));
	const sigla = $derived(data.participacoes.find((p) => p.comite_sigla)?.comite_sigla);
	const siglaCrise = $derived(data.participacoes.find((p) => p.papel === 'crise')?.comite_sigla);

	// Cada passo adiciona aqui as telas que cria. Sem "papeis", todos veem. O menu muda
	// com o papel principal (passo 32): a mesa tem o painel; a crise e a press, as suas
	// telas logo depois do Agora.
	const principal = $derived(papelPrincipal(data.participacoes));
	// Passo 43: quem a pessoa é no evento fica sempre à vista na faixa (país ou papel).
	const eu = $derived(data.participacoes.find((p) => p.papel === principal) ?? data.participacoes[0]);
	const telas: Tela[] = $derived([
		{ href: '/', rotulo: t('Agora'), icone: House },
		...(siglaCrise ? [{ href: `/crise/${siglaCrise}`, rotulo: t('Crise'), icone: Siren, papeis: ['crise' as const] }] : []),
		...(principal === 'press'
			? [
					{ href: '/press', rotulo: t('Press'), icone: Newspaper },
					{ href: '/press/escrever', rotulo: t('Escrever'), icone: PenLine }
				]
			: []),
		...(sigla
			? [
					principal === 'mesa'
						? { href: `/comite/${sigla}/sessao/presidencia`, rotulo: t('Painel'), icone: Gavel }
						: { href: `/comite/${sigla}/sessao`, rotulo: t('Sessão'), icone: Gavel },
					{ href: `/comite/${sigla}`, rotulo: t('Comitê'), icone: Landmark }
				]
			: []),
		...(principal === 'press' ? [] : [{ href: '/press', rotulo: t('Press'), icone: Newspaper }]),
		{ href: '/cronograma', rotulo: t('Cronograma'), icone: CalendarDays },
		{ href: '/avisos', rotulo: t('Avisos'), icone: Megaphone },
		{ href: '/secretaria/participantes', rotulo: t('Participantes'), icone: Users, papeis: ['secretaria'] }
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
	const elos = $derived(trilha(page.route.id, page.params, page.data));
	// O nome do evento da pessoa, para os títulos e o cabeçalho (passo 27).
	const nomeDoEvento = $derived(data.participacoes[0]?.evento_nome ?? null);
	$effect.pre(() => {
		marca.evento = nomeDoEvento;
	});
	const atual = (href: string) => (href !== marcado ? undefined : href === page.url.pathname ? 'page' : 'true');

	// Avisos chegam na hora para quem está no app.
	// Os efeitos dependem de textos e booleanos: o `data` novo de cada troca de tela não
	// pode reassinar os canais nem disparar recargas.
	const eventos = $derived(
		[...new Set(data.participacoes.map((p) => p.evento_id).filter((e) => e !== null))].sort().join(',')
	);
	const logado = $derived(!!data.usuario);
	$effect(() => {
		if (!logado || !eventos) return;
		return assinarAvisos(eventos.split(','), (tabela) => recarregarAoVivo('app:avisos', tabela ? [tabela] : null));
	});

	// Conexão e caixa de saída: reenvia ao voltar a rede, ao voltar o app para a frente
	// e ao abrir o app.
	let online = $state(true);
	let pendentes = $state(0);
	$effect(() => {
		if (!logado) return;
		const contar = async () => void (pendentes = (await caixa.pendentes()).length);
		const reenviar = () => {
			online = navigator.onLine;
			if (online) void caixa.reenviar();
		};
		const aoVoltar = () => document.visibilityState === 'visible' && reenviar();
		const parar = caixa.ouvir(() => void contar());
		addEventListener('online', reenviar);
		addEventListener('offline', reenviar);
		document.addEventListener('visibilitychange', aoVoltar);
		void contar();
		reenviar();
		return () => {
			parar();
			removeEventListener('online', reenviar);
			removeEventListener('offline', reenviar);
			document.removeEventListener('visibilitychange', aoVoltar);
		};
	});

	async function sair() {
		// Os dados lidos ficam no aparelho para abrir sem internet; quem sai leva os seus.
		await caches?.delete('dados').catch(() => {});
		// O aparelho pode ser de outra pessoa: as notificações desta conta param aqui.
		await desativarPush().catch(() => {});
		await supabase.auth.signOut();
		esquecerConta();
		esquecerLeituras();
		await goto('/entrar', { invalidateAll: true });
	}
</script>

{#if semMoldura}
	<main id="conteudo" class="main-sem-moldura">
		{@render children()}
	</main>
{:else}
	<a class="pular" href="#conteudo">{t('Pular para o conteúdo')}</a>

	<div class="app" class:app--sem-menu={!comMenu}>
		<header class="timbre">
			<a class="marca" href="/">
				<img class="marca-logo" src="/favicon.svg" alt="" width="32" height="32" />
				<span class="marca-texto">
					<span class="marca-sigla">{APP}</span>
					<span class="marca-nome">{marca.evento ?? t('Simulação das Nações Unidas')}</span>
				</span>
			</a>
			{#if data.usuario}
				<div class="conta">
					{#if !online}<span class="selo selo--alerta">{t('Sem conexão')}</span>{/if}
					{#if pendentes}<span class="selo selo--info" role="status">{t('{n} para enviar', { n: pendentes })}</span>{/if}
					{#if eu?.papel === 'delegado' && eu.delegacao_id}
						<a
							class="identidade"
							href={`/comite/${eu.comite_sigla}/delegacao/${eu.delegacao_id}`}
							aria-label={`${eu.delegacao_nome} · ${eu.comite_sigla}`}
							title={data.nome ?? undefined}
						>
							<Bandeira codigo={eu.delegacao_bandeira} />
							<span class="identidade-nome">{eu.delegacao_nome}</span>
							<span class="identidade-comite">{eu.comite_sigla}</span>
						</a>
					{:else if eu}
						<span class="identidade" title={data.nome ?? undefined}>
							<span class="identidade-nome">{rotuloPapel(eu.papel)}</span>
							{#if eu.comite_sigla}<span class="identidade-comite">{eu.comite_sigla}</span>{/if}
						</span>
					{/if}
					{#if comMenu}
						<a
							class="botao botao--secundario botao--pequeno"
							href="/perfil"
							aria-current={page.url.pathname === '/perfil' ? 'page' : undefined}>{t('Perfil')}</a
						>
					{/if}
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={sair}>{t('Sair')}</button>
				</div>
			{/if}
		</header>

		{#if comMenu}
			<nav class="navegacao" aria-label={t('Principal')}>
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
			{#if elos.length}<Trilha {elos} />{/if}
			{@render children()}
		</main>
	</div>
{/if}
