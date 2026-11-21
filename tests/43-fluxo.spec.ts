import { expect, test, type Page } from '@playwright/test';
import { isolado } from '../scripts/delegacoes.ts';
import { clienteComo, comiteEmDebate, CONTAS, entrar } from './ajuda.ts';

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

test('do painel à chamada e de volta: o "Voltar" e a trilha levam ao Painel', async ({ page }, info) => {
	test.skip(info.project.name !== 'notebook', 'o painel é do notebook');
	await entrar(page, MESA);
	await page.goto(PAINEL);
	await aoVivo(page);
	await page.getByRole('link', { name: 'Chamada', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Chamada');
	// A trilha da mesa passa pelo Painel, não pela tela do delegado.
	await expect(page.getByRole('navigation', { name: 'Trilha' }).getByRole('link', { name: 'Painel' })).toHaveAttribute('href', PAINEL);
	await page.getByRole('link', { name: '‹ Voltar para Presidência' }).click();
	await expect(page).toHaveURL(PAINEL);
	await expect(page.getByRole('region', { name: 'Com a palavra' })).toBeVisible();
	// Por link direto não há de onde voltar: fica só a trilha.
	await page.goto(`/comite/${C.sigla}/sessao/chamada`);
	await expect(page.getByRole('link', { name: /^‹ Voltar/ })).toHaveCount(0);
});

test('no painel, o nome da delegação abre a ficha sem sair da tela', async ({ page }, info) => {
	test.skip(info.project.name !== 'notebook', 'o painel é do notebook');
	const eua = await clienteComo(EUA);
	const comite = (await eua.from('comite').select('id').eq('sigla', C.sigla).single()).data!.id;
	await eua.rpc('baixar_placa', { p_comite: comite });
	expect((await eua.rpc('levantar_placa', { p_comite: comite })).error).toBeNull();
	await entrar(page, MESA);
	await page.goto(PAINEL);
	await aoVivo(page);
	await page.getByRole('region', { name: 'Pedidos de fala' }).getByRole('button', { name: 'EUA', exact: true }).click();
	const ficha = page.getByRole('dialog', { name: 'EUA' });
	await expect(ficha).toBeVisible();
	await expect(ficha.getByRole('link', { name: 'Abrir a página da delegação' })).toBeVisible();
	await expect(page).toHaveURL(PAINEL);
	await page.keyboard.press('Escape');
	await expect(ficha).toBeHidden();
	await expect(page.getByRole('region', { name: 'Com a palavra' })).toBeVisible();
});
