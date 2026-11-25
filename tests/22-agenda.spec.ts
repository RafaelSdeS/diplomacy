import { expect, test, type Page } from '@playwright/test';
import { entrar, abrirAcao } from './ajuda.ts';

// Passo 22: a agenda vem antes das resoluções; a mesa adota, edita e retira.
// Usa o Conselho Europeu de teste (CE-T), tópico 1.
const AGENDA = '/comite/CE-T/sessao/agenda';
const BLOCOS = '/comite/CE-T/blocos';
const MESA = 'mesa-ce@exemplo.test';
const ALEMANHA = 'ce-alemanha@exemplo.test';

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a agenda do comitê de teste é uma só');
});

const AGENDA1 = `${AGENDA}?topico=1`;
const etapaAtual = (page: Page) => page.getByRole('navigation', { name: 'Ordem do tópico 1' }).locator('[aria-current="step"]');

/** O tópico 1 está liberado para projeto na tela de blocos? */
async function projetoLiberado(page: Page) {
	await page.goto(BLOCOS);
	const bloco = page.getByRole('article', { name: /^Bloco Agenda/ }).first();
	await bloco.getByRole('button', { name: 'Novo documento' }).click();
	const formulario = page.getByRole('form', { name: 'Novo documento' });
	await formulario.getByRole('combobox', { name: /^Tipo/ }).selectOption({ label: 'Projeto de resolução' });
	const opcao = formulario.getByRole('combobox', { name: /^Tópico/ }).locator('option').first();
	return !(await opcao.isDisabled());
}

/** Passo 56: o editor de itens, aqui pelo "Colar uma lista". */
async function colar(page: Page, lista: string) {
	const editor = page.getByRole('dialog');
	await editor.getByText('Colar uma lista').click();
	await editor.locator('.colar-lista textarea').fill(lista);
	await editor.getByRole('button', { name: 'Montar os itens' }).click();
}

async function retirarAdocao(page: Page) {
	await page.getByRole('button', { name: 'Retirar adoção' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Retirar adoção' }).click();
	await expect(page.getByRole('status')).toHaveText('Adoção retirada.');
}

test('sem agenda adotada não há projeto; a mesa adota, e o projeto é liberado', async ({ page, browser }) => {
	// Banco reaproveitado: começa com a agenda do tópico 1 sem adoção.
	await entrar(page, MESA);
	await page.goto(AGENDA1);
	await expect(etapaAtual(page)).toBeVisible();
	if (await page.getByRole('button', { name: 'Retirar adoção' }).isVisible()) await retirarAdocao(page);

	const alemanha = await (await browser.newContext()).newPage();
	await entrar(alemanha, ALEMANHA);
	await alemanha.goto(AGENDA1);
	await alemanha.getByRole('button', { name: /^(Propor agenda|Editar a minha proposta)$/ }).click();
	await colar(alemanha, 'A. Causas\n  A.1 Atores\nB. Respostas');
	await alemanha.getByRole('button', { name: 'Salvar proposta' }).click();
	await expect(alemanha.getByRole('status')).toHaveText('Proposta salva.');

	await alemanha.goto(BLOCOS);
	await abrirAcao(alemanha, 'Novo bloco');
	await alemanha.getByLabel('Nome do novo bloco').fill(`Agenda ${Date.now()}`);
	await alemanha.getByRole('button', { name: 'Criar bloco' }).click();
	expect(await projetoLiberado(alemanha)).toBe(false);
	await expect(alemanha.getByRole('note')).toContainText('Primeiro a agenda');

	await page.reload();
	await expect(etapaAtual(page)).toContainText('Agenda');
	await page.getByRole('article', { name: 'Proposta de Alemanha' }).getByRole('button', { name: 'Adotar esta' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Adotar esta' }).click();
	await expect(etapaAtual(page)).toContainText('Working papers');
	expect(await projetoLiberado(alemanha)).toBe(true);
});

test('editar a agenda adotada mantém o andamento; retirar a adoção volta ao debate', async ({ page }) => {
	await entrar(page, MESA);
	await page.goto(AGENDA1);
	const adotada = page.getByRole('article', { name: 'Agenda adotada' });

	const andamento = adotada.getByRole('combobox', { name: 'Andamento de A.1 Atores' });
	await andamento.selectOption('em_debate');
	await expect(andamento).toHaveValue('em_debate');

	await adotada.getByRole('button', { name: 'Editar agenda adotada' }).click();
	await colar(page, 'A. Causas\n  A.1 Atores\nC. Financiamento');
	await page.getByRole('dialog').getByRole('button', { name: 'Salvar agenda adotada' }).click();
	await expect(page.getByRole('status')).toHaveText('Agenda adotada atualizada.');
	await expect(adotada).toContainText('C. Financiamento');
	await expect(adotada).not.toContainText('B. Respostas');
	await expect(adotada.getByRole('combobox', { name: 'Andamento de A.1 Atores' })).toHaveValue('em_debate');

	await retirarAdocao(page);
	await expect(etapaAtual(page)).toContainText('Agenda');
});
