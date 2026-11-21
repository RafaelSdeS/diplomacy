import { expect, test, type Page } from '@playwright/test';
import { isolado } from '../scripts/delegacoes.ts';
import { comiteEmDebate, CONTAS, entrar } from './ajuda.ts';

// Passo 43: fácil de achar, fácil de voltar, sem rolar. Os testes medem tarefas
// (cliques, o que está na primeira tela, para onde o "Voltar" leva), não a aparência.
const C = isolado('43');
const MESA = C.conta(CONTAS.mesa);
const EUA = C.conta(CONTAS.delegado);
const PAINEL = `/comite/${C.sigla}/sessao/presidencia`;

const aoVivo = (page: Page) => expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });

test.describe.configure({ mode: 'serial' });
test.beforeAll(async ({}, info) => {
	if (info.project.name === 'notebook') await comiteEmDebate(MESA, C.sigla, EUA);
});

test('no notebook, o painel da presidência cabe na tela: a página não rola', async ({ page }, info) => {
	test.skip(info.project.name !== 'notebook', 'o painel é do notebook');
	await entrar(page, MESA);
	await page.goto(PAINEL);
	await aoVivo(page);
	const altura = page.viewportSize()!.height;
	for (const nome of ['Com a palavra', 'Pedidos de fala', 'Pontos e moções']) {
		const caixa = await page.getByRole('region', { name: nome }).boundingBox();
		expect(caixa!.y, `${nome} começa na primeira tela`).toBeLessThan(altura - 100);
	}
	expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(2);
	// O raro fica recolhido, mas a um clique.
	await expect(page.getByLabel('Tempo de fala (segundos)')).toBeHidden();
	await page.locator('summary', { hasText: 'Ajustes da fala e do debate' }).click();
	await expect(page.getByLabel('Tempo de fala (segundos)')).toBeVisible();
});

test('a faixa mostra a bandeira e o nome da delegação de quem entrou', async ({ page }, info) => {
	await entrar(page, EUA);
	const faixa = page.getByRole('banner');
	const identidade = faixa.getByRole('link', { name: /EUA/ });
	await expect(identidade).toContainText(C.sigla);
	await expect(identidade.locator('img.bandeira')).toHaveAttribute('src', /\/us[.-]/);
	// No celular o nome cede lugar à bandeira e à sigla.
	if (info.project.name === 'celular') await expect(identidade.getByText('EUA')).toBeHidden();
	else await expect(identidade.getByText('EUA')).toBeVisible();
});
