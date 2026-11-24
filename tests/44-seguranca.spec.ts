import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { contaDoTreino, isolado } from '../scripts/delegacoes.ts';
import { clienteComo, entrar, sair, pedirSaida } from './ajuda.ts';

// Passo 44: num aparelho compartilhado, uma conta nunca vê o que outra leu; sair apaga
// tudo; o cache offline vale 12 horas e nunca guarda o que é sensível.
const C = isolado('44');

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'roda num projeto só');
});

const PARAGUAI = C.conta(contaDoTreino('Paraguai'));
const URUGUAI = C.conta(contaDoTreino('Uruguai'));
const CRISE = `/comite/${C.sigla}/crise`;

async function aparelho(browser: Browser) {
	return browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, serviceWorkers: 'allow' });
}

/** Entra e espera o service worker assumir a página. */
async function entrarComServiceWorker(contexto: BrowserContext, conta: string) {
	const page = contexto.pages()[0] ?? (await contexto.newPage());
	await entrar(page, conta);
	await page.evaluate(() => navigator.serviceWorker.ready);
	await page.reload();
	await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
	return page;
}

const cachesDeDados = (page: Page) =>
	page.evaluate(async () => (await caches.keys()).filter((n) => n === 'dados' || n.startsWith('dados-')));

/** As URLs guardadas nos caches de dados do aparelho. */
const guardadas = (page: Page) =>
	page.evaluate(async () => {
		const urls: string[] = [];
		for (const nome of await caches.keys())
			if (nome.startsWith('dados-')) for (const p of await (await caches.open(nome)).keys()) urls.push(decodeURIComponent(p.url));
		return urls;
	});

const sairPeloMenu = pedirSaida;

test('sair apaga os dados da conta; quem entra depois, sem rede, não vê nada dela', async ({ browser }) => {
	const contexto = await aparelho(browser);
	const page = await entrarComServiceWorker(contexto, PARAGUAI);
	await page.goto('/cronograma');
	await expect(page.getByRole('heading', { level: 1, name: 'Cronograma' })).toBeVisible();
	await expect.poll(() => cachesDeDados(page)).toEqual([expect.stringMatching(/^dados-/)]);

	// Passo 47: Sair pede confirmação; cancelar mantém a sessão e os dados.
	await sairPeloMenu(page);
	const confirmacao = page.getByRole('dialog', { name: 'Sair da conta?' });
	await expect(confirmacao).toContainText('Os dados desta sessão serão removidos deste aparelho.');
	await confirmacao.getByRole('button', { name: 'Cancelar' }).click();
	await expect(confirmacao).toBeHidden();
	expect(await cachesDeDados(page)).toEqual([expect.stringMatching(/^dados-/)]);

	await sair(page);
	await expect(page).toHaveURL(/\/entrar$/);
	expect(await cachesDeDados(page)).toEqual([]);

	await entrar(page, URUGUAI);
	await expect(page.getByRole('banner')).toContainText('Uruguai');
	await contexto.setOffline(true);
	await page.goto('/');
	await expect(page.getByRole('banner')).toContainText('Uruguai');
	await expect(page.getByRole('banner')).not.toContainText('Paraguai');
	await contexto.close();
});

test('entrar com outra conta sem sair (login vencido) apaga o cache da anterior', async ({ browser }) => {
	const contexto = await aparelho(browser);
	const page = await entrarComServiceWorker(contexto, PARAGUAI);
	await expect.poll(() => cachesDeDados(page)).toHaveLength(1);
	const [doParaguai] = await cachesDeDados(page);

	// O login some do aparelho (venceu), mas os dados lidos ficaram.
	await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('sb-')).forEach((k) => localStorage.removeItem(k)));
	await entrar(page, URUGUAI);
	await expect.poll(() => cachesDeDados(page)).toEqual([expect.not.stringMatching(doParaguai)]);
	await contexto.close();
});

