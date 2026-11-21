import { expect, test, type Page } from '@playwright/test';
import { isolado } from '../scripts/delegacoes.ts';
import { clienteComo, comiteEmDebate, entrar } from './ajuda.ts';

// Passo 39: a cópia do CE-T só deste arquivo (scripts/delegacoes.ts).
const C = isolado('28');

// Passo 28: dois cronômetros. Dar a palavra não apaga o tempo do debate; o
// informal-informal esgotado oferece a volta ao formal-informal. Comitê CE-T.
const PAINEL = `/comite/${C.sigla}/sessao/presidencia`;
const MESA = C.conta('mesa-ce@exemplo.test');
const ALEMANHA = C.conta('ce-alemanha@exemplo.test');

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a sessão do comitê de teste é uma só');
});

test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	await comiteEmDebate(MESA, C.sigla, ALEMANHA);
});

const aoVivo = (page: Page) => expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });

test('o tempo do debate segue contando quando alguém recebe a palavra', async ({ page }) => {
	await entrar(page, MESA);
	await page.goto(PAINEL);
	await aoVivo(page);
	const formulario = page.getByRole('form', { name: 'Forma de debate' });
	await formulario.getByRole('combobox', { name: /^Forma de debate/ }).selectOption('formal_informal');
	await formulario.getByLabel('Minutos (opcional)').fill('20');
	await formulario.getByRole('button', { name: 'Mudar a forma de debate' }).click();
	const debate = page.locator('.relogio-debate');
	await expect(debate).toContainText('tempo do debate');
	await expect(debate.locator('[data-cronometro]')).toHaveText(/^(20:00|19:5\d)$/);

	// A Alemanha levanta a placa e recebe a palavra: o relógio do debate continua.
	const alemanha = await clienteComo(ALEMANHA);
	const comite = (await alemanha.from('comite').select('id').eq('sigla', C.sigla).single()).data!.id;
	expect((await alemanha.rpc('levantar_placa', { p_comite: comite })).error).toBeNull();
	await page.getByRole('button', { name: 'Dar a palavra a Alemanha' }).first().click();
	await expect(page.getByRole('region', { name: 'Com a palavra' })).toContainText('Alemanha');
	await expect(debate.locator('[data-cronometro]')).toHaveText(/^(20:00|19:[0-5]\d)$/);

	// Valor rápido do tempo de fala, aplicado na hora.
	await page.getByRole('group', { name: 'Tempos rápidos' }).getByRole('button', { name: '60 s' }).click();
	await expect(page.getByLabel('Tempo de fala (segundos)')).toHaveValue('60');
});

test('o informal-informal esgotado oferece a volta ao formal-informal', async ({ page }) => {
	await page.clock.install();
	await entrar(page, MESA);
	await page.goto(PAINEL);
	await aoVivo(page);
	const formulario = page.getByRole('form', { name: 'Forma de debate' });
	await formulario.getByRole('combobox', { name: /^Forma de debate/ }).selectOption('informal_informal');
	await formulario.getByLabel(/^Minutos \(até/).fill('1');
	await formulario.getByRole('button', { name: 'Mudar a forma de debate' }).click();
	await expect(page.locator('.relogio-debate')).toContainText('Informal-informal');

	await page.clock.fastForward(65_000);
	const esgotado = page.getByRole('region', { name: 'Tempo do informal-informal esgotado' });
	await esgotado.getByRole('button', { name: 'Voltar ao formal-informal' }).click();
	await expect(esgotado).toHaveCount(0);
	await expect(page.getByText(/Formal-informal ·|· Formal-informal/).first()).toBeVisible();
	// No servidor o informal durou segundos (o relógio adiantado é só do navegador): desconta 0 ou 1.
	await expect(page.getByText(/^Informal-informal encerrado nesta sessão: [01] de 45 min$/)).toBeVisible();
});
