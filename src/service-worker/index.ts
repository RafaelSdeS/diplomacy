// Passo 15: o app abre sem internet. A interface de cada versão fica guardada no
// aparelho; os dados lidos da API (cronograma, sessão, pauta, perfis...) também, para
// mostrar a última versão conhecida quando a rede cai. Quem sai da conta apaga os dados.
import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self as sw } from '$app/service-worker';

// Passo 40: menos dados. Os arquivos com hash no nome nunca mudam de conteúdo, então
// ficam num cache que passa de uma versão para a outra: uma versão nova baixa só o que
// mudou. As 271 bandeiras (~640 KB) e as fontes .woff (o navegador com service worker usa
// a .woff2) não entram na instalação: vêm na primeira vez que aparecem.
const APP = `app-${version}`; // a página inicial e os arquivos de static/ desta versão
const IMUTAVEIS = 'imutaveis';
const DADOS = 'dados';
const caminho = (a: { path: string }) => `/${a.path.replace(/^\//, '')}`;
const COM_HASH = new Set(immutable.map(caminho));
// O _headers é configuração do Cloudflare, não um arquivo servido.
const ESTATICOS = new Set(assets.map(caminho).filter((c) => c !== '/_headers'));
const NA_INSTALACAO = [...COM_HASH].filter((c) => !/\.(svg|woff)$/.test(c));

sw.addEventListener('install', (evento) => {
	evento.waitUntil(
		(async () => {
			const [app, imutaveis] = await Promise.all([caches.open(APP), caches.open(IMUTAVEIS)]);
			const guardados = new Set((await imutaveis.keys()).map((p) => new URL(p.url).pathname));
			await Promise.all([
				imutaveis.addAll(NA_INSTALACAO.filter((c) => !guardados.has(c))),
				app.addAll([...ESTATICOS, '/'])
			]);
			await sw.skipWaiting();
		})()
	);
});

// A versão nova substitui a antiga: as interfaces de outras versões saem do aparelho, e
// do cache dos arquivos com hash sai o que a versão atual não usa mais.
sw.addEventListener('activate', (evento) => {
	evento.waitUntil(
		(async () => {
			const nomes = await caches.keys();
			await Promise.all(nomes.filter((n) => ![APP, IMUTAVEIS, DADOS].includes(n)).map((n) => caches.delete(n)));
			const imutaveis = await caches.open(IMUTAVEIS);
			for (const pedido of await imutaveis.keys()) if (!COM_HASH.has(new URL(pedido.url).pathname)) await imutaveis.delete(pedido);
			await sw.clients.claim();
		})()
	);
});

/** Do aparelho; se ainda não estiver lá, da rede, e fica guardado. */
async function doCacheOuDaRede(pedido: Request, cache: string) {
	const guardado = await caches.match(pedido);
	if (guardado) return guardado;
	const resposta = await fetch(pedido);
	if (resposta.ok) {
		const copia = resposta.clone();
		void caches.open(cache).then((c) => c.put(pedido, copia));
	}
	return resposta;
}

async function daRedeOuDoCache(pedido: Request, cache: string, chave: Request | string = pedido) {
	try {
		const resposta = await fetch(pedido);
		if (resposta.ok) {
			// A cópia sai antes de a tela ler a resposta (depois, o corpo já foi lido).
			const copia = resposta.clone();
			void caches.open(cache).then((c) => c.put(chave, copia));
		}
		return resposta;
	} catch (falha) {
		const guardada = await caches.match(chave);
		if (guardada) return guardada;
		throw falha;
	}
}

sw.addEventListener('fetch', (evento) => {
	const pedido = evento.request;
	if (pedido.method !== 'GET') return;
	const url = new URL(pedido.url);

	if (url.origin === sw.location.origin) {
		// Arquivos do app: do aparelho. Telas: da rede, ou o app guardado sem internet.
		if (COM_HASH.has(url.pathname)) {
			evento.respondWith(doCacheOuDaRede(pedido, IMUTAVEIS));
		} else if (ESTATICOS.has(url.pathname)) {
			evento.respondWith(doCacheOuDaRede(pedido, APP));
		} else if (pedido.mode === 'navigate') {
			evento.respondWith(daRedeOuDoCache(pedido, APP, '/'));
		}
		return;
	}

	// Leituras da API do Supabase: da rede; sem rede, a última resposta guardada.
	if (url.pathname.startsWith('/rest/v1/')) evento.respondWith(daRedeOuDoCache(pedido, DADOS));
});

// Notificações (bônus): o texto vem do banco, pela Edge Function enviar-push.
sw.addEventListener('push', (evento) => {
	let dados: { titulo?: string; corpo?: string; url?: string } = {};
	try {
		dados = evento.data?.json() ?? {};
	} catch {
		// mensagem sem JSON: mostra só o nome do app
	}
	evento.waitUntil(
		sw.registration.showNotification(dados.titulo ?? 'Diplomacy', {
			body: dados.corpo,
			icon: '/icone-192.png',
			data: { url: dados.url ?? '/' }
		})
	);
});

// Tocar na notificação abre a tela certa, numa janela do app que já esteja aberta.
sw.addEventListener('notificationclick', (evento) => {
	evento.notification.close();
	const url = new URL(evento.notification.data?.url ?? '/', sw.location.origin).href;
	evento.waitUntil(
		sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
			const aberta = janelas[0];
			return aberta ? aberta.navigate(url).then((j) => (j ?? aberta).focus()) : sw.clients.openWindow(url);
		})
	);
});