test('sem rede, uma resposta guardada há mais de 12 horas não é servida', async ({ browser }) => {
	const contexto = await aparelho(browser);
	const page = await entrarComServiceWorker(contexto, PARAGUAI);
	await page.goto('/cronograma');
	await expect(page.getByRole('heading', { level: 1, name: 'Cronograma' })).toBeVisible();
	await expect.poll(async () => (await guardadas(page)).filter((u) => u.includes('cronograma_item')).length).toBeGreaterThan(0);

	// Envelhece a leitura do cronograma em 13 horas.
	await page.evaluate(async () => {
		for (const nome of (await caches.keys()).filter((n) => n.startsWith('dados-'))) {
			const cache = await caches.open(nome);
			for (const pedido of await cache.keys()) {
				if (!pedido.url.includes('cronograma_item')) continue;
				const antiga = (await cache.match(pedido))!;
				const cabecalhos = new Headers(antiga.headers);
				cabecalhos.set('x-guardado-em', String(Date.now() - 13 * 60 * 60 * 1000));
				await cache.put(pedido, new Response(await antiga.blob(), { status: 200, headers: cabecalhos }));
			}
		}
	});
	await contexto.setOffline(true);
	await page.goto('/cronograma');
	await expect.poll(async () => (await guardadas(page)).filter((u) => u.includes('cronograma_item'))).toEqual([]);
	await contexto.close();
});

test('notas de crise e o texto da coletiva nunca ficam no cache; sem rede, a tela de crise abre para escrever', async ({ browser }) => {
	const contexto = await aparelho(browser);
	const page = await entrarComServiceWorker(contexto, PARAGUAI);
	await page.goto(CRISE);
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	await page.goto('/');
	await expect.poll(async () => (await guardadas(page)).length).toBeGreaterThan(0);
	const sensiveis = (await guardadas(page)).filter((u) => /(^|[^a-z_])(nota_crise|coletiva_pergunta_texto)([^a-z_]|$)/.test(u));
	expect(sensiveis).toEqual([]);

	await contexto.setOffline(true);
	await page.goto(CRISE);
	await expect(page.getByText('as notas não ficam guardadas no aparelho')).toBeVisible();
	await expect(page.getByLabel('Título')).toBeVisible();
	await contexto.close();
});

test('sair com itens na caixa de saída avisa; "enviar agora" envia e só depois sai', async ({ browser }) => {
	const crise = await clienteComo(C.conta('crise-treino@exemplo.test'));
	const esperando = (await crise.from('nota_crise').select('id').in('status', ['pendente', 'em_analise'])).data!;
	if (esperando.length) {
		await crise.rpc('responder_notas', { p_ids: esperando.map((n) => n.id), p_status: 'aprovada', p_resposta: 'Ok.' });
	}

	const contexto = await aparelho(browser);
	const page = await entrarComServiceWorker(contexto, PARAGUAI);
	await page.goto(CRISE);
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	const titulo = `Comportas ${Date.now()}`;
	await contexto.setOffline(true);
	await page.getByLabel('Título').fill(titulo);
	await page.getByLabel('Texto').fill('O Paraguai pede a abertura das comportas.');
	await page.getByRole('button', { name: 'Enviar à crise' }).click();
	await expect(page.getByText('1 para enviar')).toBeVisible();

	await sairPeloMenu(page);
	const aviso = page.getByRole('dialog', { name: 'Itens não enviados: 1' });
	await expect(aviso).toBeVisible();
	await aviso.getByRole('button', { name: 'Enviar agora' }).click();
	await expect(aviso.getByRole('alert')).toContainText('Ainda sem conexão');
	await aviso.getByRole('button', { name: 'Cancelar' }).click();
	await expect(page).not.toHaveURL(/\/entrar$/);

	await contexto.setOffline(false);
	// A caixa pode ter se esvaziado sozinha na volta da rede: então vem a confirmação simples.
	await sairPeloMenu(page);
	await page.getByRole('dialog').getByRole('button', { name: /^(Enviar agora|Sair)$/ }).click();
	await expect(page).toHaveURL(/\/entrar$/, { timeout: 15_000 });
	const { count } = await (await clienteComo(PARAGUAI))
		.from('nota_crise')
		.select('id', { count: 'exact', head: true })
		.eq('titulo', titulo);
	expect(count, 'a nota chegou antes de sair').toBe(1);
	await contexto.close();
});

test('sair numa aba leva a outra aba ao login', async ({ browser }) => {
	const contexto = await aparelho(browser);
	const primeira = await entrarComServiceWorker(contexto, PARAGUAI);
	const segunda = await contexto.newPage();
	await segunda.goto('/cronograma');
	await expect(segunda.getByRole('heading', { level: 1, name: 'Cronograma' })).toBeVisible();

	await sair(primeira);
	await expect(primeira).toHaveURL(/\/entrar$/);
	await expect(segunda).toHaveURL(/\/entrar$/, { timeout: 10_000 });
	await contexto.close();
});
