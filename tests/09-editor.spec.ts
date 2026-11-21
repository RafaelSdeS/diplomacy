import { expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contaDaDelegacao, isolado } from '../scripts/delegacoes.ts';
import { adotarAgenda, clienteComo, CONTAS, entrar } from './ajuda.ts';

// Passo 39: a cópia do CSNU-T só deste arquivo (scripts/delegacoes.ts).
const C = isolado('09');

const BLOCOS = `/comite/${C.sigla}/blocos`;
// O nome do bloco muda a cada execução: blocos não se repetem no comitê.
const BLOCO = `Bloco de teste ${Date.now()}`;
const MEMBROS = ['Rússia', 'China', 'Reino Unido', 'França'];
// O título também: a fusão escolhe as cláusulas pelo working paper desta execução.
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
let projeto = '';

test('um bloco escreve um working paper, com verbos sugeridos', async ({ page }) => {
	await entrar(page, C.conta(CONTAS.delegado)); // EUA
	await page.goto(BLOCOS);
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

	await bloco.getByRole('button', { name: 'Novo documento' }).click();
	const novo = page.getByRole('form', { name: 'Novo documento' });
	await novo.getByLabel('Título').fill(WP);
	await novo.getByRole('button', { name: 'Criar e abrir' }).click();
	await expect(page).toHaveURL(/\/documento\//);
	workingPaper = page.url();

	const clausula = page.getByRole('form', { name: 'Nova cláusula' });
	await clausula.getByLabel('Tipo da cláusula').selectOption('preambular');
	await clausula.getByLabel('Texto da cláusula').fill('Rec');
	await clausula.getByRole('group', { name: 'Verbos sugeridos' }).getByRole('button', { name: 'Recordando' }).click();
	await expect(clausula.getByLabel('Texto da cláusula')).toHaveValue('Recordando ');
	await clausula.getByLabel('Texto da cláusula').pressSequentially('a resolução 2178');
	await clausula.getByRole('button', { name: 'Acrescentar cláusula' }).click();
	for (const texto of ['Pede cooperação', 'Decide criar um fundo']) {
		await clausula.getByLabel('Tipo da cláusula').selectOption('operativa');
		await clausula.getByLabel('Texto da cláusula').fill(texto);
		await clausula.getByRole('button', { name: 'Acrescentar cláusula' }).click();
		await expect(page.getByRole('region', { name: 'Cláusulas' })).toContainText(texto);
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
	await expect(russia.getByRole('region', { name: 'Cláusulas' })).toContainText('Pede cooperação internacional ampla', {
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
	await expect(russia.getByRole('button', { name: /Operativa 2 Decide/ })).toContainText('Em foco');

	// Acordada, a cláusula trava: para reabrir, três delegações pedem.
	await russia.getByRole('button', { name: /Preambular Recordando/ }).click();
	await expect(russia.getByRole('region', { name: 'Preambular' })).toContainText('Acordada e travada');
	await Promise.all([russia, eua].map((p) => p.context().close()));
});

test('o working paper vai à mesa e, aprovado, aparece ao comitê', async ({ browser }) => {
	const eua = await abrir(browser, C.conta(CONTAS.delegado), workingPaper);
	await eua.getByRole('button', { name: 'Enviar à mesa' }).click();
	await expect(eua.getByRole('status')).toHaveText('Documento enviado à mesa.');
	await expect(eua.getByText('Working paper', { exact: false }).first()).toBeVisible();

	const brasil = await abrir(browser, C.conta(contaDaDelegacao('Brasil')), BLOCOS);
	const documentos = brasil.getByRole('region', { name: 'Documentos do comitê' });
	await expect(documentos).not.toContainText(WP);

	const mesa = await abrir(browser, C.conta(CONTAS.mesa), workingPaper);
	await mesa.getByRole('button', { name: 'Aprovar' }).click();
	await expect(mesa.getByRole('status')).toHaveText('Documento aprovado.');

	await expect(documentos).toContainText(WP, { timeout: 10_000 });
	await Promise.all([eua, brasil, mesa].map((p) => p.context().close()));
});

test('o projeto junta cláusulas do working paper, recebe 5 assinaturas e vai à mesa', async ({ page }) => {
	await adotarAgenda(C.conta(CONTAS.mesa), C.sigla, 1); // projeto só depois da agenda (passo 22)
	await entrar(page, C.conta(CONTAS.delegado));
	await page.goto(BLOCOS);
	await page.getByRole('article', { name: `Bloco ${BLOCO}` }).getByRole('button', { name: 'Novo documento' }).click();
	const novo = page.getByRole('form', { name: 'Novo documento' });
	await novo.getByLabel('Tipo').selectOption('projeto');
	await novo.getByLabel('Título').fill('Projeto sobre financiamento');
	await novo.getByRole('button', { name: 'Criar e abrir' }).click();
	await expect(page).toHaveURL(/\/documento\//);
	projeto = page.url();

	// Fusão: as cláusulas do working paper aprovado, cada uma guardando a origem.
	const fusao = page.getByRole('region', { name: 'Trazer cláusulas de working papers' });
	const wp = fusao.getByRole('group', { name: new RegExp(WP) });
	for (const caixa of await wp.getByRole('checkbox').all()) await caixa.check();
	await fusao.getByRole('button', { name: /^Trazer 3 cláusulas/ }).click();
	await expect(page.getByRole('status')).toHaveText('Cláusulas trazidas.');
	await page.getByRole('button', { name: /Operativa 1 Pede cooperação internacional ampla/ }).click();
	await expect(page.getByRole('region', { name: 'Operativa 1' })).toContainText('Veio de um working paper');

	// Sem 5 signatários, não vai.
	await page.getByRole('button', { name: 'Assinar' }).click();
	await page.getByRole('button', { name: 'Enviar à mesa' }).click();
	await expect(page.getByRole('alert')).toHaveText('O projeto precisa de pelo menos 5 signatários.');

	const id = projeto.split('/').pop()!;
	for (const nome of MEMBROS) {
		const cliente = await clienteComo(C.conta(contaDaDelegacao(nome)));
		expect((await cliente.rpc('assinar', { p_documento: id, p_assinar: true })).error).toBeNull();
	}
	await expect(page.getByText('Signatários (5 de no mínimo 5)')).toBeVisible({ timeout: 10_000 });
	await page.getByLabel('Aprovação').selectOption('consenso');
	await page.getByRole('button', { name: 'Enviar à mesa' }).click();
	await expect(page.getByRole('status')).toHaveText('Documento enviado à mesa.');
	// O projeto ganha número no envio (o primeiro do comitê é o 1).
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Projeto de resolução \d+: Projeto sobre financiamento$/);

	// O documento formatado: linha do comitê e signatários com o nome oficial.
	await page.getByText('Ver como documento').click();
	const folha = page.getByRole('article', { name: 'Documento formatado' });
	await expect(folha).toContainText('O Conselho de Segurança:');
	await expect(folha).toContainText('1. Pede cooperação internacional ampla;');
	await expect(folha).toContainText('2. Decide criar um fundo.');
	await expect(folha).toContainText('Signatários: French Republic, People');
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
		for (const rota of [BLOCOS, workingPaper, projeto]) {
			await page.goto(rota);
			await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
			const primeira = page.getByRole('region', { name: 'Cláusulas' }).getByRole('button').first();
			if (await primeira.count()) await primeira.click();
			await semErrosDeAcessibilidade(page);
		}
	});
}
