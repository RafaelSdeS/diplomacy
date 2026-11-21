import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { clienteComo, entrar } from './ajuda.ts';

// Passo 23: depois de encerrada, todos veem como cada delegação votou.
// Usa o comitê em inglês de teste (UNOCT-T, 5 delegações), que nenhum outro teste
// abre em sessão: a França vota pelo app, e a mesa registra o voto de placa do Brasil.
const MESA = 'unoct-mesa@exemplo.test';
const FRANCA = 'unoct-france@exemplo.test';
const OBJETO = `Test vote ${Date.now()}`;

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a sessão do comitê de teste é uma só');
});

async function comiteComMesa() {
	const mesa = await clienteComo(MESA);
	const comite = (await mesa.from('comite').select('id').eq('sigla', 'UNOCT-T').single()).data!.id;
	return { mesa, comite };
}

test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const { mesa, comite } = await comiteComMesa();
	const estado = await mesa.from('estado_sessao').select('sessao_id').eq('comite_id', comite).maybeSingle();
	if (!estado.data?.sessao_id) expect((await mesa.rpc('abrir_sessao', { p_comite: comite })).error).toBeNull();
	expect((await mesa.rpc('marcar_todas_presentes', { p_comite: comite })).error).toBeNull();
	const votacao = await mesa.rpc('abrir_votacao_livre', { p_comite: comite, p_objeto: OBJETO });
	expect(votacao.error).toBeNull();
	const brasil = (await mesa.from('delegacao').select('id').eq('comite_id', comite).eq('nome', 'Brazil').single()).data!.id;
	expect((await (await clienteComo(FRANCA)).rpc('votar', { p_votacao: votacao.data!, p_escolha: 'a_favor' })).error).toBeNull();
	expect((await mesa.rpc('registrar_voto', { p_votacao: votacao.data!, p_delegacao: brasil, p_escolha: 'contra' })).error).toBeNull();
	expect((await mesa.rpc('encerrar_votacao', { p_votacao: votacao.data! })).error).toBeNull();
});

test.afterAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const { mesa, comite } = await comiteComMesa();
	await mesa.rpc('encerrar_sessao', { p_comite: comite });
});

// Primeiro, porque a grade só fica 30 s no telão.
test('o telão mantém a grade de votos logo depois de encerrada', async ({ page }) => {
	await entrar(page, MESA);
	await page.goto('/telao/UNOCT-T');
	const grade = page.getByRole('complementary', { name: 'Vote' });
	await expect(grade).toContainText(OBJETO);
	await expect(grade.getByRole('listitem').filter({ hasText: 'Japan' })).toContainText('Did not vote');
});

test('o resultado mostra quem votou a favor, contra e quem não votou', async ({ page }) => {
	await entrar(page, FRANCA);
	await page.goto('/comite/UNOCT-T/sessao');
	const ultima = page.getByRole('article', { name: 'Last vote' });
	await expect(ultima).toContainText(OBJETO);
	await expect(ultima.getByRole('list', { name: 'In favour (1)' })).toHaveText(/France/);
	await expect(ultima.getByRole('list', { name: 'Against (1)' })).toHaveText(/Brazil/);
	await expect(ultima.getByRole('list', { name: 'Did not vote (3)' })).toContainText('Japan');

	await expect(page.getByRole('region', { name: 'Votes in this session' })).toContainText(OBJETO);
});

test('o histórico do comitê lista a votação com o mesmo agrupamento', async ({ page }) => {
	await entrar(page, FRANCA);
	await page.goto('/comite/UNOCT-T/votacoes');
	const votacao = page.locator('details', { hasText: OBJETO });
	await votacao.locator('summary').click();
	await expect(votacao.getByRole('list', { name: 'In favour (1)' })).toHaveText(/France/);
	await expect(votacao.getByRole('list', { name: 'Against (1)' })).toHaveText(/Brazil/);

	const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
	expect(violations).toEqual([]);
});
