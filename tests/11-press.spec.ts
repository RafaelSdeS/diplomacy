import { expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contaDaDelegacao } from '../scripts/delegacoes.ts';
import { clienteComo, CONTAS, entrar } from './ajuda.ts';

const CAPA = '/press';
const TITULO = `Brasil propõe cessar-fogo ${Date.now()}`;
const URGENTE = `Explosão no porto de Áden ${Date.now()}`;
// Um PNG de 1 × 1 pixel.
const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
	'base64'
);

// A matéria passa da press para a capa, o telão e a moderação: roda em série, num projeto só.
test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'o fluxo da press roda num projeto só');
});

async function abrir(browser: Browser, conta: string, rota: string, viewport?: { width: number; height: number }) {
	const contexto = await browser.newContext(viewport ? { viewport, isMobile: viewport.width < 500 } : {});
	const page = await contexto.newPage();
	await entrar(page, conta);
	await page.goto(rota);
	return page;
}

const aoVivo = (page: Page) => expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });

async function semErrosDeAcessibilidade(page: Page) {
	const { violations } = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(violations).toEqual([]);
}

let materia = '';

test('a matéria publicada no celular chega à capa sem recarregar, e a delegação citada vê na Agora', async ({ browser }) => {
	const leitor = await abrir(browser, CONTAS.delegado, CAPA);
	await aoVivo(leitor);

	const press = await abrir(browser, CONTAS.press, '/press/escrever', { width: 360, height: 740 });
	await press.getByLabel('Título').fill(TITULO);
	await press
		.getByLabel(/^Texto/)
		.fill('O Brasil propôs um cessar-fogo. "Que merda de proposta", disse um diplomata.\n\nO debate continua.');
	// O aviso de palavrão não bloqueia a publicação.
	await expect(press.getByText(/^Atenção: o texto tem palavras/)).toContainText('(merda)');
	await press.getByLabel('Imagem (opcional)').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: PNG });
	await press.getByLabel(/^Descrição da imagem/).fill('Plenário do Conselho');
	await press.getByRole('group', { name: 'Delegações citadas' }).getByLabel('Brasil', { exact: true }).check();
	await press.getByRole('button', { name: 'Publicar' }).click();

	await expect(press).toHaveURL(/\/press\/CSNU-T\?n=/);
	const aberta = press.getByRole('article', { name: TITULO });
	await expect(aberta).toContainText('O debate continua.');
	await expect(aberta).toContainText('Cita: Brasil');
	await expect(aberta.getByRole('img', { name: 'Plenário do Conselho' })).toBeVisible();
	materia = new URL(press.url()).pathname + new URL(press.url()).search;

	await expect(leitor.getByRole('region', { name: 'Manchetes' })).toContainText(TITULO, { timeout: 10_000 });

	const brasil = await abrir(browser, contaDaDelegacao('Brasil'), '/');
	await expect(brasil.getByRole('article', { name: 'Na press' })).toContainText(TITULO);
	await Promise.all([leitor, press, brasil].map((p) => p.context().close()));
});

test('uma nota urgente vira plantão no telão do comitê', async ({ browser }) => {
	const telao = await abrir(browser, CONTAS.mesa, '/telao/CSNU-T', { width: 1920, height: 1080 });
	await aoVivo(telao);

	const press = await clienteComo(CONTAS.press);
	const veiculo = (await press.from('veiculo').select('id, comite!inner(sigla)').eq('comite.sigla', 'CSNU-T').single()).data!;
	const { error } = await press.rpc('publicar_noticia', {
		p_id: crypto.randomUUID(),
		p_veiculo: veiculo.id,
		p_tipo: 'nota_urgente',
		p_titulo: URGENTE,
		p_texto: 'Fontes relatam uma explosão no porto.'
	});
	expect(error).toBeNull();

	const plantao = telao.getByRole('status').filter({ hasText: URGENTE });
	await expect(plantao).toContainText('Plantão da press · Al Jazeera', { timeout: 10_000 });
	await telao.context().close();
});

test('denunciada, a matéria é ocultada pela Diretoria da Press e some para os delegados', async ({ browser }) => {
	const eua = await abrir(browser, CONTAS.delegado, materia);
	await eua.getByText('Denunciar', { exact: true }).click();
	await eua.getByLabel('Motivo da denúncia').fill('Linguagem ofensiva.');
	await eua.getByRole('button', { name: 'Enviar denúncia' }).click();
	await expect(eua.getByRole('status')).toHaveText('Denúncia enviada à Diretoria da Press.');

	const diretoria = await abrir(browser, CONTAS.secretaria, materia);
	await expect(diretoria.getByRole('region', { name: 'Denúncias (1)' })).toContainText('Linguagem ofensiva.');
	await diretoria.getByLabel('Motivo da ocultação').fill('Fere o decoro.');
	await diretoria.getByRole('button', { name: 'Ocultar notícia' }).click();
	await diretoria.getByRole('dialog').getByRole('button', { name: 'Ocultar notícia' }).click();
	await expect(diretoria.getByRole('status')).toHaveText('Notícia ocultada.');
	await expect(diretoria.getByRole('note', { name: 'Motivo da ocultação' })).toHaveText('Fere o decoro.');

	await eua.goto(CAPA);
	await aoVivo(eua);
	await expect(eua.getByRole('region', { name: 'Manchetes' })).not.toContainText(TITULO);
	await Promise.all([eua, diretoria].map((p) => p.context().close()));
});

for (const tema of ['light', 'dark'] as const) {
	test(`as telas da press não têm erros de acessibilidade (tema ${tema})`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: tema });
		await entrar(page, CONTAS.press);
		for (const rota of [CAPA, '/press/CSNU-T', materia, '/press/escrever']) {
			await page.goto(rota);
			await expect(page.locator('main h1')).toBeVisible();
			await semErrosDeAcessibilidade(page);
		}
	});
}
