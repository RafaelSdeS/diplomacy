import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contaDaDelegacao } from '../scripts/delegacoes.ts';
import { entrar } from './ajuda.ts';

// Passo 26: clicar no país abre a página da delegação, com os delegados, os documentos
// abertos e as ações. Comitê CSNU-T: os EUA têm dois delegados no seed.
test('do comitê à página dos EUA, com os dois delegados e o bilhete pronto', async ({ page }, info) => {
	test.skip(info.project.name === 'telao', 'tela de celular e notebook');
	await entrar(page, contaDaDelegacao('Irã'));
	await page.goto('/comite/CSNU-T');
	// Passo 55: o país abre a ficha; a página da delegação fica a um clique dela.
	await page.getByRole('button', { name: 'EUA', exact: true }).click();
	await page.getByRole('dialog', { name: 'EUA' }).getByRole('link', { name: 'Abrir a página da delegação' }).click();
	await expect(page).toHaveURL(/\/comite\/CSNU-T\/delegacao\//);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('EUA');
	await expect(page.getByText('United States of America').filter({ visible: true })).toBeVisible();
	const delegados = page.getByRole('region', { name: 'Delegados' });
	await expect(delegados.getByRole('listitem')).toHaveCount(2);
	await expect(delegados).toContainText('Delegado 01');
	await expect(delegados).toContainText('Delegado 16');

	const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
	expect(violations).toEqual([]);

	await page.getByRole('link', { name: 'Mandar bilhete' }).click();
	await expect(page).toHaveURL(/\/comite\/CSNU-T\/mensagens\?para=/);
	// Passo 47: o destinatário vem escolhido no resumo do Escolha.
	await expect(page.getByRole('form', { name: 'Novo bilhete' }).locator('.escolha-resumo')).toContainText('EUA');
});

test('a própria delegação não tem as ações de bilhete na sua página', async ({ page }, info) => {
	test.skip(info.project.name !== 'notebook', 'uma tela basta');
	await entrar(page, contaDaDelegacao('EUA'));
	await page.goto('/perfil');
	await page.getByRole('link', { name: 'Página da delegação' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('EUA');
	await expect(page.getByRole('link', { name: 'Mandar bilhete' })).toHaveCount(0);
});
