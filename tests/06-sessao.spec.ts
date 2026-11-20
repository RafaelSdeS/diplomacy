import { expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONTAS, entrar } from './ajuda.ts';

const SESSAO = '/comite/CSNU-T/sessao';
const PRESIDENCIA = '/comite/CSNU-T/presidencia';
const CHAMADA = '/comite/CSNU-T/chamada';
const TELAO = '/telao/CSNU-T';
const EUA = CONTAS.delegado; // delegado01
const RUSSIA = 'delegado02@exemplo.test';
const CHINA = 'delegado03@exemplo.test';

// O comitê de teste tem uma sessão só, e estes testes mexem nela: rodam em série,
// num projeto só. As telas de outros tamanhos usam test.use.
test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a sessão do comitê de teste é uma só');
});

async function abrir(browser: Browser, conta: string, rota: string) {
	const page = await browser.newPage();
	await entrar(page, conta);
	await page.goto(rota);
	await aoVivo(page);
	return page;
}

/** Espera a tela se ligar ao tempo real. */
const aoVivo = (page: Page) => expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });

const segundos = (texto: string | null) => {
	const [m, s] = texto!.split(':').map(Number);
	return m * 60 + s;
};

async function semErrosDeAcessibilidade(page: Page) {
	const { violations } = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(violations).toEqual([]);
}

test('a mesa sorteia o rodízio, abre a sessão e faz a chamada', async ({ page }) => {
	await entrar(page, CONTAS.mesa);
	await page.goto(CHAMADA);
	await aoVivo(page);

	// Só os EUA se voluntariam: a próxima sessão comum é presidida por eles.
	await page.getByRole('group', { name: 'Delegações voluntárias' }).getByLabel('EUA').check();
	await page.getByRole('button', { name: /^Sortear/ }).click();
	await expect(page.getByRole('list', { name: 'Ordem sorteada' })).toHaveText(/^\s*EUA\s*$/);

	// A primeira sessão é do bureau; num banco sem sessões, abre duas.
	const situacao = page.getByRole('region', { name: 'Sessão' }).locator('p').first();
	async function abrirSessao() {
		const antes = await situacao.textContent();
		await page.getByRole('button', { name: /^Abrir/ }).click();
		await expect(situacao).not.toHaveText(antes!);
		return (await situacao.textContent())!;
	}
	if (!(await abrirSessao()).includes('Presidência: EUA')) await abrirSessao();
	await expect(situacao).toContainText('Presidência: EUA');

	// 15 delegações: quórum de 5.
	const presenca = page.getByRole('region', { name: 'Presença' });
	await expect(presenca).toContainText('Quórum: 5');
	await expect(presenca).toContainText('Sem quórum');
	for (const nome of ['Brasil', 'China', 'EUA', 'França', 'Rússia']) {
		await presenca.getByRole('group', { name: nome }).getByLabel('Presente', { exact: true }).check();
	}
	await expect(presenca).toContainText('Presentes: 5 de 15');
	await expect(presenca).toContainText('Há quórum');
	await presenca.getByRole('group', { name: 'Rússia' }).getByLabel('Ausente').check();
	await expect(presenca).toContainText('Sem quórum');
	await presenca.getByRole('group', { name: 'Rússia' }).getByLabel('Presente e votando').check();
	await expect(presenca).toContainText('Há quórum');
});

test('um pedido de fala chega ao painel da presidência em menos de 1 segundo', async ({ page, browser }) => {
	await entrar(page, EUA);
	await page.goto(PRESIDENCIA);
	await aoVivo(page);
	const fila = page.getByRole('region', { name: 'Pedidos de fala' });
	await expect(fila).toContainText('Nenhuma placa levantada');

	const russia = await abrir(browser, RUSSIA, SESSAO);
	await russia.getByRole('button', { name: 'Levantar placa' }).click();
	await expect(fila).toContainText('Rússia', { timeout: 1_000 });
	await expect(russia.getByRole('article', { name: 'Sua placa' })).toContainText('1ª na fila');
	await russia.close();
});

test('Enter dá a palavra ao próximo, e os dois aparelhos mostram o mesmo tempo', async ({ page, browser }) => {
	await entrar(page, EUA);
	await page.goto(PRESIDENCIA);
	await aoVivo(page);
	await expect(page.getByRole('region', { name: 'Pedidos de fala' })).toContainText('Rússia');
	const russia = await abrir(browser, RUSSIA, SESSAO);

	await page.keyboard.press('Enter');
	await expect(page.getByRole('region', { name: 'Com a palavra' })).toContainText('Rússia');
	await expect(russia.getByRole('article', { name: 'Com a palavra' })).toContainText('Rússia');
	await expect(page.getByRole('region', { name: 'Pedidos de fala' })).toContainText('Nenhuma placa levantada');

	const [aqui, la] = await Promise.all([
		page.locator('[data-cronometro]').textContent(),
		russia.locator('[data-cronometro]').textContent()
	]);
	expect(segundos(aqui)).toBeGreaterThan(60);
	expect(Math.abs(segundos(aqui) - segundos(la))).toBeLessThanOrEqual(1);
	await russia.close();
});

