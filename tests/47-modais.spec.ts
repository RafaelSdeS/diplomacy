import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Passo 47: o modal base (src/lib/ui/Modal.svelte), testado no /estilo, que abre sem login.
// Confirmar, a ficha da delegação e o "Ir para…" usam o mesmo componente.

test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'comportamento do componente, igual em toda tela');
});

test('o modal abre com nome, fecha no Escape e devolve o foco a quem abriu', async ({ page }) => {
	await page.goto('/estilo');
	const abrir = page.getByRole('button', { name: 'Abrir diálogo' });
	await abrir.click();
	const modal = page.getByRole('dialog', { name: 'Encerrar a votação?' });
	await expect(modal).toBeVisible();
	await expect(modal.getByRole('button', { name: 'Encerrar' })).toBeFocused();
	expect((await new AxeBuilder({ page }).include('dialog[open]').analyze()).violations).toEqual([]);

	await page.keyboard.press('Escape');
	await expect(modal).toBeHidden();
	await expect(abrir).toBeFocused();
});

test('o clique no fundo fecha o modal, menos com texto digitado', async ({ page }) => {
	await page.goto('/estilo');
	await page.getByRole('button', { name: 'Abrir diálogo' }).click();
	const modal = page.getByRole('dialog', { name: 'Encerrar a votação?' });
	await expect(modal).toBeVisible();

	// Um clique dentro da caixa, fora dos botões, não fecha.
	await modal.getByText('Os votos não poderão mais ser alterados.').click();
	await expect(modal).toBeVisible();

	// Com texto num campo, o fundo não fecha (o campo entra só no teste: o /estilo tem captura).
	await modal.evaluate((d) => {
		const campo = document.createElement('textarea');
		campo.value = 'rascunho';
		d.append(campo);
	});
	await page.mouse.click(5, 5);
	await expect(modal).toBeVisible();

	await modal.locator('textarea').fill('');
	await page.mouse.click(5, 5);
	await expect(modal).toBeHidden();
});

test.describe('aparência', () => {
	test.skip(!process.env.CAPTURAS, 'capturas só no contêiner (npm run capturas)');

	for (const tema of ['light', 'dark'] as const) {
		test(`o Escolha aberto e o diálogo batem com as capturas (tema ${tema})`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: tema });
			await page.goto('/estilo');
			await page.evaluate(async () => {
				await document.fonts.ready;
			});
			await page.getByRole('button', { name: 'Escolher: Delegação' }).click();
			const escolha = page.getByRole('dialog', { name: 'Delegação' });
			await expect(escolha.getByRole('radio', { name: 'Brasil' })).toBeChecked();
			await expect(escolha).toHaveScreenshot(`escolha-${tema}.png`);
			await page.keyboard.press('Escape');
			await page.getByRole('button', { name: 'Abrir diálogo' }).click();
			await expect(page.getByRole('dialog', { name: 'Encerrar a votação?' })).toHaveScreenshot(`dialogo-${tema}.png`);
		});
	}
});
