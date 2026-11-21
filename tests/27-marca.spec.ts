import { expect, test } from '@playwright/test';
import { CONTAS, entrar } from './ajuda.ts';

// Passo 27: o app se chama Diplomacy; o nome do evento vem do banco.
test('o app instalado se chama Diplomacy, com ícone maskable', async ({ page }, info) => {
	test.skip(info.project.name !== 'notebook', 'uma tela basta');
	const manifest = await (await page.request.get('/manifest.webmanifest')).json();
	expect(manifest.name).toBe('Diplomacy');
	expect(manifest.short_name).toBe('Diplomacy');
	expect(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
});

test('sem login, o título é do app; com login, do evento da pessoa', async ({ page }, info) => {
	test.skip(info.project.name !== 'notebook', 'uma tela basta');
	await page.goto('/entrar');
	await expect(page).toHaveTitle(/· Diplomacy$/);

	await entrar(page, CONTAS.delegado);
	await page.goto('/comite/CSNU-T/sessao');
	await expect(page).toHaveTitle(/^Sessão · CSNU-T · UFRGSMUN Teste$/);
	const cabecalho = page.getByRole('banner');
	await expect(cabecalho.getByRole('link', { name: /Diplomacy/ })).toContainText('UFRGSMUN Teste');
});
