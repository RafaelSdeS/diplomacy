import { expect, test, type Browser, type Page } from '@playwright/test';
import { contaDoTreino, isolado } from '../scripts/delegacoes.ts';
import { clienteComo, entrar, irPeloMenu } from './ajuda.ts';

// Passo 39: a cópia do TREINO só deste arquivo (scripts/delegacoes.ts).
const C = isolado('15');

// Passo 15: o app abre sem internet, a caixa de saída não perde nem duplica nada, e o
// consumo de dados de uma sessão fica medido.

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'roda num projeto só');
});

const DELEGADO = C.conta(contaDoTreino('Paraguai'));
const CRISE = `/comite/${C.sigla}/crise`;

async function celular(browser: Browser, conta: string, serviceWorkers: 'allow' | 'block' = 'allow') {
	const contexto = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, serviceWorkers });
	const page = await contexto.newPage();
	await entrar(page, conta);
	return page;
}

/** Espera o service worker assumir a página. */
async function comServiceWorker(page: Page) {
	await page.evaluate(() => navigator.serviceWorker.ready);
	await page.reload();
	await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

test('depois do primeiro acesso, o app abre sem rede', async ({ browser }) => {
	const page = await celular(browser, DELEGADO);
	await comServiceWorker(page);
	await expect(page.getByRole('heading', { level: 1, name: 'Agora' })).toBeVisible();
	await page.goto('/cronograma');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

	await page.context().setOffline(true);
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1, name: 'Agora' })).toBeVisible();
	await expect(page.getByText('Sem conexão')).toBeVisible();
	await irPeloMenu(page, 'Cronograma');
	await expect(page.getByRole('heading', { level: 1, name: 'Cronograma' })).toBeVisible();
	await page.context().close();
});

test('uma nota escrita sem rede fica no aparelho, até depois de fechar o app, e chega uma vez só', async ({ browser }) => {
	// Execuções anteriores deixam notas esperando: a crise responde, para o limite não barrar.
	const crise = await clienteComo(C.conta('crise-treino@exemplo.test'));
	const pendentes = (await crise.from('nota_crise').select('id').in('status', ['pendente', 'em_analise'])).data!;
	if (pendentes.length) {
		await crise.rpc('responder_notas', { p_ids: pendentes.map((n) => n.id), p_status: 'aprovada', p_resposta: 'Ok.' });
	}

	const page = await celular(browser, DELEGADO);
	await page.goto(CRISE);
	await comServiceWorker(page);
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });

	const titulo = `Barragem fechada ${Date.now()}`;
	await page.context().setOffline(true);
	await page.getByLabel('Título').fill(titulo);
	await page.getByLabel('Texto').fill('O Paraguai pede a abertura das comportas.');
	await page.getByRole('button', { name: 'Enviar à crise' }).click();
	await expect(page.getByText('Sem conexão: ficou guardado no aparelho')).toBeVisible();
	await expect(page.getByText('1 para enviar')).toBeVisible();

	// O app fecha e abre de novo, ainda sem rede: a nota continua guardada.
	await page.reload();
	await expect(page.getByText('1 para enviar')).toBeVisible();

	await page.context().setOffline(false);
	await expect(page.getByText('1 para enviar')).toHaveCount(0, { timeout: 15_000 });
	await expect(page.getByRole('region', { name: /^Notas de Paraguai/ })).toContainText(titulo, { timeout: 10_000 });

	const delegado = await clienteComo(DELEGADO);
	const { count } = await delegado.from('nota_crise').select('id', { count: 'exact', head: true }).eq('titulo', titulo);
	expect(count, 'uma nota só').toBe(1);
	await page.context().close();
});

test('uma versão nova do app substitui a antiga no cache', async ({ browser }) => {
	const page = await celular(browser, DELEGADO);
	await comServiceWorker(page);
	// Simula o cache de uma versão anterior e reinstala o service worker.
	await page.evaluate(async () => {
		await (await caches.open('app-versao-antiga')).put('/antigo', new Response('antigo'));
		for (const registro of await navigator.serviceWorker.getRegistrations()) await registro.unregister();
	});
	await page.reload();
	await page.evaluate(() => navigator.serviceWorker.ready);
	await expect
		.poll(() => page.evaluate(async () => (await caches.keys()).filter((nome) => nome.startsWith('app-'))))
		.toEqual([expect.stringMatching(/^app-\d+$/)]);
	await page.context().close();
});

