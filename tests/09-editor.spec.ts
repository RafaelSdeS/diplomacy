import { expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contaDaDelegacao, isolado } from '../scripts/delegacoes.ts';
import { clienteComo, CONTAS, entrar, abrirAcao } from './ajuda.ts';

// Passo 39: a cópia do CSNU-T só deste arquivo (scripts/delegacoes.ts).
const C = isolado('09');

const BLOCOS = `/comite/${C.sigla}/blocos`;
// O nome do bloco muda a cada execução: blocos não se repetem no comitê.
const BLOCO = `Bloco de teste ${Date.now()}`;
const MEMBROS = ['Rússia', 'China', 'Reino Unido', 'França'];
// O título também, para achar a resolução desta execução.
const WP = `Financiamento ${Date.now()}`;

// O fluxo do editor depende do passo anterior: roda em série, num projeto só.
test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'o fluxo do editor roda num projeto só');
});

async function abrir(browser: Browser, conta: string, rota: string, viewport?: { width: number; height: number }) {
	const contexto = await browser.newContext(viewport ? { viewport, isMobile: viewport.width < 500 } : {});
	const page = await contexto.newPage();
	await entrar(page, conta);
	await page.goto(rota);
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	return page;
}

async function semErrosDeAcessibilidade(page: Page) {
	const { violations } = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(violations).toEqual([]);
}

let workingPaper = '';

// Passo 63: o editor do bloco fica para a resolução de crise; o working paper e o projeto são da
// sala e têm o teste deles (63-working-paper-da-sala).
test('um bloco escreve uma resolução de crise, com verbos sugeridos', async ({ page }) => {
	await entrar(page, C.conta(CONTAS.delegado)); // EUA
	await page.goto(BLOCOS);
	await abrirAcao(page, 'Novo bloco');
	await page.getByLabel('Nome do novo bloco').fill(BLOCO);
	await page.getByRole('button', { name: 'Criar bloco' }).click();
	const bloco = page.getByRole('article', { name: `Bloco ${BLOCO}` });
	await expect(bloco).toContainText('Redator');

	// As outras delegações entram pela API, como no app.
	const blocoId = await (async () => {
		const eua = await clienteComo(C.conta(CONTAS.delegado));
		return (await eua.from('bloco').select('id').eq('nome', BLOCO).single()).data!.id;
	})();
	for (const nome of MEMBROS) {
		const cliente = await clienteComo(C.conta(contaDaDelegacao(nome)));
		const { error } = await cliente.rpc('entrar_bloco', { p_bloco: blocoId });
		expect(error).toBeNull();
	}
	await expect(bloco.getByRole('listitem')).toHaveCount(5);

	// A resolução nasce pela API, como o app faria depois de uma atualização de crise.
	const criada = await (await clienteComo(C.conta(CONTAS.delegado))).rpc('criar_documento', {
		p_bloco: blocoId,
		p_tipo: 'resolucao_crise',
		p_titulo: WP,
		p_topico: 1
	});
	expect(criada.error).toBeNull();
	await page.goto(`/documento/${criada.data}`);
	workingPaper = page.url();

	// Passo 57: escreve no lugar. "+ Preambular" abre a cláusula já em edição; Enter salva e
	// abre a próxima do mesmo tipo; Esc fecha.
	const doc = page.getByRole('article', { name: 'Documento formatado' });
	const noFim = page.getByRole('group', { name: 'Acrescentar no fim' });
	const nova = page.getByLabel(/^Nova cláusula/);
	await noFim.getByRole('button', { name: 'Preambular', exact: true }).click();
	await nova.fill('Rec');
	await page.getByRole('group', { name: 'Verbos sugeridos' }).getByRole('button', { name: 'Recordando' }).click();
	await expect(nova).toHaveValue('Recordando ');
	await nova.pressSequentially('a resolução 2178');
	await nova.press('Enter');
	await expect(doc).toContainText('Recordando a resolução 2178');
	await nova.press('Escape');
	for (const texto of ['Pede cooperação', 'Decide criar um fundo']) {
		await noFim.getByRole('button', { name: 'Operativa', exact: true }).click();
		await nova.fill(texto);
		await nova.press('Enter');
		await expect(doc).toContainText(texto);
		await nova.press('Escape');
	}
	await expect(page.getByText('0 de 3 acordadas')).toBeVisible();
});

test('uma proposta feita no celular e aceita pelo redator aparece para todo o bloco sem recarregar', async ({
	browser
}) => {
	const russia = await abrir(browser, C.conta(contaDaDelegacao('Rússia')), workingPaper, { width: 360, height: 740 });
	const eua = await abrir(browser, C.conta(CONTAS.delegado), workingPaper);

	// No celular, um toque na cláusula abre a conversa.
	await russia.getByRole('button', { name: /Operativa 1 Pede cooperação/ }).click();
	const conversa = russia.getByRole('region', { name: 'Operativa 1' });
	await expect(conversa).toBeInViewport();
	await conversa.getByLabel('Sua proposta de texto').fill('Pede cooperação internacional ampla');
	await conversa.getByRole('button', { name: 'Propor alteração' }).click();
	await expect(russia.getByRole('status')).toHaveText('Proposta enviada ao redator.');

	// O redator vê a proposta chegar e aceita.
	await eua.getByRole('button', { name: /Operativa 1 Pede cooperação/ }).click();
	const conversaEua = eua.getByRole('region', { name: 'Operativa 1' });
	await conversaEua.getByRole('button', { name: 'Aceitar a proposta de Rússia' }).click();
	await expect(eua.getByRole('status')).toHaveText('Proposta aceita.');

	// No celular da Rússia, o texto novo aparece sem recarregar.
	await expect(russia.getByRole('article', { name: 'Documento formatado' })).toContainText('Pede cooperação internacional ampla', {
		timeout: 10_000
	});
	await Promise.all([russia, eua].map((p) => p.context().close()));
});

