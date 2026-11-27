<script lang="ts">
	import { untrack } from 'svelte';
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
	import { alternarIdioma, alternarTema, aparencia, definirAparencia, saida, tema, temaAtual, TROCAR_IDIOMA } from '#lib/preferencias.svelte.ts';
	import { bureauPreside } from '#lib/sessao.ts';
	import Gavel from '@lucide/svelte/icons/gavel';
	import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
	import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';
	import { abrirIrPara, irPara } from '#lib/ir-para.svelte.ts';
	import { menu } from '#lib/menu.ts';
	import { caixa } from '#lib/caixa.ts';
	import { dica } from '#lib/dica.ts';
	import { ehCacheDeDados } from '#lib/cache-dados.ts';
	import { esquecerConta } from '#lib/conta.ts';
	import { esquecerRascunhos } from '#lib/rascunho.ts';
	import { desativarPush } from '#lib/push.ts';
	import { APP, marca, mensagensNovas } from '#lib/titulo.svelte.ts';
	import { lerLidas, naoLidas } from '#lib/nao-lidas.ts';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import { trilha } from '#lib/trilha.ts';
	import { anterior, antesDeNavegar, depoisDeNavegar } from '#lib/voltar.svelte.ts';
	import { abrirAnotacao, anotacao, ficha, previa } from '#lib/ficha.svelte.ts';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import { noComite, papelPrincipal, rotuloPapel } from '#lib/papeis.ts';
	import Modal from '#lib/ui/Modal.svelte';
	import CaixaDeSaida from '#lib/ui/CaixaDeSaida.svelte';
	import Trilha from '#lib/ui/Trilha.svelte';
	import { supabase, type Papel } from '#lib/supabase.ts';
	import { assinar, assinarAvisos, esquecerLeituras, recarregarAoVivo } from '#lib/tempo-real.ts';
	import type { LayoutProps } from './$types';
	import { capturarRolagens, restaurarRolagens } from '#lib/rolagem.ts';

	// Passo 51: no "Voltar", as colunas que rolam por dentro voltam à mesma posição.
	export const snapshot = { capture: capturarRolagens, restore: restaurarRolagens };

	let { data, children }: LayoutProps = $props();

	// O menu por tarefa (passo 43, #lib/menu.ts): no celular, 4 telas e "Mais"; no
	// notebook, todas na lateral.
	const principal = $derived(papelPrincipal(data.participacoes));
	const itens = $derived(menu(data.participacoes));
	const temMais = $derived(itens.some((i) => i.mais));
	// Passo 43: quem a pessoa é no evento fica sempre à vista na faixa (país ou papel).
	// Passo 54: o papel no comitê primeiro, e os outros papéis depois ("Mesa · CSNU-T · Secretaria").
	const eu = $derived(noComite(data.participacoes) ?? data.participacoes.find((p) => p.papel === principal) ?? data.participacoes[0]);
	const outrosPapeis = $derived([...new Set(data.participacoes.map((p) => p.papel))].filter((p) => p !== eu?.papel).map(rotuloPapel));
	// As bandeiras (271 arquivos) ficam fora da primeira abertura: o componente vem sob demanda.
	const bandeira = import('#lib/ui/Bandeira.svelte');

	// Passo 66: quem preside a sessão do comitê da pessoa, no cabeçalho, ao vivo: para a delegação
	// que preside (o crachá dela ganha o martelo) e para as outras (ao lado, quem preside).
	type Presidencia = { pelaMesa: boolean; delegacao: { id: string; nome: string; bandeira: string | null } | null };
	let presidencia = $state<Presidencia | null>(null);
	async function lerPresidencia(comite: string) {
		const { data: e } = await supabase
			.from('estado_sessao')
			.select('fase, mesa_assumiu, sessao(presidencia:delegacao!sessao_presidencia_delegacao_id_comite_id_fkey(id, nome, bandeira))')
			.eq('comite_id', comite)
			.maybeSingle();
		const p = e?.sessao?.presidencia ?? null;
		presidencia = e?.sessao ? { pelaMesa: bureauPreside(e.fase, e.mesa_assumiu, p?.id), delegacao: p } : null;
	}
	// ponytail: ouve só a tabela sessao (abrir, fechar, o rodízio), não o estado_sessao, que muda a
	// cada fala e custaria uma leitura por mudança no celular (passo 40). A mesa assumir num caso
	// excepcional só muda o estado: o cabeçalho acompanha na próxima troca de tela (o quadro "Preside
	// a sessão" da Agora e da Sessão é ao vivo). Se isso pesar, o broadcast do estado pode levar a fase.
	$effect(() => {
		const comite = eu?.comite_id;
		presidencia = null;
		if (!comite) return;
		void lerPresidencia(comite);
		return assinar([`comite:${comite}`], ['sessao'], () => void lerPresidencia(comite));
	});
	afterNavigate(({ type }) => {
		if (type !== 'enter' && eu?.comite_id) void lerPresidencia(eu.comite_id);
	});
	const presido = $derived(!!presidencia && !presidencia.pelaMesa && eu?.papel === 'delegado' && presidencia.delegacao?.id === eu.delegacao_id);
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
	// O "Anotar" de qualquer tela (passo 51), também só na primeira vez.
	const anotar = $derived(anotacao.usada ? import('#lib/ui/Anotar.svelte') : null);
	// "Ir para…" (passo 43): Ctrl+K (ou ⌘K) em qualquer tela; carrega na primeira vez.
	const buscaIrPara = $derived(irPara.usado ? import('#lib/ui/IrPara.svelte') : null);
	function atalhoIrPara(evento: KeyboardEvent) {
		if (evento.key.toLowerCase() === 'k' && (evento.ctrlKey || evento.metaKey) && comMenu) {
			evento.preventDefault();
			abrirIrPara();
		}
		// Passo 54: "?" abre a página "Sobre", menos quando a pessoa digita.
		if (evento.key === '?' && !(evento.target as Element).closest('input, textarea, select, [contenteditable]')) void goto('/sobre');
	}
	// Passo 54: o clique longo no logo também abre o "Sobre" (e não leva à Agora).
	let segurando: ReturnType<typeof setTimeout> | undefined;
	let cliqueLongo = false;
	function segurarLogo() {
		cliqueLongo = false;
		segurando = setTimeout(() => {
			cliqueLongo = true;
			void goto('/sobre');
		}, 700);
	}
	// Passo 61: as mensagens que chegaram (bilhetes e a conversa com a mesa): a contagem no menu
	// e no título e, com o app aberto fora de Mensagens, um aviso por alguns segundos. O que já
	// foi lido fica no aparelho (#lib/nao-lidas.ts).
	const naConversa = $derived.by(() => {
		const p = noComite(data.participacoes);
		return p?.comite_id && (p.papel === 'delegado' || p.papel === 'mesa')
			? { comite: p.comite_id, sigla: p.comite_sigla, minha: p.papel === 'delegado' ? p.delegacao_id : null }
			: null;
	});
	type Chegada = { id: string; tipo: string; criado_em: string; de_delegacao_id: string | null; para_delegacao_id: string | null; de: { nome: string } | null };
	let chegadas = $state<Chegada[] | null>(null);
	let lidasVersao = $state(0);
	$effect(() => {
		const c = naConversa;
		chegadas = null;
		if (!c) return;
		const ler = async () => {
			const { data: d } = await supabase
				.from('mensagem')
				.select('id, tipo, criado_em, de_delegacao_id, para_delegacao_id, de:delegacao!mensagem_de_delegacao_id_comite_id_fkey(nome)')
				.eq('comite_id', c.comite)
				.in('tipo', ['bilhete', 'mesa'])
				.order('criado_em', { ascending: false })
				.limit(200);
			if (d) chegadas = d;
		};
		void ler();
		const cancelar = assinar(c.minha ? [`delegacao:${c.minha}`] : [`mesa:${c.comite}`], ['mensagem'], () => void ler());
		const aoLer = () => lidasVersao++;
		addEventListener('lidas', aoLer);
		return () => {
			cancelar();
			removeEventListener('lidas', aoLer);
		};
	});
	const novas = $derived.by(() => {
		void lidasVersao;
		const c = naConversa;
		return c && chegadas ? naoLidas(chegadas, c.minha, lerLidas(c.comite)) : [];
	});
	$effect(() => {
		mensagensNovas.n = novas.length;
	});
	let aviso = $state<{ texto: string; href: string } | null>(null);
	let avisadas: Set<string> | null = null;
	$effect(() => {
		const lista = novas;
		if (!chegadas) return;
		const nova = avisadas ? lista.find((m) => !avisadas!.has(m.id)) : undefined;
		avisadas = new Set([...(avisadas ?? []), ...lista.map((m) => m.id)]);
		if (!nova || !naConversa || untrack(() => page.url.pathname.endsWith('/mensagens'))) return;
		aviso = {
			texto:
				nova.tipo === 'bilhete'
					? t('Bilhete de {delegacao}', { delegacao: nova.de?.nome ?? '' })
					: nova.de_delegacao_id
						? t('Mensagem de {delegacao}', { delegacao: nova.de?.nome ?? '' })
						: t('Mensagem da mesa'),
			href: `/comite/${naConversa.sigla}/mensagens`
		};
		const fim = setTimeout(() => (aviso = null), 8000);
		return () => clearTimeout(fim);
	});
	const ehMensagens = (href: string) => href.endsWith('/mensagens');
	const mensagensEmMais = $derived(itens.some((i) => i.mais && ehMensagens(i.href)));

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
		[data.nome, eu?.papel === 'delegado' ? eu.delegacao_nome : eu && rotuloPapel(eu.papel), eu?.comite_sigla, ...outrosPapeis].filter(Boolean).join(' · ')
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

