import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { isolado } from '../scripts/delegacoes.ts';
import { abrirAcao, comiteEmDebate, CONTAS, entrar } from './ajuda.ts';

// A votação aberta no painel usa a cópia do CSNU-T (15 delegações) só deste arquivo.
const V = isolado('51a');

// Passo 51 (lotes da crise, blocos e secretaria, e o que vale em todos): nas telas revisadas,
// toda ação é uma caixa à vista, com fundo ou contorno (não parece link), e o axe passa nos
// dois temas.
const TELAS: [string, string[]][] = [
	[CONTAS.delegado, ['/', '/comite/CSNU-T', '/comite/CSNU-T/documentos', '/comite/CSNU-T/dpo', '/comite/CSNU-T/blocos', '/perfil']],
	[CONTAS.crise, ['/crise/CSNU-T']],
	[CONTAS.secretaria, ['/secretaria/participantes', '/secretaria/dados']]
];

test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'as telas revisadas, uma vez');
});

const semFundo = (page: Page) =>
	page.evaluate(() =>
		[...document.querySelectorAll<HTMLElement>('main button')]
			// O cartão da delegação inteiro é o botão (o fundo é do cartão).
			.filter((b) => b.offsetParent && !b.closest('dialog') && !b.matches('.grade-delegacoes-nome'))
			.filter((b) => {
				const estilo = getComputedStyle(b);
				return estilo.backgroundColor === 'rgba(0, 0, 0, 0)' && (estilo.borderStyle === 'none' || parseFloat(estilo.borderWidth) === 0);
			})
			.map((b) => b.textContent?.trim() || b.getAttribute('aria-label'))
	);

for (const tema of ['light', 'dark'] as const) {
	test(`nas telas revisadas, toda ação tem fundo e o axe passa (tema ${tema})`, async ({ browser }) => {
		test.setTimeout(90_000);
		for (const [conta, rotas] of TELAS) {
			const contexto = await browser.newContext({ colorScheme: tema, viewport: { width: 1366, height: 768 } });
			const page = await contexto.newPage();
			await entrar(page, conta);
			for (const rota of rotas) {
				await page.goto(rota);
				await expect(page.locator('main h1')).toBeVisible();
				expect(await semFundo(page), rota).toEqual([]);
				const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
				expect(violations, rota).toEqual([]);
			}
			await contexto.close();
		}
	});
}

test('a lista de participantes e a fila da crise rolam por dentro; a página não', async ({ browser }) => {
	for (const [conta, rota] of [
		[CONTAS.secretaria, '/secretaria/participantes'],
		[CONTAS.crise, '/crise/CSNU-T']
	]) {
		const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
		await entrar(page, conta);
		await page.goto(rota);
		await expect(page.locator('main h1')).toBeVisible();
		expect(await page.evaluate(() => document.scrollingElement!.scrollHeight), rota).toBeLessThanOrEqual(768);
		await page.context().close();
	}
});

test('o texto digitado num modal de criar sobrevive a fechar e reabrir', async ({ page }) => {
	await entrar(page, CONTAS.delegado);
	await page.goto('/comite/CSNU-T/blocos');
	await abrirAcao(page, 'Novo bloco');
	const modal = page.getByRole('dialog', { name: 'Novo bloco' });
	await modal.getByLabel('Nome do novo bloco').fill('Bloco do Atlântico');
	await page.keyboard.press('Escape');
	await expect(modal).toBeHidden();
	await abrirAcao(page, 'Novo bloco');
	await expect(modal.getByLabel('Nome do novo bloco')).toHaveValue('Bloco do Atlântico');
});

test('com a votação aberta, o painel mostra só a votação e o que decidir, sem rolar (passo 51)', async ({ page }) => {
	const { mesa, comite } = await comiteEmDebate(V.conta(CONTAS.mesa), V.sigla, V.conta(CONTAS.delegado));
	const votacao = await mesa.rpc('abrir_votacao_livre', { p_comite: comite, p_objeto: 'Votação de teste do painel', p_tipo: 'procedimental' });
	expect(votacao.error).toBeNull();
	try {
		await page.setViewportSize({ width: 1366, height: 768 });
		await entrar(page, V.conta(CONTAS.mesa));
		await page.goto(`/comite/${V.sigla}/sessao/presidencia`);
		await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
		await expect(page.getByRole('region', { name: 'Votação aberta' })).toBeVisible();
		await expect(page.getByRole('region', { name: 'Com a palavra' })).toBeHidden();
		await expect(page.getByRole('region', { name: 'Conduzir a votação' }).getByRole('button', { name: 'Encerrar a votação' })).toBeVisible();
		await expect(page.getByRole('region', { name: 'Para decidir' })).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(2);
		const sobras = await page.locator('.painel > .painel-coluna').evaluateAll((colunas) => colunas.map((c) => c.scrollHeight - c.clientHeight));
		for (const sobra of sobras) expect(sobra).toBeLessThanOrEqual(2);
	} finally {
		await mesa.rpc('encerrar_votacao', { p_votacao: votacao.data! });
	}
});

test('o "Voltar" devolve a tela com a busca, o filtro e a rolagem da coluna (passo 51)', async ({ page }) => {
	await page.setViewportSize({ width: 1366, height: 768 });
	await entrar(page, CONTAS.secretaria);
	await page.goto('/secretaria/participantes');
	await page.getByLabel('Filtrar por papel').selectOption('delegado');
	await page.getByRole('searchbox', { name: 'Buscar' }).fill('de');
	const coluna = page.locator('.colunas-que-rolam > .cartao').first();
	await coluna.evaluate((e) => (e.scrollTop = 600));
	const antes = await coluna.evaluate((e) => e.scrollTop);
	expect(antes).toBeGreaterThan(100);

	await page.getByRole('link', { name: 'Check-in' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Check-in' })).toBeVisible();
	await page.getByRole('link', { name: '‹ Voltar para Participantes' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Participantes' })).toBeVisible();
	await expect(page.getByRole('searchbox', { name: 'Buscar' })).toHaveValue('de');
	await expect(page.getByLabel('Filtrar por papel')).toHaveValue('delegado');
	await expect.poll(() => coluna.evaluate((e) => e.scrollTop)).toBe(antes);
});
