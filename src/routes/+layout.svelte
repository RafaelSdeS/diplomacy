<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import '@fontsource/spectral/latin-600.css';
	import '../app.css';
	import { afterNavigate, beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Search from '@lucide/svelte/icons/search';
	import Bell from '@lucide/svelte/icons/bell';
	import CircleUser from '@lucide/svelte/icons/circle-user';
	import Languages from '@lucide/svelte/icons/languages';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import { idioma } from '#lib/i18n.svelte.ts';
	import { alternarIdioma, alternarTema, saida, tema, temaAtual, TROCAR_IDIOMA } from '#lib/preferencias.svelte.ts';
	import { abrirIrPara, irPara } from '#lib/ir-para.svelte.ts';
	import { menu } from '#lib/menu.ts';
	import { caixa } from '#lib/caixa.ts';
	import { ehCacheDeDados } from '#lib/cache-dados.ts';
	import { esquecerConta } from '#lib/conta.ts';
	import { esquecerRascunhos } from '#lib/rascunho.ts';
	import { desativarPush } from '#lib/push.ts';
	import { APP, marca } from '#lib/titulo.svelte.ts';
	import { trilha } from '#lib/trilha.ts';
	import { anterior, antesDeNavegar, depoisDeNavegar } from '#lib/voltar.svelte.ts';
	import { ficha, previa } from '#lib/ficha.svelte.ts';
	import { papelPrincipal, rotuloPapel } from '#lib/papeis.ts';
	import Modal from '#lib/ui/Modal.svelte';
	import CaixaDeSaida from '#lib/ui/CaixaDeSaida.svelte';
	import Trilha from '#lib/ui/Trilha.svelte';
	import { supabase, type Papel } from '#lib/supabase.ts';
	import { assinarAvisos, esquecerLeituras, recarregarAoVivo } from '#lib/tempo-real.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// O menu por tarefa (passo 43, #lib/menu.ts): no celular, 4 telas e "Mais"; no
	// notebook, todas na lateral.
	const principal = $derived(papelPrincipal(data.participacoes));
	const itens = $derived(menu(data.participacoes));
	const temMais = $derived(itens.some((i) => i.mais));
	// Passo 43: quem a pessoa é no evento fica sempre à vista na faixa (país ou papel).
	const eu = $derived(data.participacoes.find((p) => p.papel === principal) ?? data.participacoes[0]);
	// As bandeiras (271 arquivos) ficam fora da primeira abertura: o componente vem sob demanda.
	const bandeira = import('#lib/ui/Bandeira.svelte');
	const comMenu = $derived(data.participacoes.length > 0);
	// O telão e as páginas de impressão ocupam a tela inteira, sem cabeçalho nem menu.
	const semMoldura = $derived(/^\/(telao|imprimir)\//.test(page.url.pathname));
	// O item do menu mais específico que contém a tela atual: "page" se é a própria
	// tela; "true" numa subtela (as regras do comitê ficam sob "Comitê").
	// Uma tela pode abranger outra pasta: o Painel da mesa abrange as telas da sessão.
	const dentro = (caminho: string, h: string) => caminho === h || (h !== '/' && caminho.startsWith(`${h}/`));
	const marcado = $derived(
		itens
			.flatMap((i) => [i.href, ...(i.abrange ? [i.abrange] : [])].filter((h) => dentro(page.url.pathname, h)).map((h) => ({ href: i.href, h })))
			.sort((a, b) => b.h.length - a.h.length)[0]?.href
	);
	// No celular, a tela atual que está em "Mais" marca o próprio "Mais".
	const maisMarcado = $derived(
		page.url.pathname === '/mais' ? 'page' : itens.some((i) => i.mais && i.href === marcado) ? 'true' : undefined
	);
	// Passo 43: na trilha, a mesa volta ao Painel (não à tela do delegado).
	const siglaDaTela = $derived(page.params.sigla ?? (page.data as { comite?: { sigla: string } }).comite?.sigla);
	const mesaDaTela = $derived(
		data.participacoes.some((p) => p.papel === 'secretaria' || (p.papel === 'mesa' && p.comite_sigla === siglaDaTela))
	);
	const elos = $derived(trilha(page.route.id, page.params, page.data, mesaDaTela));
	// "Voltar" leva à tela de onde a pessoa veio (passo 43).
	beforeNavigate(antesDeNavegar);
	afterNavigate(depoisDeNavegar);
	const volta = $derived(anterior());
	// A ficha da delegação (e as bandeiras dela) só carrega na primeira vez que alguém a abre.
	const fichaDelegacao = $derived(ficha.usada ? import('#lib/ui/FichaDelegacao.svelte') : null);
	// A prévia de documento (passo 47), também só na primeira vez.
	const previaDocumento = $derived(previa.usada ? import('#lib/ui/Previa.svelte') : null);
	// "Ir para…" (passo 43): Ctrl+K (ou ⌘K) em qualquer tela; carrega na primeira vez.
	const buscaIrPara = $derived(irPara.usado ? import('#lib/ui/IrPara.svelte') : null);
	function atalhoIrPara(evento: KeyboardEvent) {
		if (evento.key.toLowerCase() === 'k' && (evento.ctrlKey || evento.metaKey) && comMenu) {
			evento.preventDefault();
			abrirIrPara();
		}
	}
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

	// Passo 44: o aparelho pode ser de outra pessoa. Quem sai leva tudo o que a conta
	// deixou nele: dados lidos (todos os caches dados-*), notificações, caixa de saída e
	// rascunhos.
	async function limparAparelho() {
		const nomes = await caches?.keys().catch(() => []);
		await Promise.all((nomes ?? []).filter(ehCacheDeDados).map((n) => caches.delete(n)));
		await desativarPush().catch(() => {});
		await caixa.limpar().catch(() => {});
		esquecerRascunhos();
		esquecerConta();
		esquecerLeituras();
	}

	let saindo = false;
	async function sair() {
		saindo = true;
		await limparAparelho();
		await supabase.auth.signOut();
		await goto('/entrar', { invalidateAll: true });
		saindo = false;
	}

	// Passo 47: sair sempre pergunta antes, dizendo de que conta e o que sai do aparelho. Com itens
	// na caixa de saída, avisa que eles se perderiam e oferece enviar antes (passo 44).
	let avisoSaida = $state<Modal>();
	const quemSai = $derived(
		[data.nome, eu?.papel === 'delegado' ? eu.delegacao_nome : eu && rotuloPapel(eu.papel), eu?.comite_sigla].filter(Boolean).join(' · ')
	);
	let enviandoAntes = $state(false);
	let semRedeAoSair = $state(false);
	// Passo 47: o "Sair" do "Mais" (celular) pede a mesma confirmação do cabeçalho.
	$effect(() => {
		if (saida.pedida) void pedirSaida();
	});
	// O ícone do tema mostra para onde ele vai (a lua leva ao escuro).
	const escuro = $derived(tema.escolhido ? tema.escolhido === 'dark' : typeof matchMedia !== 'undefined' && temaAtual() === 'dark');
	async function pedirSaida() {
		pendentes = (await caixa.pendentes()).length;
		semRedeAoSair = false;
		avisoSaida?.abrir();
	}
	async function enviarESair() {
		enviandoAntes = true;
		await caixa.reenviar().catch(() => {});
		pendentes = (await caixa.pendentes()).length;
		enviandoAntes = false;
		if (pendentes) semRedeAoSair = true;
		else {
			avisoSaida?.fechar();
			await sair();
		}
	}

	// Sair numa aba (ou perder o acesso) leva as outras abas ao login, sem mostrar mais
	// nada da conta.
	$effect(() => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((evento) => {
			if (evento !== 'SIGNED_OUT' || saindo) return;
			// Fora do callback: chamar o Supabase dentro dele trava o cliente.
			setTimeout(async () => {
				await limparAparelho();
				await goto('/entrar', { invalidateAll: true });
			});
		});
		return () => subscription.unsubscribe();
	});
</script>

<svelte:window onkeydown={atalhoIrPara} />

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
					{#if comMenu}
						<button
							class="botao botao--secundario botao--pequeno botao--icone ir-para-botao"
							type="button"
							aria-label={t('Ir para…')}
							aria-keyshortcuts="Control+K Meta+K"
							title={t('Ir para… (Ctrl+K)')}
							onclick={abrirIrPara}
						>
							<Search aria-hidden="true" size={16} strokeWidth={1.75} />
						</button>
						<a
							class="botao botao--secundario botao--pequeno botao--icone"
							href="/avisos"
							aria-label={t('Avisos')}
							title={t('Avisos')}
							aria-current={page.url.pathname === '/avisos' ? 'page' : undefined}
						>
							<Bell aria-hidden="true" size={16} strokeWidth={1.75} />
						</a>
					{/if}
					{#if !online}<span class="selo selo--alerta">{t('Sem conexão')}</span>{/if}
					<CaixaDeSaida {pendentes} />
					{#if eu?.papel === 'delegado' && eu.delegacao_id}
						<a
							class="identidade"
							href={`/comite/${eu.comite_sigla}/delegacao/${eu.delegacao_id}`}
							aria-label={`${eu.delegacao_nome} · ${eu.comite_sigla}`}
							title={data.nome ?? undefined}
						>
							{#await bandeira then { default: Bandeira }}<Bandeira codigo={eu.delegacao_bandeira} />{/await}
							<span class="identidade-nome">{eu.delegacao_nome}</span>
							<span class="identidade-comite">{eu.comite_sigla}</span>
						</a>
					{:else if eu}
						<span class="identidade" title={data.nome ?? undefined}>
							<span class="identidade-nome">{rotuloPapel(eu.papel)}</span>
							{#if eu.comite_sigla}<span class="identidade-comite">{eu.comite_sigla}</span>{/if}
						</span>
					{/if}
					<!-- Passo 47: no celular, tema, idioma, Perfil e Sair ficam em "Mais" (.so-largo). -->
					<button
						class={['botao botao--secundario botao--pequeno botao--icone', temMais && 'so-largo']}
						type="button"
						aria-label={escuro ? t('Usar o tema claro') : t('Usar o tema escuro')}
						title={escuro ? t('Usar o tema claro') : t('Usar o tema escuro')}
						onclick={alternarTema}
					>
						{#if escuro}<Sun aria-hidden="true" size={16} strokeWidth={1.75} />{:else}<Moon aria-hidden="true" size={16} strokeWidth={1.75} />{/if}
					</button>
					<button
						class={['botao botao--secundario botao--pequeno', temMais && 'so-largo']}
						type="button"
						aria-label={idioma.atual === 'en' ? `EN · ${TROCAR_IDIOMA.pt}` : `PT · ${TROCAR_IDIOMA.en}`}
						title={idioma.atual === 'en' ? TROCAR_IDIOMA.pt : TROCAR_IDIOMA.en}
						onclick={() => data.usuario && alternarIdioma(data.usuario.id)}
					>
						<Languages aria-hidden="true" size={16} strokeWidth={1.75} />
						{idioma.atual === 'en' ? 'EN' : 'PT'}
					</button>
					{#if comMenu}
						<a
							class={['botao botao--secundario botao--pequeno', temMais && 'so-largo']}
							href="/perfil"
							aria-current={page.url.pathname === '/perfil' ? 'page' : undefined}
							><CircleUser aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Perfil')}</a
						>
					{/if}
					<!-- Sem "Mais" (sem acesso, ou até 5 telas), tudo fica no cabeçalho também no celular. -->
					<button class={['botao botao--secundario botao--pequeno', temMais && 'so-largo']} type="button" onclick={pedirSaida}
						><LogOut aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Sair')}</button
					>
					<Modal bind:this={avisoSaida} rotulo="aviso-saida-titulo">
						<h3 id="aviso-saida-titulo">{pendentes ? t('Itens não enviados: {n}', { n: pendentes }) : t('Sair da conta?')}</h3>
						{#if quemSai}<p class="suave">{quemSai}</p>{/if}
						<p>{t('Os dados desta sessão serão removidos deste aparelho.')}</p>
						{#if pendentes}
							<p>{t('Eles estão só neste aparelho. Se sair agora, eles se perdem.')}</p>
							{#if semRedeAoSair}
								<p class="erro" role="alert">{t('Ainda sem conexão: os itens continuam guardados.')}</p>
							{/if}
						{/if}
						<form method="dialog" class="acoes">
							{#if pendentes}
								<button class="botao" type="button" disabled={enviandoAntes} onclick={enviarESair}>
									{enviandoAntes ? t('Enviando…') : t('Enviar agora')}
								</button>
								<button class="botao botao--secundario" onclick={() => void sair()}>{t('Sair mesmo assim')}</button>
							{:else}
								<button class="botao" onclick={() => void sair()}>{t('Sair')}</button>
							{/if}
							<button class="botao botao--secundario">{t('Cancelar')}</button>
						</form>
					</Modal>
				</div>
			{/if}
		</header>

		{#if comMenu}
			<nav class="navegacao" aria-label={t('Principal')}>
				<ul>
					{#each itens as item (item.href)}
						<li class:item-de-mais={item.mais}>
							<a href={item.href} aria-current={atual(item.href)}>
								<item.icone aria-hidden="true" size={20} strokeWidth={1.5} />
								<span>{item.rotulo}</span>
							</a>
						</li>
					{/each}
					{#if temMais}
						<li class="item-mais">
							<a href="/mais" aria-current={maisMarcado}>
								<Ellipsis aria-hidden="true" size={20} strokeWidth={1.5} />
								<span>{t('Mais')}</span>
							</a>
						</li>
					{/if}
				</ul>
			</nav>
		{/if}

		<main id="conteudo">
			{#if volta || elos.length}
				<div class="caminho">
					{#if volta}
						<a
							class="voltar"
							href={volta.href}
							onclick={(e) => {
								e.preventDefault();
								history.back();
							}}>‹ {volta.titulo ? t('Voltar para {tela}', { tela: volta.titulo }) : t('Voltar')}</a
						>
					{/if}
					{#if elos.length}<Trilha {elos} />{/if}
				</div>
			{/if}
			{@render children()}
		</main>
	</div>
	{#if fichaDelegacao}{#await fichaDelegacao then { default: Ficha }}<Ficha participacoes={data.participacoes} />{/await}{/if}
	{#if previaDocumento}{#await previaDocumento then { default: Previa }}<Previa />{/await}{/if}
	{#if buscaIrPara}{#await buscaIrPara then { default: IrPara }}<IrPara participacoes={data.participacoes} />{/await}{/if}
{/if}