{#snippet contagemNovas()}
	<span class="contagem-menu">{mensagensNovas.n}<span class="so-leitor"> {mensagensNovas.n === 1 ? t('não lida') : t('não lidas')}</span></span>
{/snippet}

<svelte:window onkeydown={atalhoIrPara} />

{#if semMoldura}
	<main id="conteudo" class="main-sem-moldura">
		{@render children()}
	</main>
{:else}
	<a class="pular" href="#conteudo">{t('Pular para o conteúdo')}</a>

	<div class="app" class:app--sem-menu={!comMenu}>
		<header class="timbre">
			<a
				class="marca"
				href="/"
				onpointerdown={segurarLogo}
				onpointerup={() => clearTimeout(segurando)}
				onpointerleave={() => clearTimeout(segurando)}
				oncontextmenu={(e) => cliqueLongo && e.preventDefault()}
				onclick={(e) => cliqueLongo && e.preventDefault()}
			>
				<img class="marca-logo" src="/favicon.svg" alt="" width="32" height="32" />
				<span class="marca-texto">
					<span class="marca-sigla">{APP}</span>
					<span class="marca-nome">{marca.evento ?? t('Simulação das Nações Unidas')}</span>
				</span>
			</a>
			{#if data.usuario}
				<div class="conta">
					<!-- Passo 66: o país e o comitê vêm primeiro. -->
					{#if eu?.papel === 'delegado' && eu.delegacao_id}
						<a
							class={['identidade', presido && 'identidade--preside']}
							href={`/comite/${eu.comite_sigla}/delegacao/${eu.delegacao_id}`}
							aria-label={presido ? `${eu.delegacao_nome} · ${eu.comite_sigla} · ${t('preside a sessão')}` : `${eu.delegacao_nome} · ${eu.comite_sigla}`}
							title={data.nome ?? undefined}
						>
							{#await bandeira then { default: Bandeira }}<Bandeira codigo={eu.delegacao_bandeira} />{/await}
							<span class="identidade-nome">{eu.delegacao_nome}</span>
							<span class="identidade-comite">{eu.comite_sigla}</span>
							{#if presido}<span class="identidade-preside"><Gavel aria-hidden="true" size={14} strokeWidth={2} /> {t('preside')}</span>{/if}
						</a>
					{:else if eu}
						<span class="identidade" title={data.nome ?? undefined}>
							<span class="identidade-nome">{rotuloPapel(eu.papel)}</span>
							{#if eu.comite_sigla}<span class="identidade-comite">{eu.comite_sigla}</span>{/if}
							{#each outrosPapeis as outro (outro)}<span class="identidade-comite">{outro}</span>{/each}
						</span>
					{/if}
					<!-- Passo 66: para as outras, quem preside a sessão agora. -->
					{#if presidencia && !presido}
						<span class="preside-agora" {@attach dica(t('Quem preside a sessão agora.'))}>
							<Gavel aria-hidden="true" size={14} strokeWidth={2} />
							<span class="so-largo">{t('Preside')}:</span>
							{#if presidencia.pelaMesa || !presidencia.delegacao}{t('Mesa')}{:else}{#await bandeira then { default: Bandeira }}<Bandeira codigo={presidencia.delegacao.bandeira} />{/await}
								<span class="so-largo">{presidencia.delegacao.nome}</span>{/if}
						</span>
					{/if}
					{#if comMenu}
						<button
							class="botao botao--secundario botao--pequeno botao--icone ir-para-botao"
							type="button"
							aria-label={t('Ir para…')}
							aria-keyshortcuts="Control+K Meta+K"
							onclick={abrirIrPara}
							{@attach dica(t('Digite o nome de uma tela, comitê ou delegação para ir direto a ela.'))}
						>
							<Search aria-hidden="true" size={16} strokeWidth={1.75} />
						</button>
						<a
							class="botao botao--secundario botao--pequeno botao--icone"
							href="/avisos"
							aria-label={t('Avisos')}
							aria-current={page.url.pathname === '/avisos' ? 'page' : undefined}
							{@attach dica(t('Os avisos da organização e da mesa para você.'))}
						>
							<Bell aria-hidden="true" size={16} strokeWidth={1.75} />
						</a>
						{#if data.participacoes.some((p) => p.papel === 'delegado' || p.papel === 'mesa')}
							<button
								class="botao botao--secundario botao--pequeno botao--icone"
								type="button"
								aria-label={t('Caderno')}
								onclick={() => abrirAnotacao()}
								{@attach dica(t('Abre suas anotações para escrever ou consultar, sem sair desta tela.'))}
							>
								<NotebookPen aria-hidden="true" size={16} strokeWidth={1.75} />
							</button>
						{/if}
					{/if}
					{#if !online}<span class="selo selo--alerta">{t('Sem conexão')}</span>{/if}
					<CaixaDeSaida {pendentes} />
					<!-- Passo 47: no celular, tema, idioma, Perfil e Sair ficam em "Mais" (.so-largo). -->
					<button
						class={['botao botao--secundario botao--pequeno botao--icone', temMais && 'so-largo']}
						type="button"
						aria-label={escuro ? t('Usar o tema claro') : t('Usar o tema escuro')}
						onclick={alternarTema}
						{@attach dica(t('Troca as cores da tela entre claro e escuro.'))}
					>
						{#if escuro}<Sun aria-hidden="true" size={16} strokeWidth={1.75} />{:else}<Moon aria-hidden="true" size={16} strokeWidth={1.75} />{/if}
					</button>
					<button
						class={['botao botao--secundario botao--pequeno', temMais && 'so-largo']}
						type="button"
						aria-label={idioma.atual === 'en' ? `EN · ${TROCAR_IDIOMA.pt}` : `PT · ${TROCAR_IDIOMA.en}`}
						onclick={() => data.usuario && alternarIdioma(data.usuario.id)}
						{@attach dica(t('Muda o idioma do app entre português e inglês.'))}
					>
						<Languages aria-hidden="true" size={16} strokeWidth={1.75} />
						{idioma.atual === 'en' ? 'EN' : 'PT'}
					</button>
					{#if comMenu}
						<a
							class="botao botao--secundario botao--pequeno botao--icone"
							href="/perfil"
							aria-label={t('Perfil')}
							aria-current={page.url.pathname === '/perfil' ? 'page' : undefined}
							{@attach dica(t('Seus dados, seus papéis no evento e suas preferências.'))}
							><CircleUser aria-hidden="true" size={16} strokeWidth={1.75} /></a
						>
					{/if}
					<!-- Passo 51: Sair só com o ícone, também no celular (a confirmação evita sair sem querer). -->
					<button
						class="botao botao--secundario botao--pequeno botao--icone"
						type="button"
						aria-label={t('Sair')}
						{@attach dica(t('Sai da sua conta neste aparelho; antes, pede para confirmar.'))}
						onclick={pedirSaida}><LogOut aria-hidden="true" size={16} strokeWidth={1.75} /></button
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
								<button
									class="botao"
									type="button"
									disabled={enviandoAntes}
									onclick={enviarESair}
									{@attach dica(t('Manda os itens guardados agora e, depois, sai da conta.'))}
								>
									{enviandoAntes ? t('Enviando…') : t('Enviar agora')}
								</button>
								<button class="botao botao--secundario" onclick={() => void sair()} {@attach dica(t('Sai sem enviar: os itens guardados neste aparelho se perdem.'))}
									>{t('Sair mesmo assim')}</button
								>
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
								{#if ehMensagens(item.href) && mensagensNovas.n}{@render contagemNovas()}{/if}
							</a>
						</li>
					{/each}
					{#if temMais}
						<li class="item-mais">
							<a href="/mais" aria-current={maisMarcado}>
								<Ellipsis aria-hidden="true" size={20} strokeWidth={1.5} />
								<span>{t('Mais')}</span>
								{#if mensagensEmMais && mensagensNovas.n}{@render contagemNovas()}{/if}
							</a>
						</li>
					{/if}
					<!-- Passo 66: no notebook, o menu se recolhe e abre ao passar o mouse (ou no foco do teclado). -->
					<li class="item-recolher">
						<button type="button" aria-pressed={!!aparencia.menu} onclick={() => definirAparencia('menu', aparencia.menu ? '' : 'recolhido')}>
							{#if aparencia.menu}<PanelLeftOpen aria-hidden="true" size={20} strokeWidth={1.5} />{:else}<PanelLeftClose aria-hidden="true" size={20} strokeWidth={1.5} />{/if}
							<span>{aparencia.menu ? t('Fixar o menu') : t('Recolher o menu')}</span>
						</button>
					</li>
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
	{#if aviso}
		<div class="aviso-chegou" role="status">
			<MessageSquare aria-hidden="true" size={18} strokeWidth={1.75} />
			<span>{aviso.texto}</span>
			<a class="botao botao--pequeno" href={aviso.href} onclick={() => (aviso = null)} {@attach dica(t('Vai para a conversa onde a mensagem chegou.'))}>{t('Abrir')}</a>
		</div>
	{/if}
	{#if fichaDelegacao}{#await fichaDelegacao then { default: Ficha }}<Ficha participacoes={data.participacoes} />{/await}{/if}
	{#if previaDocumento}{#await previaDocumento then { default: Previa }}<Previa />{/await}{/if}
	{#if anotar}{#await anotar then { default: Anotar }}<Anotar participacoes={data.participacoes} />{/await}{/if}
	{#if buscaIrPara}{#await buscaIrPara then { default: IrPara }}<IrPara participacoes={data.participacoes} />{/await}{/if}
{/if}
