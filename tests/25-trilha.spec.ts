import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONTAS, entrar } from './ajuda.ts';

// Passo 25: toda subtela tem o caminho de volta, sem depender do botão do navegador.
test('no notebook, a trilha mostra os níveis e leva de volta', async ({ page }, info) => {
	test.skip(info.project.name !== 'notebook', 'o celular tem o próprio teste');
	await entrar(page, CONTAS.mesa);
	await page.goto('/comite/CSNU-T/sessao/presidencia');
	const trilha = page.getByRole('navigation', { name: 'Trilha' });
	await expect(trilha.getByRole('link')).toHaveText([/CSNU-T/, /Sessão/]);

	const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
	expect(violations).toEqual([]);

	await trilha.getByRole('link', { name: /Sessão/ }).click();
	await expect(page).toHaveURL('/comite/CSNU-T/sessao');
	await expect(page.getByRole('navigation', { name: 'Trilha' })).toHaveCount(0); // tela do menu

	await page.goto('/comite/CSNU-T/regras');
	await page.getByRole('navigation', { name: 'Trilha' }).getByRole('link', { name: /CSNU-T/ }).click();
	await expect(page).toHaveURL('/comite/CSNU-T');
});

test('no celular, só o nível de cima, com "‹"', async ({ page }, info) => {
	test.skip(info.project.name !== 'celular', 'o notebook tem o próprio teste');
	await entrar(page, CONTAS.mesa);
	await page.goto('/comite/CSNU-T/sessao/agenda');
	const trilha = page.getByRole('navigation', { name: 'Trilha' });
	await expect(trilha.getByRole('link', { name: /CSNU-T/ })).toBeHidden();
	await expect(trilha.getByRole('link', { name: /Sessão/ })).toHaveText(/‹\s*Sessão/);
	await trilha.getByRole('link', { name: /Sessão/ }).click();
	await expect(page).toHaveURL('/comite/CSNU-T/sessao');
});
