import { expect, test } from '@playwright/test';
import { contaDaDelegacao } from '../scripts/delegacoes.ts';
import { clienteComo, CONTAS, entrar } from './ajuda.ts';

// Passo 24: os EUA bloqueiam os bilhetes do Irã; o Irã fica sabendo; o desbloqueio
// libera de novo. Comitê CSNU-T, só mensagens (não mexe na sessão).
const MENSAGENS = '/comite/CSNU-T/mensagens';
const EUA = CONTAS.delegado;
const IRA = contaDaDelegacao('Irã');

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'os bloqueios do comitê de teste são um só conjunto');
});

// Banco reaproveitado: começa sem bloqueio entre os dois.
test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const eua = await clienteComo(EUA);
	const comite = (await eua.from('comite').select('id').eq('sigla', 'CSNU-T').single()).data!.id;
	const ira = (await eua.from('delegacao').select('id').eq('comite_id', comite).eq('nome', 'Irã').single()).data!.id;
	expect((await eua.rpc('bloquear_bilhetes', { p_comite: comite, p_delegacao: ira, p_bloquear: false })).error).toBeNull();
});

test('os EUA bloqueiam o Irã, que fica sabendo e não consegue escrever; o desbloqueio libera', async ({ page, browser }) => {
	await entrar(page, EUA);
	await page.goto(MENSAGENS);
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	const bloqueios = page.getByRole('region', { name: 'Bloqueios' });
	await bloqueios.getByRole('combobox', { name: /^Delegação/ }).selectOption({ label: 'Irã' });
	await bloqueios.getByRole('button', { name: 'Bloquear bilhetes desta delegação' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Bilhetes de Irã bloqueados.' })).toBeVisible();
	await expect(bloqueios.getByRole('button', { name: 'Desbloquear Irã' })).toBeVisible();

	const ira = await (await browser.newContext()).newPage();
	await entrar(ira, IRA);
	await ira.goto(MENSAGENS);
	await expect(ira.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	await expect(ira.getByRole('list', { name: 'Não aceitam bilhetes da sua delegação' })).toContainText('EUA');
	const para = ira.getByRole('form', { name: 'Novo bilhete' }).getByRole('combobox', { name: /^Para/ });
	await expect(para.locator('option', { hasText: 'EUA' })).toBeDisabled();
	await expect(para.locator('option', { hasText: 'EUA' })).toContainText('não aceita seus bilhetes');

	// O desbloqueio chega ao Irã ao vivo, e o bilhete passa.
	await bloqueios.getByRole('button', { name: 'Desbloquear Irã' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Bilhetes de Irã desbloqueados.' })).toBeVisible();
	await expect(para.locator('option', { hasText: 'EUA' })).toBeEnabled();
	await para.selectOption({ label: 'EUA' });
	await ira.getByRole('form', { name: 'Novo bilhete' }).getByLabel('Bilhete').fill('Podemos conversar no intervalo?');
	await ira.getByRole('button', { name: 'Enviar bilhete' }).click();
	await expect(ira.getByRole('status').filter({ hasText: 'Bilhete enviado.' })).toBeVisible();
});