test('a barra de progresso e a cláusula em foco atualizam para todos', async ({ browser }) => {
	const russia = await abrir(browser, C.conta(contaDaDelegacao('Rússia')), workingPaper);
	const eua = await abrir(browser, C.conta(CONTAS.delegado), workingPaper);

	await eua.getByRole('button', { name: /Preambular Recordando/ }).click();
	await eua.getByRole('button', { name: 'Marcar como acordada' }).click();
	await eua.getByRole('button', { name: /Operativa 2 Decide/ }).click();
	await eua.getByRole('button', { name: 'Pôr em foco' }).click();

	await expect(russia.getByText('1 de 3 acordadas')).toBeVisible({ timeout: 10_000 });
	await expect(russia.locator('.bloco-clausula', { has: russia.getByRole('button', { name: /Operativa 2 Decide/ }) })).toContainText('Em foco');

	// Acordada, a cláusula trava: para reabrir, três delegações pedem.
	await russia.getByRole('button', { name: /Preambular Recordando/ }).click();
	await expect(russia.getByRole('region', { name: 'Preambular' })).toContainText('Acordada e travada');
	await Promise.all([russia, eua].map((p) => p.context().close()));
});

test('a resolução de crise, com 5 assinaturas, vai à mesa e, aprovada, aparece ao comitê', async ({ browser }) => {
	const id = workingPaper.split('/').pop()!;
	for (const conta of [C.conta(CONTAS.delegado), ...MEMBROS.map((n) => C.conta(contaDaDelegacao(n)))]) {
		expect((await (await clienteComo(conta)).rpc('assinar', { p_documento: id, p_assinar: true })).error).toBeNull();
	}
	const eua = await abrir(browser, C.conta(CONTAS.delegado), workingPaper);
	const faixa = eua.getByRole('region', { name: 'Assinaturas' });
	await expect(faixa).toContainText('5 de 5 assinaturas', { timeout: 10_000 });
	await faixa.getByRole('button', { name: 'Enviar à mesa' }).click();
	const envio = eua.getByRole('dialog', { name: 'Enviar à mesa?' });
	await envio.getByRole('radio', { name: 'Por consenso' }).check();
	await envio.getByRole('button', { name: 'Enviar à mesa' }).click();
	await expect(eua.getByRole('status')).toHaveText('Documento enviado à mesa.');
	// Ganha número no envio; o documento formatado tem a linha do comitê e os signatários oficiais.
	await expect(eua.getByRole('heading', { level: 1 })).toHaveText(new RegExp(`^Resolução de crise \\d+: ${WP}$`));
	const folha = eua.getByRole('article', { name: 'Documento formatado' });
	await expect(folha).toContainText('O Conselho de Segurança:');
	await expect(folha).toContainText('1. Pede cooperação internacional ampla;');
	await expect(folha).toContainText('2. Decide criar um fundo.');
	await expect(folha).toContainText('Signatários: French Republic, People');

	const brasil = await abrir(browser, C.conta(contaDaDelegacao('Brasil')), BLOCOS);
	const documentos = brasil.getByRole('region', { name: 'Documentos do comitê' });
	await expect(documentos).not.toContainText(WP);

	const mesa = await abrir(browser, C.conta(CONTAS.mesa), workingPaper);
	await mesa.getByRole('button', { name: 'Aprovar' }).click();
	await expect(mesa.getByRole('status')).toHaveText('Documento aprovado.');

	await expect(documentos).toContainText(WP, { timeout: 10_000 });
	await Promise.all([eua, brasil, mesa].map((p) => p.context().close()));
});

test('aparência do documento aberto no celular e no notebook', async ({ browser }) => {
	test.skip(!process.env.CAPTURAS, 'capturas só no contêiner (npm run capturas)');
	for (const [nome, viewport] of [
		['documento-celular.png', { width: 360, height: 740 }],
		['documento-notebook.png', { width: 1366, height: 768 }]
	] as const) {
		const page = await abrir(browser, C.conta(CONTAS.delegado), workingPaper, viewport);
		await page.getByRole('button', { name: /Operativa 1/ }).click();
		await expect(page).toHaveScreenshot(nome, {
			fullPage: true,
			mask: [page.locator('p.rotulo'), page.locator('h1'), page.locator('.folha h2')]
		});
		await page.context().close();
	}
});

for (const tema of ['light', 'dark'] as const) {
	test(`as telas do editor não têm erros de acessibilidade (tema ${tema})`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: tema });
		await entrar(page, C.conta(CONTAS.delegado));
		for (const rota of [BLOCOS, workingPaper]) {
			await page.goto(rota);
			await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
			const primeira = page.getByRole('article', { name: 'Documento formatado' }).locator('.bloco-texto').first();
			if (await primeira.count()) await primeira.click();
			await semErrosDeAcessibilidade(page);
		}
	});
}
