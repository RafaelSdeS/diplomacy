import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONTAS, entrar } from './ajuda.ts';

// Telas que abrem sem login (desde o passo 03, a página inicial exige login).
const rotas = ['/entrar', '/estilo'];
const temas = ['light', 'dark'] as const;

for (const rota of rotas) {
	test(`${rota} abre com um título`, async ({ page }) => {
		await page.goto(rota);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	for (const tema of temas) {
		test(`${rota} não tem erros de acessibilidade (tema ${tema})`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: tema });
			await page.goto(rota);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			const { violations } = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
				.analyze();
			expect(violations).toEqual([]);
		});
	}
}

test('a navegação fica embaixo no celular e na lateral no notebook', async ({ page }) => {
	await entrar(page, CONTAS.delegado);
	const caixa = await page.getByRole('navigation', { name: 'Principal' }).boundingBox();
	const tela = page.viewportSize();
	expect(caixa).not.toBeNull();
	expect(tela).not.toBeNull();

	if (tela!.width < 1024) {
		// Presa ao pé da tela, ocupando a largura toda.
		expect(Math.round(caixa!.y + caixa!.height)).toBe(tela!.height);
		expect(Math.round(caixa!.width)).toBe(tela!.width);
	} else {
		// Coluna à esquerda, abaixo do cabeçalho, até o fim da tela.
		expect(caixa!.x).toBe(0);
		expect(caixa!.height).toBeGreaterThan(tela!.height / 2);
	}
});

test('o link "Pular para o conteúdo" aparece com o teclado e leva ao conteúdo', async ({ page }) => {
	await page.goto('/entrar');
	// SPA: espera o app aparecer antes de usar o teclado.
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await page.keyboard.press('Tab');
	const pular = page.getByRole('link', { name: 'Pular para o conteúdo' });
	await expect(pular).toBeFocused();
	await expect(pular).toBeInViewport();
	await pular.press('Enter');
	await expect(page).toHaveURL(/#conteudo$/);
});

test.describe('zoom de 200%', () => {
	// Reflow da WCAG: com 320 px de largura, nada pode exigir rolagem horizontal.
	test.use({ viewport: { width: 320, height: 640 } });

	for (const rota of rotas) {
		test(`${rota} não rola na horizontal`, async ({ page }, info) => {
			test.skip(info.project.name !== 'celular', 'basta rodar uma vez');
			await page.goto(rota);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			const sobra = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			);
			expect(sobra).toBeLessThanOrEqual(0);
		});
	}
});

test.describe('aparência', () => {
	// As capturas de referência vêm do CI; em outra máquina as fontes mudam.
	test.skip(!process.env.CI, 'capturas só no CI');

	for (const tema of temas) {
		test(`/estilo bate com a captura de referência (tema ${tema})`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: tema });
			await page.goto('/estilo');
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			await page.evaluate(async () => {
				await document.fonts.ready;
			});
			await expect(page).toHaveScreenshot(`estilo-${tema}.png`, { fullPage: true });
		});
	}
});
