import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { clienteComo, CONTAS, entrar } from './ajuda.ts';

// Passo 18: um comitê em inglês (UNOCT-T, do seed) funciona em inglês, inclusive o
// projeto impresso; as datas seguem o idioma; o perfil troca o idioma da pessoa. A
// secretaria fica em português (fora do escopo).

const FRANCA = 'unoct-france@exemplo.test';
const MESA = 'unoct-mesa@exemplo.test';

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'roda num projeto só');
});

// Uma execução interrompida pode ter deixado a delegada com o app em português.
test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const franca = await clienteComo(FRANCA);
	const { data } = await franca.auth.getUser();
	expect((await franca.from('pessoa').update({ idioma: null }).eq('id', data.user!.id)).error).toBeNull();
});

// Sinais de português na tela: acentos e palavras que o inglês não usa. Os dados do
// comitê de teste já estão em inglês.
const PORTUGUES = /[ãõçáéíóúâêô]|\b(de|da|dos|das|para|com|uma|não|sem)\b/i;

async function semPortugues(page: Page, rota: string) {
	await page.goto(rota);
	await expect(page.locator('main h1')).toBeVisible();
	await page.waitForLoadState('networkidle');
	// "Português" é o nome do idioma na escolha do perfil.
	const texto = (await page.locator('body').innerText()).replaceAll('Português', '');
	const achado = PORTUGUES.exec(texto);
	expect(achado && texto.slice(Math.max(0, achado.index - 40), achado.index + 40), `português em ${rota}`).toBeNull();
}

test('as telas do comitê em inglês saem em inglês, para a delegação e para a mesa', async ({ page, browser }) => {
	await entrar(page, FRANCA);
	await expect(page.getByRole('heading', { level: 1, name: 'Now' })).toBeVisible();
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
	// A tela Agora mostra os avisos gerais da secretaria, escritos em português (dados).
	for (const rota of ['/comite/UNOCT-T', '/comite/UNOCT-T/sessao', '/comite/UNOCT-T/sessao/agenda',
		'/comite/UNOCT-T/blocos', '/comite/UNOCT-T/dpo', '/comite/UNOCT-T/cartas', '/comite/UNOCT-T/mensagens',
		'/comite/UNOCT-T/crise', '/comite/UNOCT-T/regras', '/perfil']) {
		await semPortugues(page, rota);
	}

	const contexto = await browser.newContext();
	const mesa = await contexto.newPage();
	await entrar(mesa, MESA);
	for (const rota of ['/comite/UNOCT-T/sessao', '/comite/UNOCT-T/sessao/chamada', '/comite/UNOCT-T/sessao/presidencia',
		'/comite/UNOCT-T/dpo', '/telao/UNOCT-T']) {
		await semPortugues(mesa, rota);
	}
	await contexto.close();
});

let projeto = '';

