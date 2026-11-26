import { expect, test, type Page } from '@playwright/test';
import { clienteComo, entrar, abrirAcao } from './ajuda.ts';

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
	// Passo 62: a delegação fica num bloco por vez; o dela é o que tem "Novo documento".
	const bloco = page.getByRole('article', { name: /^Bloco Agenda/ }).filter({ has: page.getByRole('button', { name: 'Novo documento' }) });
	await bloco.getByRole('button', { name: 'Novo documento' }).click();
	const formulario = page.getByRole('form', { name: 'Novo documento' });
	await formulario.getByRole('combobox', { name: /^Tipo/ }).selectOption({ label: 'Projeto de resolução' });
	const opcao = formulario.getByRole('combobox', { name: /^Tópico/ }).locator('option').first();
	return !(await opcao.isDisabled());
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

test('sem agenda adotada não há projeto; a delegação propõe, a mesa inclui e registra a adoção', async ({ page, browser }) => {
	// Banco reaproveitado: começa com a agenda do tópico 1 sem adoção.
	await entrar(page, MESA);
	await page.goto(AGENDA1);
	await expect(etapaAtual(page)).toBeVisible();
	if (await page.getByRole('button', { name: 'Retirar adoção' }).isVisible()) await retirarAdocao(page);
	await agendaDoBureau(page);

	const alemanha = await (await browser.newContext()).newPage();
	await entrar(alemanha, ALEMANHA);
	await alemanha.goto(BLOCOS);
	await abrirAcao(alemanha, 'Novo bloco');
	await alemanha.getByLabel('Nome do novo bloco').fill(`Agenda ${Date.now()}`);
	await alemanha.getByRole('button', { name: 'Criar bloco' }).click();
	expect(await projetoLiberado(alemanha)).toBe(false);
	await expect(alemanha.getByRole('note')).toContainText('Primeiro a agenda');

	// A Alemanha propõe mudar um item; a mesa vê e inclui.
	const texto = `B. Respostas e prazos ${Date.now()}`;
	await alemanha.goto(AGENDA1);
	await alemanha.getByRole('button', { name: /^Propor uma alteração em "B\. Respostas/ }).first().click();
	const modal = alemanha.getByRole('dialog');
	await modal.getByRole('radio', { name: 'Mudar o texto' }).check();
	await modal.getByLabel('Texto novo').fill(texto);
	await modal.getByRole('button', { name: 'Propor', exact: true }).click();
	await expect(alemanha.getByRole('status')).toHaveText('Alteração proposta. As delegações debatem e marcam a posição.');

	await page.reload();
	const alteracoes = page.getByRole('region', { name: /^Alterações propostas/ });
	const linha = alteracoes.getByRole('listitem').filter({ hasText: texto });
	await linha.getByRole('button', { name: 'Incluir' }).click();
	await expect(page.getByRole('status')).toHaveText('Alteração incluída.');
	await expect(page.getByRole('article', { name: 'Agenda do bureau' })).toContainText(texto);

	await page.getByRole('button', { name: 'Registrar a adoção' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Registrar a adoção' }).click();
	await expect(etapaAtual(page)).toContainText('Working papers');
	expect(await projetoLiberado(alemanha)).toBe(true);
});

test('o andamento fica ao incluir um item; retirar a adoção volta ao debate da agenda', async ({ page }) => {
	await entrar(page, MESA);
	await page.goto(AGENDA1);
	const adotada = page.getByRole('article', { name: 'Agenda adotada' });

	const andamento = adotada.getByRole('combobox', { name: 'Andamento de A.1 Atores' });
	await andamento.selectOption('em_debate');
	await expect(andamento).toHaveValue('em_debate');

	// A mesa também propõe; incluída, a agenda muda no lugar.
	const item = `C. Financiamento ${Date.now()}`;
	await adotada.getByRole('button', { name: 'Propor um item no fim' }).click();
	await page.getByRole('dialog').getByLabel('Item novo').fill(item);
	await page.getByRole('dialog').getByRole('button', { name: 'Propor', exact: true }).click();
	await page.getByRole('region', { name: /^Alterações propostas/ }).getByRole('listitem').filter({ hasText: item }).getByRole('button', { name: 'Incluir' }).click();
	await expect(adotada).toContainText(item);
	await expect(adotada.getByRole('combobox', { name: 'Andamento de A.1 Atores' })).toHaveValue('em_debate');

	await retirarAdocao(page);
	await expect(etapaAtual(page)).toContainText('Agenda');
});
