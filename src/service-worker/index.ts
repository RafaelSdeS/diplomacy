// Passo 15: o app abre sem internet. A interface de cada versão fica guardada no
// aparelho; os dados lidos da API (cronograma, sessão, pauta, perfis...) também, para
// mostrar a última versão conhecida quando a rede cai. Quem sai da conta apaga os dados.
import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self as sw } from '$app/service-worker';

const APP = `app-${version}`;
const DADOS = 'dados';
const ARQUIVOS = [...immutable, ...assets].map((a) => `/${a.path.replace(/^\//, '')}`).concat('/');

sw.addEventListener('install', (evento) => {
	evento.waitUntil(
		caches
			.open(APP)
			.then((cache) => cache.addAll(ARQUIVOS))
			.then(() => sw.skipWaiting())
	);
});

// A versão nova substitui a antiga: as interfaces de outras versões saem do aparelho.
sw.addEventListener('activate', (evento) => {
	evento.waitUntil(
		caches
			.keys()
			.then((nomes) => Promise.all(nomes.filter((n) => n !== APP && n !== DADOS).map((n) => caches.delete(n))))
			.then(() => sw.clients.claim())
	);
});

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
		// Arquivos da versão: do aparelho. Telas: da rede, ou o app guardado sem internet.
		if (ARQUIVOS.includes(url.pathname) && url.pathname !== '/') {
			evento.respondWith(caches.match(pedido).then((guardado) => guardado ?? fetch(pedido)));
		} else if (pedido.mode === 'navigate') {
			evento.respondWith(daRedeOuDoCache(pedido, APP, '/'));
		}
		return;
	}

	// Leituras da API do Supabase: da rede; sem rede, a última resposta guardada.
	if (url.pathname.startsWith('/rest/v1/')) evento.respondWith(daRedeOuDoCache(pedido, DADOS));
});
