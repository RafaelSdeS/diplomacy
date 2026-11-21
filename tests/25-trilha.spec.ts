import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONTAS, entrar } from './ajuda.ts';

// Passo 25: toda subtela tem o caminho de volta, sem depender do botão do navegador.
test('no notebook, a trilha mostra os níveis e leva de volta', async ({ page, browser }, info) => {
	test.skip(info.project.name !== 'notebook', 'o celular tem o próprio teste');
	// Passo 43: para a mesa, as telas da sessão ficam sob o Painel, que é onde ela trabalha.
	await entrar(page, CONTAS.mesa);
	await page.goto('/comite/CSNU-T/sessao/agenda');
	const trilha = page.getByRole('navigation', { name: 'Trilha' });
	await expect(trilha.getByRole('link')).toHaveText([/CSNU-T/, /Painel/]);

	const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
	expect(violations).toEqual([]);

	await trilha.getByRole('link', { name: /Painel/ }).click();
	await expect(page).toHaveURL('/comite/CSNU-T/sessao/presidencia');
	await expect(page.getByRole('navigation', { name: 'Trilha' }).getByRole('link')).toHaveText([/CSNU-T/]);

	// O delegado continua voltando à tela da sessão.
	const delegado = await (await browser.newContext()).newPage();
	await entrar(delegado, CONTAS.delegado);
	await delegado.goto('/comite/CSNU-T/sessao/agenda');
	await delegado.getByRole('navigation', { name: 'Trilha' }).getByRole('link', { name: /Sessão/ }).click();
	await expect(delegado).toHaveURL('/comite/CSNU-T/sessao');
	await expect(delegado.getByRole('navigation', { name: 'Trilha' })).toHaveCount(0); // tela do menu

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
	await expect(trilha.getByRole('link', { name: /Painel/ })).toHaveText(/‹\s*Painel/);
	await trilha.getByRole('link', { name: /Painel/ }).click();
	await expect(page).toHaveURL('/comite/CSNU-T/sessao/presidencia');
});