test('a instalação não baixa todas as bandeiras nem as fontes .woff (passo 40)', async ({ browser }) => {
	const page = await celular(browser, DELEGADO);
	await comServiceWorker(page);
	const guardados = await page.evaluate(async () => (await (await caches.open('imutaveis')).keys()).map((p) => new URL(p.url).pathname));
	expect(guardados.some((c) => c.endsWith('.js'))).toBe(true);
	// Das 271 bandeiras, entram só as que já apareceram na tela; as fontes .woff, nunca.
	expect(guardados.filter((c) => c.endsWith('.svg')).length).toBeLessThan(10);
	expect(guardados.filter((c) => c.endsWith('.woff'))).toEqual([]);
	await page.context().close();
});

/**
 * Bytes e leituras da API por atualização da sessão, no celular de um delegado, numa
 * tela ao vivo. Uma sessão de 2 h com uma mudança a cada 20 s tem ~360 atualizações.
 */
async function consumo(browser: Browser, rota: string) {
	const mesa = await clienteComo(C.conta('mesa-treino@exemplo.test'));
	const comite = (await mesa.from('comite').select('id').eq('sigla', C.sigla).single()).data!.id;
	const delegacoes = (await mesa.from('delegacao').select('id').eq('comite_id', comite)).data!;
	const aberta = await mesa.from('estado_sessao').select('sessao_id').eq('comite_id', comite).maybeSingle();
	if (!aberta.data?.sessao_id) expect((await mesa.rpc('abrir_sessao', { p_comite: comite })).error).toBeNull();

	// Sem o service worker: as leituras dele não aparecem na rede da página.
	const page = await celular(browser, DELEGADO, 'block');
	await page.goto(rota);
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	await page.waitForTimeout(1_000);

	// Conta os bytes que chegam ao aparelho (respostas da API e mensagens do tempo real) e
	// as leituras da API (sem as consultas prévias do CORS).
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Network.enable');
	let bytes = 0;
	let leituras = 0;
	cdp.on('Network.requestWillBeSent', (e) => {
		if (e.request.url.includes('/rest/v1/') && e.request.method !== 'OPTIONS') leituras++;
	});
	cdp.on('Network.loadingFinished', (e) => (bytes += e.encodedDataLength));
	cdp.on('Network.webSocketFrameReceived', (e) => (bytes += e.response.payloadData.length));

	const ATUALIZACOES = 20;
	for (let i = 0; i < ATUALIZACOES; i++) {
		const orador = delegacoes[i % delegacoes.length].id;
		expect((await mesa.rpc('dar_palavra', { p_comite: comite, p_delegacao: orador, p_seg: 60 })).error).toBeNull();
		await page.waitForTimeout(600);
	}
	await page.waitForTimeout(1_500);
	await page.context().close();
	const resultado = { kb: bytes / ATUALIZACOES / 1024, leituras: leituras / ATUALIZACOES };
	const texto = `${rota}: ${resultado.kb.toFixed(1)} KB e ${resultado.leituras.toFixed(1)} leituras por atualização; ~${((resultado.kb * 360) / 1024).toFixed(1)} MB por sessão de 2 h`;
	test.info().annotations.push({ type: 'consumo', description: texto });
	console.log(`Consumo: ${texto}`);
	return resultado;
}

test('consumo de dados: a tela da sessão relê só o que mudou', async ({ browser }) => {
	test.setTimeout(120_000);
	const { kb, leituras } = await consumo(browser, `/comite/${C.sigla}/sessao`);
	// O estado da sessão e a permissão de presidir (passo 40); antes eram 9 leituras. A folga
	// cobre os avisos que outros testes, em paralelo, publicam no mesmo evento.
	expect(leituras).toBeLessThanOrEqual(3);
	expect(kb).toBeLessThan(20);
});

test('consumo de dados: o Agora relê só o que mudou', async ({ browser }) => {
	test.setTimeout(120_000);
	const { kb, leituras } = await consumo(browser, '/');
	// O estado da sessão, a permissão de presidir e o andamento dos comitês; antes eram 18.
	// A folga cobre os avisos que outros testes, em paralelo, publicam no mesmo evento.
	expect(leituras).toBeLessThanOrEqual(5);
	expect(kb).toBeLessThan(20);
});
