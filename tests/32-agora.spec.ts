import { expect, test } from '@playwright/test';
import { isolado } from '../scripts/delegacoes.ts';
import { comiteEmDebate, CONTAS, entrar } from './ajuda.ts';

// Passo 39: a cópia do CE-T só deste arquivo (scripts/delegacoes.ts).
const C = isolado('32');

// Passo 32: o Agora de cada papel. A sessão ao vivo usa o CE-T, levado ao debate.
const MESA = C.conta('mesa-ce@exemplo.test');
const ALEMANHA = C.conta('ce-alemanha@exemplo.test');

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const { mesa, comite } = await comiteEmDebate(MESA, C.sigla, ALEMANHA);
	await mesa.rpc('baixar_todas_placas', { p_comite: comite });
	await mesa.rpc('representar', { p_comite: comite, p_delegacao: null as unknown as string });
});

test('o delegado vê a sessão ao vivo no Agora e levanta a placa dali; a mesa vê a placa chegar', async ({ page, browser }, info) => {
	test.skip(info.project.name !== 'notebook', 'a sessão do comitê de teste é uma só');
	await entrar(page, ALEMANHA);
	const aoVivo = page.getByRole('article', { name: `Sessão ao vivo · ${C.sigla}` });
	await expect(aoVivo).toContainText(/Sessão \d+ · Debate/);
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	await aoVivo.getByRole('button', { name: 'Levantar placa' }).click();
	await expect(aoVivo).toContainText('Placa levantada');

	const mesa = await (await browser.newContext()).newPage();
	await entrar(mesa, MESA);
	await mesa.goto(`/comite/${C.sigla}/sessao/presidencia`);
	await expect(mesa.getByRole('region', { name: 'Placas levantadas' })).toContainText('Alemanha');
	await aoVivo.getByRole('button', { name: 'Baixar placa' }).click();
	await expect(aoVivo.getByRole('button', { name: 'Levantar placa' })).toBeVisible();
});

// Passo 54: esta mesa também é secretaria; o comitê não some por isso.
test('secretaria e mesa: a Agora mostra a mesa e a secretaria, e o menu leva ao painel', async ({ page }, info) => {
	test.skip(info.project.name !== 'notebook', 'uma tela basta');
	await entrar(page, MESA);
	const mesa = page.getByRole('article', { name: `Mesa · ${C.sigla}` });
	await expect(mesa).toContainText(/Sessão \d+ aberta/);
	await expect(mesa.getByRole('link', { name: 'Pedidos para o bureau' })).toBeVisible();
	await expect(page.getByRole('article', { name: 'Secretaria' }).getByRole('link', { name: 'Check-in' })).toBeVisible();
	await expect(page.getByRole('banner')).toContainText('Secretaria');
	await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Painel' }).click();
	await expect(page).toHaveURL(`/comite/${C.sigla}/sessao/presidencia`);
});

test('press e crise têm o seu cartão no Agora', async ({ page }, info) => {
	test.skip(info.project.name === 'telao', 'celular e notebook');
	await entrar(page, CONTAS.press);
	const press = page.getByRole('article', { name: 'Press' });
	await expect(press.getByRole('link', { name: 'Escrever' })).toBeVisible();

	await page.context().clearCookies();
	await page.evaluate(() => localStorage.clear());
	await entrar(page, CONTAS.crise);
	await expect(page.getByRole('article', { name: 'Crise · CSNU-T' })).toContainText('notas esperando resposta');
});
