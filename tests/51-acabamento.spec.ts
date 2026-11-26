import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { abrirAcao, CONTAS, entrar } from './ajuda.ts';

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
