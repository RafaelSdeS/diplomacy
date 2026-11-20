import { expect, test, type Browser, type Page } from '@playwright/test';
import { contaDoTreino } from '../scripts/delegacoes.ts';
import { clienteComo, entrar } from './ajuda.ts';

// Passo 15: o app abre sem internet, a caixa de saída não perde nem duplica nada, e o
// consumo de dados de uma sessão fica medido.

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'roda num projeto só');
});

const DELEGADO = contaDoTreino('Paraguai');
const CRISE = '/comite/TREINO/crise';

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
	await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Cronograma' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Cronograma' })).toBeVisible();
	await page.context().close();
});

test('uma nota escrita sem rede fica no aparelho, até depois de fechar o app, e chega uma vez só', async ({ browser }) => {
	// Execuções anteriores deixam notas esperando: a crise responde, para o limite não barrar.
	const crise = await clienteComo('crise-treino@exemplo.test');
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

test('consumo de dados: quanto o celular de um delegado gasta por atualização da sessão', async ({ browser }) => {
	test.setTimeout(120_000);
	const mesa = await clienteComo('mesa-treino@exemplo.test');
	const comite = (await mesa.from('comite').select('id').eq('sigla', 'TREINO').single()).data!.id;
	const delegacoes = (await mesa.from('delegacao').select('id').eq('comite_id', comite)).data!;
	expect((await mesa.rpc('abrir_sessao', { p_comite: comite })).error).toBeNull();

	// Sem o service worker: as leituras dele não aparecem na rede da página.
	const page = await celular(browser, DELEGADO, 'block');
	await page.goto('/comite/TREINO/sessao');
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	await page.waitForTimeout(1_000);

	// Conta os bytes que chegam ao aparelho: respostas da API e mensagens do tempo real.
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Network.enable');
	let bytes = 0;
	cdp.on('Network.loadingFinished', (e) => (bytes += e.encodedDataLength));
	cdp.on('Network.webSocketFrameReceived', (e) => (bytes += e.response.payloadData.length));

	const ATUALIZACOES = 20;
	for (let i = 0; i < ATUALIZACOES; i++) {
		const orador = delegacoes[i % delegacoes.length].id;
		expect((await mesa.rpc('dar_palavra', { p_comite: comite, p_delegacao: orador, p_seg: 60 })).error).toBeNull();
		await page.waitForTimeout(400);
	}
	await page.waitForTimeout(1_500);
	const porAtualizacao = bytes / ATUALIZACOES;
	// Uma sessão de 2 h com uma mudança a cada 20 s (orador, cronômetro, placas, votos) tem ~360.
	const sessao = (porAtualizacao * 360) / 1024 / 1024;
	test.info().annotations.push({
		type: 'consumo',
		description: `${(porAtualizacao / 1024).toFixed(1)} KB por atualização; ~${sessao.toFixed(1)} MB por sessão de 2 h`
	});
	console.log(`Consumo: ${(porAtualizacao / 1024).toFixed(1)} KB por atualização, ~${sessao.toFixed(1)} MB por sessão de 2 h`);
	expect(porAtualizacao).toBeLessThan(20 * 1024);
	await page.context().close();
});
