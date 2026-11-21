import { expect, test, type Page } from '@playwright/test';
import { isolado } from '../scripts/delegacoes.ts';
import { clienteComo, comiteEmDebate, entrar } from './ajuda.ts';

// Passo 39: a cópia do CE-T só deste arquivo (scripts/delegacoes.ts).
const C = isolado('30');

// Passo 30: placas → lista curta → fala → "Há pontos ou moções?" → placas. Comitê CE-T.
const PAINEL = `/comite/${C.sigla}/sessao/presidencia`;
const MESA = C.conta('mesa-ce@exemplo.test');
const ALEMANHA = C.conta('ce-alemanha@exemplo.test');
const FRANCA = C.conta('ce-franca@exemplo.test');

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a sessão do comitê de teste é uma só');
});

test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const { mesa, comite } = await comiteEmDebate(MESA, C.sigla, ALEMANHA);
	// Começa no formal-informal, sem orador, sem pausa e sem placas.
	expect((await mesa.rpc('mudar_forma', { p_comite: comite, p_forma: 'formal_informal' })).error).toBeNull();
	expect((await mesa.rpc('encerrar_pausa', { p_comite: comite })).error).toBeNull();
	expect((await mesa.rpc('baixar_todas_placas', { p_comite: comite })).error).toBeNull();
	for (const conta of [ALEMANHA, FRANCA]) {
		expect((await (await clienteComo(conta)).rpc('levantar_placa', { p_comite: comite })).error).toBeNull();
	}
});

const aoVivo = (page: Page) => expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });

test('a presidência escolhe a lista curta, e a pausa para pontos e moções vem depois da fala', async ({ page, browser }) => {
	await entrar(page, MESA);
	await page.goto(PAINEL);
	await aoVivo(page);

	// Lista curta: França e Alemanha, nessa ordem.
	const fila = page.getByRole('region', { name: 'Pedidos de fala' });
	await fila.getByRole('button', { name: 'Escolher para a lista curta: França' }).click();
	await fila.getByRole('button', { name: 'Escolher para a lista curta: Alemanha' }).click();
	await expect(fila.getByRole('button', { name: 'Escolher para a lista curta: França' })).toHaveText('1º');
	await fila.getByRole('button', { name: 'Definir os próximos (2)' }).click();
	const proximos = page.getByRole('region', { name: 'Próximos' });
	await expect(proximos.getByRole('listitem')).toHaveText([/França/, /Alemanha/]);

	const telao = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
	await telao.clock.install();
	await entrar(telao, MESA);
	await telao.goto(`/telao/${C.sigla}`);
	// Antes de pular o relógio, o telão precisa ter medido a diferença para o servidor:
	// medida depois, ela desfaz o pulo (a grade ficaria mais 30 s reais).
	await aoVivo(telao);
	// A votação do tópico na preparação deixa a grade 30 s na tela (passo 23): o relógio pula.
	await telao.clock.fastForward(30_000);
	await expect(telao.getByRole('complementary', { name: 'Próximos oradores' }).getByRole('listitem').first()).toContainText('França');
	// O relógio do telão volta à hora certa: a pausa (abaixo) dura menos que os 30 s pulados.
	await telao.clock.setSystemTime(Date.now());

	const alemanha = await (await browser.newContext()).newPage();
	await entrar(alemanha, ALEMANHA);
	await alemanha.goto(`/comite/${C.sigla}/sessao`);
	await aoVivo(alemanha);
	await expect(alemanha.getByText('Sua delegação é a 2ª da lista curta.')).toBeVisible();

	// A França fala; ao encerrar, a pausa aparece no painel, no celular e no telão.
	await proximos.getByRole('button', { name: 'Dar a palavra a França' }).click();
	await expect(page.getByRole('region', { name: 'Com a palavra' })).toContainText('França');
	await page.getByRole('button', { name: 'Encerrar fala' }).click();
	await expect(page.getByRole('region', { name: 'Há pontos ou moções?' })).toBeVisible();
	await expect(telao.locator('.telao-pausa')).toHaveText('Há pontos ou moções?');
	const pausa = alemanha.getByRole('article', { name: 'Há pontos ou moções?' });
	await pausa.getByRole('button', { name: 'Fazer um ponto ou moção' }).click();
	await expect(alemanha.locator('#tipo-ponto')).toBeFocused();

	// A presidência encerra a pausa e baixa as placas.
	await page.getByRole('button', { name: 'Encerrar a pausa' }).click();
	await expect(page.getByRole('region', { name: 'Há pontos ou moções?' })).toHaveCount(0);
	await page.getByRole('button', { name: 'Baixar todas as placas' }).click();
	await expect(fila).toContainText('Nenhuma placa levantada.');
});
