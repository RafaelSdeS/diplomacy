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

const topico1 = (page: Page) => page.getByRole('region', { name: 'Agenda informal · tópico 1' });

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

test('sem agenda adotada não há projeto; a mesa adota, e o projeto é liberado', async ({ page, browser }) => {
	// Banco reaproveitado: começa com a agenda do tópico 1 sem adoção.
	await entrar(page, MESA);
	await page.goto(AGENDA);
	const retirar = topico1(page).getByRole('button', { name: 'Retirar adoção' });
	if (await retirar.isVisible()) {
		await retirar.click();
		await page.getByRole('dialog').getByRole('button', { name: 'Retirar adoção' }).click();
		await expect(page.getByRole('status')).toHaveText('Adoção retirada.');
	}

	const alemanha = await (await browser.newContext()).newPage();
	await entrar(alemanha, ALEMANHA);
	await alemanha.goto(AGENDA);
	await alemanha.getByRole('combobox', { name: /^Tópico/ }).selectOption({ index: 0 });
	await alemanha.getByLabel('Agenda em tópicos').fill('A. Causas\n  A.1 Atores\nB. Respostas');
	await alemanha.getByRole('button', { name: 'Salvar proposta' }).click();
	await expect(alemanha.getByRole('status')).toHaveText('Proposta salva.');

	await alemanha.goto(BLOCOS);
	await abrirAcao(alemanha, 'Novo bloco');
	await alemanha.getByLabel('Nome do novo bloco').fill(`Agenda ${Date.now()}`);
	await alemanha.getByRole('button', { name: 'Criar bloco' }).click();
	expect(await projetoLiberado(alemanha)).toBe(false);
	await expect(alemanha.getByRole('note')).toContainText('A agenda vem antes das resoluções');

	await page.reload();
	await expect(topico1(page).getByRole('list', { name: 'Etapas do tópico 1' }).locator('[aria-current="step"]')).toHaveText(
		/Debate da agenda/
	);
	await topico1(page).getByRole('button', { name: 'Adotar a proposta de Alemanha' }).click();
	await expect(topico1(page).getByRole('list', { name: 'Etapas do tópico 1' }).locator('[aria-current="step"]')).toHaveText(
		/Agenda adotada/
	);
	expect(await projetoLiberado(alemanha)).toBe(true);
});

test('editar a agenda adotada mantém o andamento; retirar a adoção volta ao debate', async ({ page }) => {
	await entrar(page, MESA);
	await page.goto(AGENDA);

	const andamento = topico1(page).getByRole('combobox', { name: 'Andamento de A.1 Atores' });
	await andamento.selectOption('em_debate');
	await expect(andamento).toHaveValue('em_debate');

	await topico1(page).getByRole('button', { name: 'Editar agenda adotada' }).click();
	await topico1(page).getByLabel('Agenda adotada em tópicos').fill('A. Causas\n  A.1 Atores\nC. Financiamento');
	await topico1(page).getByRole('button', { name: 'Salvar agenda adotada' }).click();
	await expect(page.getByRole('status')).toHaveText('Agenda adotada atualizada.');
	await expect(topico1(page)).toContainText('C. Financiamento');
	await expect(topico1(page)).not.toContainText('B. Respostas');
	await expect(topico1(page).getByRole('combobox', { name: 'Andamento de A.1 Atores' })).toHaveValue('em_debate');

	await topico1(page).getByRole('button', { name: 'Retirar adoção' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Retirar adoção' }).click();
	await expect(page.getByRole('status')).toHaveText('Adoção retirada.');
	await expect(topico1(page).getByRole('list', { name: 'Etapas do tópico 1' }).locator('[aria-current="step"]')).toHaveText(
		/Debate da agenda/
	);
});
