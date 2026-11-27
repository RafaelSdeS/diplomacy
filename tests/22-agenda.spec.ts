import { expect, test, type Page } from '@playwright/test';
import { clienteComo, entrar } from './ajuda.ts';

// Passo 22: a agenda vem antes das resoluções; a mesa adota, edita e retira.
// Usa o Conselho Europeu de teste (CE-T), tópico 1.
const AGENDA = '/comite/CE-T/sessao/agenda';
const MESA = 'mesa-ce@exemplo.test';
const ALEMANHA = 'ce-alemanha@exemplo.test';

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a agenda do comitê de teste é uma só');
});

const AGENDA1 = `${AGENDA}?topico=1`;
const etapaAtual = (page: Page) => page.getByRole('navigation', { name: 'Ordem do tópico 1' }).locator('[aria-current="step"]');

/** Passo 63: adotada a agenda, a etapa "Working papers" de Documentos leva ao working paper da sala do item. */
async function workingPaperDoItem(page: Page, item: string) {
	await page.goto('/comite/CE-T/documentos');
	await page.getByRole('navigation', { name: 'Ordem do tópico 1' }).getByRole('button', { name: /^Working papers/ }).click();
	await expect(page).toHaveURL(/\/documento\/.+\/sala$/);
	await expect(page.getByRole('navigation', { name: 'Documentos do tópico' })).toContainText(item);
}

/** Passo 60: a mesa cadastra a agenda do bureau (pela API) e a libera na tela. */
async function agendaDoBureau(mesa: Page) {
	const api = await clienteComo(MESA);
	const comite = (await api.from('comite').select('id').eq('sigla', 'CE-T').single()).data!.id;
	await api.rpc('salvar_proposta_agenda', {
		p_comite: comite,
		p_topico: 1,
		p_itens: [
			{ texto: 'A. Causas', nivel: 0 },
			{ texto: 'A.1 Atores', nivel: 1 },
			{ texto: 'B. Respostas', nivel: 0 }
		]
	});
	await mesa.goto(AGENDA1);
	await expect(etapaAtual(mesa)).toBeVisible();
	const liberar = mesa.getByRole('button', { name: 'Liberar a agenda' });
	if (await liberar.isVisible()) {
		await liberar.click();
		await mesa.getByRole('dialog').getByRole('button', { name: 'Liberar a agenda' }).click();
		await expect(mesa.getByRole('status')).toHaveText('Agenda liberada.');
	}
}

async function retirarAdocao(page: Page) {
	await page.getByRole('button', { name: 'Retirar adoção' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Retirar adoção' }).click();
	await expect(page.getByRole('status')).toHaveText('Adoção retirada.');
}

test('a delegação propõe, a mesa inclui e registra a adoção; o item ganha o working paper da sala', async ({ page, browser }) => {
	// Banco reaproveitado: começa com a agenda do tópico 1 sem adoção.
	await entrar(page, MESA);
	await page.goto(AGENDA1);
	await expect(etapaAtual(page)).toBeVisible();
	if (await page.getByRole('button', { name: 'Retirar adoção' }).isVisible()) await retirarAdocao(page);
	await agendaDoBureau(page);

	const alemanha = await (await browser.newContext()).newPage();
	await entrar(alemanha, ALEMANHA);

	// A Alemanha propõe mudar um item; a mesa vê e inclui.
	const texto = `B. Respostas e prazos ${Date.now()}`;
	await alemanha.goto(AGENDA1);
	// Passo 64: o item abre o painel à direita; o verbo abre o formulário.
	await alemanha.getByRole('article', { name: 'Agenda do bureau' }).getByRole('button', { name: /B\. Respostas/ }).first().click();
	const modal = alemanha.getByRole('dialog');
	await modal.getByRole('button', { name: 'Mudar o texto' }).click();
	await modal.getByLabel('Texto novo').fill(texto);
	await modal.getByRole('button', { name: 'Propor', exact: true }).click();
	await expect(alemanha.getByRole('status')).toHaveText('Alteração proposta. As delegações debatem e marcam a posição.');

	await page.reload();
	// A lista ao lado leva ao item; no painel dele, a mesa inclui.
	await page.getByRole('region', { name: /^Alterações propostas/ }).getByRole('button', { name: texto }).click();
	await page.getByRole('dialog').getByRole('listitem').filter({ hasText: texto }).getByRole('button', { name: 'Incluir', exact: true }).click();
	await expect(page.getByRole('status')).toHaveText('Alteração incluída.');
	await page.keyboard.press('Escape');
	await expect(page.getByRole('article', { name: 'Agenda do bureau' })).toContainText(texto);

	await page.getByRole('button', { name: 'Registrar a adoção' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Registrar a adoção' }).click();
	await expect(etapaAtual(page)).toContainText('Working papers');
	await workingPaperDoItem(alemanha, texto);
});

test('o andamento fica ao incluir um item; retirar a adoção volta ao debate da agenda', async ({ page }) => {
	// O andamento só muda com uma sessão aberta: sem ela, o banco recusa. (O seletor antigo, na
	// árvore, mostrava o valor escolhido mesmo recusado; o painel do passo 64 relê o gravado.)
	// Sem sessão, o painel mostra o porquê no lugar do seletor.
	const api = await clienteComo(MESA);
	const comite = (await api.from('comite').select('id').eq('sigla', 'CE-T').single()).data!.id;
	if (!(await api.from('estado_sessao').select('sessao_id').eq('comite_id', comite).maybeSingle()).data?.sessao_id)
		expect((await api.rpc('abrir_sessao', { p_comite: comite })).error).toBeNull();

	await entrar(page, MESA);
	await page.goto(AGENDA1);
	const adotada = page.getByRole('article', { name: 'Agenda adotada' });

	// Passo 64: o andamento fica no painel do item.
	const abrirItem = (nome: RegExp) => adotada.getByRole('button', { name: nome }).click();
	const andamento = page.getByRole('dialog').getByRole('combobox', { name: 'Andamento de A.1 Atores' });
	await abrirItem(/A\.1 Atores/);
	await andamento.selectOption('em_debate');
	await expect(page.getByRole('dialog').getByRole('alert')).toHaveCount(0);
	await expect(andamento).toHaveValue('em_debate');
	await page.keyboard.press('Escape');

	// Do item grande ao working paper dele, em 2 cliques.
	await abrirItem(/A\. Causas/);
	await expect(page.getByRole('dialog').getByRole('link', { name: 'Abrir o working paper deste item' })).toHaveAttribute('href', /\/documento\/.+\/sala$/);
	await page.keyboard.press('Escape');

	// A mesa também propõe; incluída, a agenda muda no lugar.
	const item = `C. Financiamento ${Date.now()}`;
	await adotada.getByRole('button', { name: 'Propor um item no fim' }).click();
	await page.getByRole('dialog').getByLabel('Item novo').fill(item);
	await page.getByRole('dialog').getByRole('button', { name: 'Propor', exact: true }).click();
	await page.getByRole('region', { name: /^Alterações propostas/ }).getByRole('button', { name: item }).click();
	await page.getByRole('dialog').getByRole('listitem').filter({ hasText: item }).getByRole('button', { name: 'Incluir', exact: true }).click();
	await expect(page.getByRole('status')).toHaveText('Alteração incluída.');
	await page.keyboard.press('Escape');
	await expect(adotada).toContainText(item);
	await abrirItem(/A\.1 Atores/);
	await expect(andamento).toHaveValue('em_debate');
	await page.keyboard.press('Escape');

	await retirarAdocao(page);
	await expect(etapaAtual(page)).toContainText('Agenda');
});
