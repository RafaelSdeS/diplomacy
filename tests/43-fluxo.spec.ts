import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { isolado } from '../scripts/delegacoes.ts';
import { clienteComo, comiteEmDebate, CONTAS, entrar, irPeloMenu } from './ajuda.ts';

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
	for (const nome of ['Com a palavra', 'Pedidos de fala', 'Para decidir']) {
		const caixa = await page.getByRole('region', { name: nome }).boundingBox();
		expect(caixa!.y, `${nome} começa na primeira tela`).toBeLessThan(altura - 100);
	}
	expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(2);
	// Passo 51 (lote 1): nem as colunas rolam; o que espera decisão é contagem no "Para decidir".
	const sobras = await page.locator('.painel > .painel-coluna').evaluateAll((colunas) => colunas.map((c) => c.scrollHeight - c.clientHeight));
	for (const sobra of sobras) expect(sobra).toBeLessThanOrEqual(2);
	// O raro fica recolhido, mas a um clique.
	await expect(page.getByLabel('Tempo de fala (segundos)')).toBeHidden();
	await page.getByRole('button', { name: 'Ajustes da fala e do debate' }).click();
	await expect(page.getByLabel('Tempo de fala (segundos)')).toBeVisible();
});

test('a Agora da mesa e a do delegado cabem na tela, sem rolar (passo 51, lote 2)', async ({ browser }, info) => {
	test.skip(info.project.name !== 'notebook', 'a regra de rolagem é do notebook');
	for (const conta of [MESA, EUA]) {
		const contexto = await browser.newContext({ viewport: { width: 1366, height: 768 } });
		const page = await contexto.newPage();
		await entrar(page, conta);
		await expect(page.getByRole('region', { name: 'No evento' })).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), conta).toBeLessThanOrEqual(2);
		await contexto.close();
	}
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

const semErrosDeAcessibilidade = async (page: Page) => {
	const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
	expect(violations).toEqual([]);
};

test('delegado: Documentos reúne o que se escreve, e o "Voltar" volta para lá', async ({ page }) => {
	await entrar(page, EUA);
	await irPeloMenu(page, 'Documentos');
	await expect(page.getByRole('heading', { level: 1, name: 'Documentos' })).toBeVisible();
	for (const nome of ['Seu DPO', 'Dos seus blocos', 'Cartas', 'Do comitê'])
		await expect(page.getByRole('region', { name: nome })).toBeVisible();
	// Passo 51: as ações da área em cartões, como na aba Comitê.
	await expect(page.getByRole('navigation', { name: 'Atalhos de documentos' }).getByRole('link')).toHaveText([/^\s*DPO/, /^\s*Blocos/, /^\s*Cartas/, /^\s*Caderno/]);
	await semErrosDeAcessibilidade(page);

	await page.getByRole('region', { name: 'Seu DPO' }).getByRole('link').first().click();
	await expect(page.getByRole('heading', { level: 1, name: 'Documento de posição oficial' })).toBeVisible();
	await page.getByRole('link', { name: '‹ Voltar para Documentos' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Documentos' })).toBeVisible();
});

test('mesa: Documentos começa pelo que espera a avaliação', async ({ page }, info) => {
	test.skip(info.project.name !== 'notebook', 'uma tela basta');
	await entrar(page, MESA);
	await irPeloMenu(page, 'Documentos');
	await expect(page.getByRole('region', { name: 'Para avaliar' })).toBeVisible();
	await expect(page.getByRole('region', { name: 'Seu DPO' })).toHaveCount(0);
});

test('no celular, "Mais" guarda o resto do menu, e o "Voltar" volta a ele', async ({ page }, info) => {
	test.skip(info.project.name !== 'celular', 'a barra de baixo é do celular');
	await entrar(page, EUA);
	const menu = page.getByRole('navigation', { name: 'Principal' });
	await expect(menu.getByRole('link')).toHaveText(['Agora', 'Sessão', 'Documentos', 'Mensagens', 'Mais']);
	await menu.getByRole('link', { name: 'Mais' }).click();
	await semErrosDeAcessibilidade(page);
	await page.getByRole('main').getByRole('link', { name: /^Cronograma/ }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Cronograma' })).toBeVisible();
	await expect(menu.getByRole('link', { name: 'Mais' })).toHaveAttribute('aria-current', 'true');
	await page.getByRole('link', { name: '‹ Voltar para Mais' }).click();
	await expect(page).toHaveURL('/mais');
});

test('"Ir para…" (Ctrl+K) acha a delegação, que abre a ficha, e a tela pelo nome', async ({ page }, info) => {
	test.skip(info.project.name !== 'notebook', 'uma tela basta');
	await entrar(page, MESA);
	await page.goto(PAINEL);
	await aoVivo(page);
	await page.keyboard.press('Control+K');
	const busca = page.getByRole('dialog', { name: 'Ir para…' });
	await expect(busca).toBeVisible();
	await semErrosDeAcessibilidade(page);
	await busca.getByRole('searchbox').fill('russia');
	await busca.getByRole('button', { name: 'Rússia' }).click();
	await expect(page.getByRole('dialog', { name: 'Rússia' })).toBeVisible();
	await expect(page).toHaveURL(PAINEL);
	await page.keyboard.press('Escape');

	await page.getByRole('button', { name: 'Ir para…' }).click();
	await busca.getByRole('searchbox').fill('crono');
	await busca.getByRole('searchbox').press('Enter');
	await expect(page.getByRole('heading', { level: 1, name: 'Cronograma' })).toBeVisible();
	await page.getByRole('link', { name: '‹ Voltar para Presidência' }).click();
	await expect(page).toHaveURL(PAINEL);
});