test('Espaço pausa e retoma o cronômetro, mas não dentro de um campo', async ({ page, browser }) => {
	await entrar(page, EUA);
	await page.goto(PRESIDENCIA);
	await aoVivo(page);
	const palavra = page.getByRole('region', { name: 'Com a palavra' });
	const russia = await abrir(browser, RUSSIA, SESSAO);

	await page.keyboard.press('Space');
	await expect(palavra.getByRole('status')).toHaveText('Pausado');
	await expect(russia.getByRole('article', { name: 'Com a palavra' }).getByRole('status')).toHaveText('Pausado');
	const pausado = await palavra.locator('[data-cronometro]').textContent();
	await page.waitForTimeout(1_500);
	await expect(palavra.locator('[data-cronometro]')).toHaveText(pausado!);
	expect(await russia.locator('[data-cronometro]').textContent()).toBe(pausado);

	await page.getByLabel('Tempo de fala (segundos)').press('Space');
	await expect(palavra.getByRole('status')).toHaveText('Pausado');

	await page.locator('h1').click();
	await page.keyboard.press('Space');
	await expect(palavra.getByRole('status')).toHaveText('');
	await russia.close();
});

test('um ponto chega à presidência, e a resposta volta à delegação', async ({ page, browser }) => {
	const russia = await abrir(browser, RUSSIA, SESSAO);
	await russia.getByLabel('Tipo').selectOption({ label: 'Ponto de dúvida' });
	await russia.getByLabel('Detalhe (opcional)').fill('Qual é o tempo de fala?');
	await russia.getByRole('button', { name: 'Enviar à presidência' }).click();
	await expect(russia.getByRole('status').filter({ hasText: 'enviado' })).toBeVisible();

	await entrar(page, EUA);
	await page.goto(PRESIDENCIA);
	const pontos = page.getByRole('region', { name: 'Pontos e moções' });
	await expect(pontos).toContainText('Qual é o tempo de fala?');
	await pontos.getByRole('button', { name: 'Aceitar: Ponto de dúvida, Rússia' }).click();
	await expect(pontos).toContainText('Nenhum ponto ou moção');

	await expect(russia.getByRole('list', { name: 'Seus pontos e moções' })).toContainText('Aceito');
	await russia.close();
});

test('quem não preside não usa o painel', async ({ page }) => {
	await entrar(page, CHINA);
	await page.goto(PRESIDENCIA);
	await expect(page.getByText('Você não preside esta sessão.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Pausar' })).toHaveCount(0);

	await page.goto(SESSAO);
	await expect(page.getByRole('link', { name: 'Painel da presidência' })).toHaveCount(0);
});

test.describe('telão em 1920 × 1080', () => {
	test.use({ viewport: { width: 1920, height: 1080 } });

	test('mostra orador, bandeira e cronômetro, sem rolagem e sem a navegação do app', async ({ page }) => {
		await entrar(page, CONTAS.mesa);
		await page.goto(TELAO);
		await aoVivo(page);

		const orador = page.getByRole('region', { name: 'Com a palavra' });
		await expect(orador).toContainText('Rússia');
		await expect(orador.locator('img.bandeira')).toBeVisible();
		await expect(orador.locator('[data-cronometro]')).toBeVisible();
		await expect(page.getByRole('heading', { level: 1 })).toContainText(/Sessão \d+ · Debate formal/);

		await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0);
		await expect(page.getByRole('button')).toHaveCount(0);
		const sobra = await page.evaluate(() => {
			const raiz = document.documentElement;
			return [raiz.scrollWidth - raiz.clientWidth, raiz.scrollHeight - raiz.clientHeight];
		});
		expect(sobra).toEqual([0, 0]);
	});

	test('aparência do telão', async ({ page }) => {
		test.skip(!process.env.CI, 'capturas de referência só no CI');
		await entrar(page, CONTAS.mesa);
		await page.goto(TELAO);
		await aoVivo(page);
		await expect(page.getByRole('region', { name: 'Com a palavra' })).toContainText('Rússia');
		await expect(page).toHaveScreenshot('telao.png', { mask: [page.locator('.cronometro')] });
	});
});

test('aparência do painel da presidência', async ({ page }) => {
	test.skip(!process.env.CI, 'capturas de referência só no CI');
	await entrar(page, EUA);
	await page.goto(PRESIDENCIA);
	await aoVivo(page);
	await expect(page.getByRole('region', { name: 'Com a palavra' })).toContainText('Rússia');
	await expect(page).toHaveScreenshot('presidencia.png', { fullPage: true, mask: [page.locator('.cronometro')] });
});

for (const tema of ['light', 'dark'] as const) {
	test(`as telas da sessão não têm erros de acessibilidade (tema ${tema})`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: tema });
		await entrar(page, EUA);
		for (const [rota, titulo] of [
			[SESSAO, /^Sessão/],
			[PRESIDENCIA, 'Presidência']
		] as const) {
			await page.goto(rota);
			await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
			await aoVivo(page);
			await semErrosDeAcessibilidade(page);
		}
		await page.getByRole('button', { name: 'Sair' }).click();
		await expect(page).toHaveURL(/\/entrar$/);

		await entrar(page, CONTAS.mesa);
		for (const rota of [CHAMADA, TELAO]) {
			await page.goto(rota);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			await aoVivo(page);
			await semErrosDeAcessibilidade(page);
		}
	});
}

test('a presidência passada sem lista de espera volta à mesa', async ({ page, browser }) => {
	await entrar(page, EUA);
	await page.goto(PRESIDENCIA);
	await aoVivo(page);
	const mesa = await abrir(browser, CONTAS.mesa, SESSAO);

	await page.getByRole('button', { name: 'Passar a presidência' }).click();
	await expect(page.getByText('Você não preside esta sessão.')).toBeVisible();
	await expect(mesa.getByText('Presidência: Mesa')).toBeVisible();
	await mesa.close();
});
