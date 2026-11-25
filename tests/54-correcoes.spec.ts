import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { isolado } from '../scripts/delegacoes.ts';
import { comiteEmDebate, entrar } from './ajuda.ts';

// Passo 54: correções do uso de 24/11. A sessão usa a cópia do CE-T só deste arquivo.
const C = isolado('54');
const MESA = C.conta('mesa-ce@exemplo.test');
const ALEMANHA = C.conta('ce-alemanha@exemplo.test');
const SESSAO = `/comite/${C.sigla}/sessao`;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const { mesa, comite } = await comiteEmDebate(MESA, C.sigla, ALEMANHA);
	await mesa.rpc('baixar_todas_placas', { p_comite: comite });
});

const aoVivo = (page: Page) => expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });

test('a 1366 × 768, a placa e as placas levantadas ficam no cartão "A palavra"; a mesa vê uma coluna', async ({ page, browser }, info) => {
	test.skip(info.project.name !== 'notebook', 'a sessão do comitê de teste é uma só');
	await page.setViewportSize({ width: 1366, height: 768 });
	await entrar(page, ALEMANHA);
	await page.goto(SESSAO);
	await aoVivo(page);
	const palavra = page.getByRole('article', { name: 'A palavra' });
	await palavra.getByRole('button', { name: 'Levantar placa' }).click();
	await expect(palavra).toContainText('1ª na fila');
	await palavra.getByRole('button', { name: /^Placas levantadas/ }).click();
	await expect(page.getByRole('dialog', { name: 'Placas levantadas' })).toContainText('Alemanha');
	await page.keyboard.press('Escape');
	await palavra.getByRole('button', { name: 'Baixar placa' }).click();
	await expect(palavra.getByRole('button', { name: 'Levantar placa' })).toBeVisible();

	const mesa = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
	await entrar(mesa, MESA);
	await mesa.goto(SESSAO);
	await aoVivo(mesa);
	await expect(mesa.getByRole('link', { name: 'Painel da presidência' })).toBeVisible();
	// Sem delegação, uma coluna: "A palavra" ocupa a largura do conteúdo.
	const largura = (await mesa.getByRole('article', { name: 'A palavra' }).boundingBox())!.width;
	expect(largura).toBeGreaterThan(800);
	await mesa.context().close();
});

test('no telão, "Sair do telão" volta à sessão, e o clique nele não põe a tela cheia', async ({ page }, info) => {
	test.skip(info.project.name !== 'notebook', 'uma tela basta');
	await entrar(page, ALEMANHA);
	await page.goto(`/telao/${C.sigla}`);
	await aoVivo(page);
	await page.mouse.move(300, 300);
	await page.mouse.move(320, 320);
	await page.getByRole('button', { name: 'Sair do telão' }).click();
	await expect(page).toHaveURL(SESSAO);
	expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(false);
});

test('"Sobre o Diplomacy" abre sem login, com os créditos, e leva a "Meus dados"', async ({ page }, info) => {
	test.skip(info.project.name === 'telao', 'celular e notebook');
	await page.goto('/sobre');
	await expect(page.getByRole('heading', { level: 1, name: 'Sobre o Diplomacy' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Rafael Silva de Souza' })).toHaveAttribute('href', 'https://rafaelsdes.github.io/');
	await expect(page.getByRole('link', { name: 'Meus dados (LGPD)' })).toHaveAttribute('href', '/perfil/meus-dados');
	expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
