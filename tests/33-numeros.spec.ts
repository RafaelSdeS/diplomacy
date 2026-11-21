import { expect, test } from '@playwright/test';
import { isolado } from '../scripts/delegacoes.ts';
import AxeBuilder from '@axe-core/playwright';
import { clienteComo, comiteEmDebate, entrar } from './ajuda.ts';

// Passo 39: a cópia do CE-T só deste arquivo (scripts/delegacoes.ts).
const C = isolado('33');

// Passo 33: os números abrem o que contam. CE-T em debate, com uma votação aberta.
const MESA = C.conta('mesa-ce@exemplo.test');
const ALEMANHA = C.conta('ce-alemanha@exemplo.test');
let votacao = '';

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a sessão do comitê de teste é uma só');
});

test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const { mesa, comite } = await comiteEmDebate(MESA, C.sigla, ALEMANHA);
	const aberta = await mesa.from('votacao').select('id').eq('comite_id', comite).eq('aberta', true).maybeSingle();
	if (aberta.data) await mesa.rpc('encerrar_votacao', { p_votacao: aberta.data.id });
	votacao = (await mesa.rpc('abrir_votacao_livre', { p_comite: comite, p_objeto: `Números ${Date.now()}` })).data!;
	expect((await (await clienteComo(ALEMANHA)).rpc('votar', { p_votacao: votacao, p_escolha: 'a_favor' })).error).toBeNull();
});

test.afterAll(async ({}, info) => {
	if (info.project.name !== 'notebook' || !votacao) return;
	await (await clienteComo(MESA)).rpc('encerrar_votacao', { p_votacao: votacao });
});

test('no painel, "presentes" e "votaram" abrem quem está e quem falta', async ({ page }) => {
	await entrar(page, MESA);
	await page.goto(`/comite/${C.sigla}/sessao/presidencia`);
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });

	const presentes = page.locator('details.contagem', { hasText: /^Presentes: \d+ de 5/ });
	await presentes.locator('summary').click();
	await expect(presentes.getByRole('link', { name: 'Alemanha · presente' })).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(presentes.getByRole('link', { name: 'Alemanha · presente' })).toBeHidden();

	// Pelo teclado: o foco no número e Enter abrem a lista.
	const votaram = page.locator('details.contagem', { hasText: /^1 de \d+ votaram/ });
	await votaram.locator('summary').focus();
	await page.keyboard.press('Enter');
	await expect(votaram.getByRole('link', { name: 'Alemanha · A favor' })).toBeVisible();
	await expect(votaram.getByRole('link', { name: 'França · falta votar' })).toBeVisible();

	const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
	expect(violations).toEqual([]);
});