test('o editor sugere verbos em inglês, e o projeto impresso sai em inglês', async ({ page }) => {
	const franca = await clienteComo(FRANCA);
	const comite = (await franca.from('comite').select('id').eq('sigla', 'UNOCT-T').single()).data!.id;
	const bloco = await franca.rpc('criar_bloco', { p_comite: comite, p_nome: `Bloc ${Date.now()}` });
	expect(bloco.error).toBeNull();
	const documento = await franca.rpc('criar_documento', {
		p_bloco: bloco.data!,
		p_tipo: 'projeto',
		p_titulo: 'Countering the financing of terrorism',
		p_topico: 1
	});
	expect(documento.error).toBeNull();
	projeto = documento.data!;
	expect((await franca.rpc('adicionar_clausula', {
		p_documento: projeto, p_tipo: 'operativa', p_texto: 'Decides to remain seized of the matter'
	})).error).toBeNull();
	expect((await franca.rpc('assinar', { p_documento: projeto, p_assinar: true })).error).toBeNull();

	await entrar(page, FRANCA);
	await page.goto(`/documento/${projeto}`);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Draft resolution: Countering the financing of terrorism');
	const clausula = page.getByRole('form', { name: 'New clause' });
	await clausula.getByLabel('Clause type').selectOption('preambular');
	await clausula.getByLabel('Clause text').fill('Rec');
	await clausula.getByRole('group', { name: 'Suggested verbs' }).getByRole('button', { name: 'Recalling' }).click();
	await expect(clausula.getByLabel('Clause text')).toHaveValue('Recalling ');
	await clausula.getByLabel('Clause text').pressSequentially('resolution 2462 (2019)');
	await clausula.getByRole('button', { name: 'Add clause' }).click();
	await expect(page.getByRole('button', { name: 'Preambular Recalling resolution 2462 (2019)' })).toBeVisible();

	await page.getByText('See as a document').click();
	await page.getByRole('link', { name: 'Print or save as PDF' }).click();
	const folha = page.getByRole('article', { name: 'Document for printing' });
	await expect(folha).toHaveAttribute('lang', 'en');
	await expect(folha.getByRole('heading', { level: 1 })).toHaveText('Draft resolution: Countering the financing of terrorism');
	await expect(folha).toContainText('Recalling resolution 2462 (2019);');
	await expect(folha).toContainText('The United Nations Office of Counter-Terrorism:');
	await expect(folha).toContainText('1. Decides to remain seized of the matter.');
	await expect(folha).toContainText('Signatories: French Republic.');
	await page.emulateMedia({ media: 'print' });
	expect((await page.pdf({ format: 'A4' })).byteLength).toBeGreaterThan(1000);
});

test('datas e horas aparecem no formato de cada idioma', async ({ page, browser }) => {
	// O seed tem itens gerais do cronograma em 10/11/2026, uma terça-feira.
	await entrar(page, FRANCA);
	await page.goto('/cronograma');
	await expect(page.getByRole('heading', { level: 2, name: 'Tuesday 10 November' })).toBeVisible();
	await expect(page.getByText('08:30–09:30')).toBeVisible();

	const contexto = await browser.newContext();
	const pt = await contexto.newPage();
	await entrar(pt, CONTAS.delegado);
	await pt.goto('/cronograma');
	await expect(pt.getByRole('heading', { level: 2, name: 'terça-feira, 10 de novembro' })).toBeVisible();
	await expect(pt.getByText('08:30–09:30')).toBeVisible();
	await contexto.close();
});

// A mensagem sai no idioma de antes ou de depois da troca.
const SALVO = /^(Perfil salvo|Profile saved)\.$/;

test('cada pessoa troca o idioma do app no perfil, e o impresso segue o do comitê', async ({ page }) => {
	await entrar(page, FRANCA);
	await page.goto('/perfil');
	try {
		await page.getByLabel('App language').selectOption('pt');
		await page.getByRole('button', { name: 'Save profile' }).click();
		await expect(page.getByRole('status')).toHaveText(SALVO);
		await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
		await page.goto('/');
		await expect(page.getByRole('heading', { level: 1, name: 'Agora' })).toBeVisible();
		// O projeto impresso segue o idioma do comitê, não o da tela.
		await page.goto(`/imprimir/documento/${projeto}`);
		const folha = page.getByRole('article', { name: 'Documento para impressão' });
		await expect(folha.getByRole('heading', { level: 1 })).toHaveText('Draft resolution: Countering the financing of terrorism');
		await expect(folha).toContainText('Signatories: French Republic.');
	} finally {
		// Volta ao idioma do comitê para as próximas execuções.
		await page.goto('/perfil');
		await page.getByLabel(/^(Idioma do app|App language)/).selectOption('');
		await page.getByRole('button', { name: /^(Salvar perfil|Save profile)$/ }).click();
		await expect(page.getByRole('status')).toHaveText(SALVO);
	}
});

for (const tema of ['light', 'dark'] as const) {
	test(`as telas em inglês não têm erros de acessibilidade (tema ${tema})`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: tema });
		await entrar(page, FRANCA);
		for (const rota of ['/', '/comite/UNOCT-T/sessao', '/comite/UNOCT-T/regras', `/documento/${projeto}`,
			`/imprimir/documento/${projeto}`]) {
			await page.goto(rota);
			await expect(page.locator('main h1')).toBeVisible();
			const { violations } = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
				.analyze();
			expect(violations).toEqual([]);
		}
	});
}
