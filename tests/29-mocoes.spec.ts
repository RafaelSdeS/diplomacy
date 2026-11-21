import { expect, test, type Page } from '@playwright/test';
import { isolado } from '../scripts/delegacoes.ts';
import { clienteComo, comiteEmDebate, entrar } from './ajuda.ts';

// Passo 39: a cópia do CE-T só deste arquivo (scripts/delegacoes.ts).
const C = isolado('29');

// Passo 29: o pedido passa pelo bureau antes da presidência. O caminho completo, com a
// delegação que preside concedendo, está no teste do passo 06; aqui, a recusa com
// motivo e o telão. Comitê CE-T, com uma delegação na presidência.
const MESA = C.conta('mesa-ce@exemplo.test');
const ALEMANHA = C.conta('ce-alemanha@exemplo.test');

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a sessão do comitê de teste é uma só');
});

test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const { mesa, comite } = await comiteEmDebate(MESA, C.sigla, ALEMANHA);
	// Uma delegação na presidência: sorteia o rodízio e reabre a sessão no debate.
	const presidencia = await mesa.from('estado_sessao').select('sessao(presidencia_delegacao_id)').eq('comite_id', comite).single();
	if (!presidencia.data?.sessao?.presidencia_delegacao_id) {
		expect((await mesa.rpc('sortear_presidencia', { p_comite: comite })).error).toBeNull();
		expect((await mesa.rpc('abrir_sessao', { p_comite: comite })).error).toBeNull();
		expect((await mesa.rpc('marcar_todas_presentes', { p_comite: comite })).error).toBeNull();
	}
});

const aoVivo = (page: Page) => expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });

test('o bureau recusa um pedido com motivo, e o delegado vê a etapa e o motivo', async ({ page, browser }) => {
	const delegada = await (await browser.newContext()).newPage();
	await entrar(delegada, ALEMANHA);
	await delegada.goto(`/comite/${C.sigla}/sessao`);
	await aoVivo(delegada);
	await delegada.getByLabel('Tipo').selectOption({ label: 'Moção de informal-informal' });
	await delegada.getByLabel(/^Minutos \(até/).fill('10');
	await delegada.getByRole('button', { name: 'Enviar à mesa' }).click();
	await expect(delegada.getByRole('status').filter({ hasText: 'enviado à mesa' })).toBeVisible();
	const meus = delegada.getByRole('list', { name: 'Seus pontos e moções' });
	await expect(meus.getByRole('listitem').last()).toContainText('Aguardando o bureau');

	// O telão mostra o pedido em análise.
	const telao = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
	await entrar(telao, MESA);
	await telao.goto(`/telao/${C.sigla}`);
	await expect(telao.locator('.telao-analise')).toContainText('Alemanha');

	await entrar(page, MESA);
	await page.goto(`/comite/${C.sigla}/sessao/presidencia`);
	await aoVivo(page);
	const julgar = page.getByRole('region', { name: 'Bureau · pedidos para aprovar' });
	const nome = 'Moção de informal-informal: 10 minutos';
	await julgar.getByRole('textbox', { name: `Motivo da recusa: ${nome}` }).last().fill('Fora de hora');
	await julgar.getByRole('button', { name: `Fora de ordem: ${nome}, Alemanha` }).last().click();
	await expect(meus.getByRole('listitem').last()).toContainText('Recusado: Fora de hora');
});

test('a delegação retira o próprio pedido enquanto ele espera (passo 38)', async ({ page }) => {
	await entrar(page, ALEMANHA);
	await page.goto(`/comite/${C.sigla}/sessao`);
	await aoVivo(page);
	await page.getByLabel('Tipo').selectOption({ label: 'Ponto de dúvida' });
	await page.getByRole('button', { name: 'Enviar à mesa' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'enviado à mesa' })).toBeVisible();
	const ultimo = page.getByRole('list', { name: 'Seus pontos e moções' }).getByRole('listitem').last();
	await ultimo.getByRole('button', { name: 'Retirar' }).click();
	await expect(ultimo).toContainText('Retirado');
	await expect(ultimo.getByRole('button', { name: 'Retirar' })).toHaveCount(0);
});

test.afterAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	// Deixa a fila do bureau limpa para os outros testes do comitê.
	const mesa = await clienteComo(MESA);
	const comite = (await mesa.from('comite').select('id').eq('sigla', C.sigla).single()).data!.id;
	const abertos = await mesa.from('ponto_mocao').select('id').eq('comite_id', comite).eq('status', 'aberto').is('aprovado_bureau', null);
	for (const p of abertos.data ?? []) await mesa.rpc('julgar_ponto', { p_ponto: p.id, p_em_ordem: false });
});
