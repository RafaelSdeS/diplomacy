import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { isolado } from '../scripts/delegacoes.ts';
import { clienteComo, entrar } from './ajuda.ts';

// Passo 57 (parte A): o documento se lê como o final e se escreve no lugar; a posição custa um
// toque; as assinaturas ficam à vista. A cópia do CE-T só deste arquivo.
const C = isolado('57');
const ALEMANHA = C.conta('ce-alemanha@exemplo.test'); // redatora
const FRANCA = C.conta('ce-franca@exemplo.test');
const marca = Date.now();
let documento = '';

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'o documento de teste é um só');
});

test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const alemanha = await clienteComo(ALEMANHA);
	const franca = await clienteComo(FRANCA);
	const comite = (await alemanha.from('comite').select('id').eq('sigla', C.sigla).single()).data!.id;
	const bloco = (await alemanha.rpc('criar_bloco', { p_comite: comite, p_nome: `Bloco do Mosela ${marca}` })).data!;
	expect((await franca.rpc('entrar_bloco', { p_bloco: bloco })).error).toBeNull();
	// Passo 63: o editor do bloco fica para a resolução de crise (sem tópico, só pela API).
	documento = (await alemanha.rpc('criar_documento', { p_bloco: bloco, p_tipo: 'resolucao_crise', p_titulo: `Rio Mosela ${marca}` })).data!;
	for (const texto of ['Decide A', 'Pede C'])
		expect((await alemanha.rpc('adicionar_clausula', { p_documento: documento, p_tipo: 'operativa', p_texto: texto })).error).toBeNull();
});

async function abrir(browser: import('@playwright/test').Browser, conta: string, viewport = { width: 1366, height: 768 }) {
	const page = await (await browser.newContext({ viewport })).newPage();
	await entrar(page, conta);
	await page.goto(`/documento/${documento}`);
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	return page;
}
const folha = (page: Page) => page.getByRole('article', { name: 'Documento formatado' });

test('a redatora insere no meio e edita no lugar; a França vê, marca ressalva e comenta; a redatora resolve', async ({ browser }) => {
	const alemanha = await abrir(browser, ALEMANHA);
	const franca = await abrir(browser, FRANCA);

	// Inserir depois da operativa 1, já em edição.
	await alemanha.getByRole('button', { name: /^Operativa 1 Decide A/ }).hover();
	await alemanha.getByRole('group', { name: 'Inserir depois de Operativa 1' }).getByRole('button', { name: 'Operativa', exact: true }).click();
	const nova = alemanha.getByLabel(/^Nova cláusula/);
	await nova.fill('Insta B');
	await nova.press('Enter');
	await expect(folha(alemanha)).toContainText('2. Insta B;');
	await alemanha.getByLabel(/^Nova cláusula/).press('Escape');

	// Editar no lugar: um clique, Enter salva.
	await alemanha.getByRole('button', { name: /^Operativa 3 Pede C/ }).click();
	const edicao = alemanha.getByLabel('Texto de Operativa 3');
	await edicao.fill('Pede C e D');
	await edicao.press('Enter');
	await expect(folha(alemanha)).toContainText('3. Pede C e D.');

	// A França vê sem recarregar, marca ressalva e diz o porquê.
	await expect(folha(franca)).toContainText('2. Insta B;', { timeout: 10_000 });
	await franca.getByRole('button', { name: /^Operativa 2 Insta B/ }).click();
	const painel = franca.getByRole('region', { name: 'Operativa 2' });
	await painel.getByRole('group', { name: 'Sua posição' }).getByRole('button', { name: 'Ressalva' }).click();
	await expect(painel.getByRole('group', { name: 'Sua posição' }).getByRole('button', { name: 'Ressalva' })).toHaveAttribute('aria-pressed', 'true');
	await painel.getByPlaceholder('Diga o porquê (opcional)').fill('Falta o prazo');
	await painel.getByRole('button', { name: 'Comentar' }).click();
	await expect(painel).toContainText('Falta o prazo');
	const { violations } = await new AxeBuilder({ page: franca }).include('.documento-vivo').analyze();
	expect(violations).toEqual([]);

	// A redatora vê a ressalva e o aviso de novidade, e resolve.
	const bloco2 = alemanha.locator('.bloco-clausula', { has: alemanha.getByRole('button', { name: /^Operativa 2 Insta B/ }) });
	await expect(bloco2).toContainText('Ressalva 1', { timeout: 10_000 });
	await expect(alemanha.getByRole('status').filter({ hasText: 'comentários novos' })).toBeVisible();
	await alemanha.getByRole('button', { name: /^Operativa 2 Insta B/ }).click();
	await alemanha.getByRole('region', { name: 'Operativa 2' }).getByRole('button', { name: /^Resolver o comentário/ }).click();
	await expect(alemanha.getByRole('region', { name: 'Operativa 2' })).toContainText('Resolvidos (1)');

	// Alt + ↑ sobe a operativa 3.
	await alemanha.keyboard.press('Escape');
	await alemanha.getByRole('button', { name: /^Operativa 3 Pede C e D/ }).focus();
	await alemanha.keyboard.press('Alt+ArrowUp');
	await expect(folha(alemanha)).toContainText('2. Pede C e D;');
	await Promise.all([alemanha, franca].map((p) => p.context().close()));
});

test('as assinaturas ficam à vista, no notebook e no celular, e assinar atualiza para todos', async ({ browser }) => {
	const franca = await abrir(browser, FRANCA, { width: 360, height: 740 });
	const faixaFranca = franca.getByRole('region', { name: 'Assinaturas' });
	await expect(faixaFranca.getByRole('button', { name: /^(Assinar|Retirar a assinatura)$/ })).toBeInViewport();

	const alemanha = await abrir(browser, ALEMANHA);
	const faixa = alemanha.getByRole('region', { name: 'Assinaturas' });
	await expect(faixa.getByRole('button', { name: /^(Assinar|Retirar a assinatura)$/ })).toBeInViewport();
	if (await faixa.getByRole('button', { name: 'Retirar a assinatura' }).isVisible()) await faixa.getByRole('button', { name: 'Retirar a assinatura' }).click();
	const antes = (await faixaFranca.textContent()) ?? '';
	await faixa.getByRole('button', { name: 'Assinar' }).click();
	await expect(faixa.getByRole('button', { name: 'Retirar a assinatura' })).toBeVisible();
	await expect(faixaFranca).not.toHaveText(antes, { timeout: 10_000 });
	await expect(faixaFranca.getByRole('button', { name: 'Alemanha' })).toBeVisible();

	// Fixa ao rolar.
	await alemanha.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	await expect(faixa).toBeInViewport();
	await Promise.all([alemanha, franca].map((p) => p.context().close()));
});
