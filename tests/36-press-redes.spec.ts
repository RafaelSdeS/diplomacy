import { expect, test } from '@playwright/test';
import { CONTAS, entrar } from './ajuda.ts';

// Passo 36: a matéria vai às redes em um toque. Comitê CSNU-T (Al Jazeera, do seed).
test('a press tem WhatsApp, X e "copiar legenda" com o texto pronto', async ({ page, context }, info) => {
	test.skip(info.project.name !== 'notebook', 'uma tela basta');
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await entrar(page, CONTAS.press);
	await page.goto('/press/escrever');
	const titulo = `Matéria para as redes ${Date.now()}`;
	await page.getByLabel('Título').fill(titulo);
	await page.getByLabel(/^Texto/).fill('Texto da matéria.');
	await page.getByRole('button', { name: 'Publicar' }).click();
	await expect(page).toHaveURL(/\/press\/CSNU-T\?n=/);

	const whatsapp = page.getByRole('link', { name: 'WhatsApp' });
	await expect(whatsapp).toHaveAttribute('href', new RegExp(`^https://wa\\.me/\\?text=${encodeURIComponent(titulo)}`));
	await expect(page.getByRole('link', { name: 'X', exact: true })).toHaveAttribute('href', /^https:\/\/x\.com\/intent\/post\?text=/);
	await page.getByRole('button', { name: 'Copiar legenda' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Legenda copiada.' })).toBeVisible();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(titulo);
});
