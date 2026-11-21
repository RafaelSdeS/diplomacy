import { expect, test, type Page } from '@playwright/test';
import { comiteEmDebate, entrar } from './ajuda.ts';

// Passo 31: a mesa assume a Itália (sem delegado no seed), age por ela e deixa. CE-T.
const PAINEL = '/comite/CE-T/sessao/presidencia';
const MESA = 'mesa-ce@exemplo.test';

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a sessão do comitê de teste é uma só');
});

test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const { mesa, comite } = await comiteEmDebate(MESA, 'CE-T', 'ce-alemanha@exemplo.test');
	await mesa.rpc('representar', { p_comite: comite, p_delegacao: null as unknown as string });
	await mesa.rpc('baixar_todas_placas', { p_comite: comite });
});

const aoVivo = (page: Page) => expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });

test('a mesa assume a Itália, levanta a placa por ela e deixa', async ({ page }) => {
	await entrar(page, MESA);
	await page.goto(PAINEL);
	await aoVivo(page);
	const assumir = page.getByRole('region', { name: 'Assumir uma delegação' });
	await assumir.getByRole('combobox', { name: /^Delegação/ }).selectOption({ label: 'Itália' });
	await assumir.getByRole('button', { name: 'Assumir' }).click();
	await expect(assumir).toContainText('Você está no lugar de Itália.');

	await assumir.getByRole('link', { name: 'Agir pela delegação' }).click();
	await aoVivo(page);
	await expect(page.getByRole('note').filter({ hasText: 'Pela mesa' })).toContainText('Itália');
	await page.getByRole('button', { name: 'Levantar placa' }).click();
	await expect(page.getByRole('button', { name: 'Baixar placa' })).toBeVisible();

	await page.goto(PAINEL);
	await aoVivo(page);
	const fila = page.getByRole('region', { name: 'Pedidos de fala' });
	await expect(fila.getByRole('listitem').filter({ hasText: 'Itália' })).toContainText('pela mesa');

	await page.getByRole('region', { name: 'Assumir uma delegação' }).getByRole('button', { name: 'Deixar' }).click();
	await expect(page.getByRole('region', { name: 'Assumir uma delegação' }).getByRole('button', { name: 'Assumir' })).toBeVisible();
	await page.goto('/comite/CE-T/sessao');
	await expect(page.getByRole('button', { name: 'Levantar placa' })).toHaveCount(0);
});
