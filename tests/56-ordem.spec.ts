import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { isolado } from '../scripts/delegacoes.ts';
import { adotarAgenda, clienteComo, comiteEmDebate, entrar } from './ajuda.ts';

// Passo 56: a ordem do tópico (agenda → working papers → projeto → resolução), a aba Agenda
// sem sintaxe e a aba Documentos pela ordem. A cópia do CE-T só deste arquivo.
const C = isolado('56');
const MESA = C.conta('mesa-ce@exemplo.test');
const ALEMANHA = C.conta('ce-alemanha@exemplo.test');
const FRANCA = C.conta('ce-franca@exemplo.test');
const AGENDA = `/comite/${C.sigla}/sessao/agenda`;
const marca = Date.now();
let comite = '';

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a agenda do comitê de teste é uma só');
});

test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const debate = await comiteEmDebate(MESA, C.sigla, ALEMANHA);
	comite = debate.comite;
	// Banco reaproveitado: o tópico 1 começa sem agenda adotada.
	const adotada = (await debate.mesa.from('proposta_agenda').select('id').eq('comite_id', comite).eq('topico', 1).eq('adotada', true)).data ?? [];
	for (const p of adotada) await debate.mesa.rpc('retirar_adocao', { p_proposta: p.id });
	// Passo 60: a agenda do bureau do tópico 1 volta aos três itens (sem o que outras rodadas incluíram).
	await debate.mesa.rpc('salvar_proposta_agenda', {
		p_comite: comite,
		p_topico: 1,
		p_itens: [
			{ texto: 'A. Causas', nivel: 0 },
			{ texto: 'A.1 Atores', nivel: 1 },
			{ texto: 'B. Respostas', nivel: 0 }
		]
	});
});

const etapaAtual = (page: Page) => page.getByRole('navigation', { name: 'Ordem do tópico 1' }).locator('[aria-current="step"]');
const semRolar = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1);

test('a mesa cadastra a agenda do bureau pelo teclado e a libera; a delegação propõe; a mesa inclui e registra; a trilha muda na sessão', async ({ page, browser }) => {
	await entrar(page, ALEMANHA);
	await page.goto(`/comite/${C.sigla}/sessao`);
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	await expect(etapaAtual(page)).toContainText('Agenda');

	// A mesa: o editor de itens só com botões e teclado.
	const mesa = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
	await entrar(mesa, MESA);
	await mesa.goto(`${AGENDA}?topico=1`);
	const cadastrar = mesa.getByRole('button', { name: 'Cadastrar a agenda do bureau' });
	const editar = mesa.getByRole('button', { name: 'Editar', exact: true });
	await expect(cadastrar.or(editar).or(mesa.getByRole('button', { name: 'Registrar a adoção' }))).toBeVisible();
	if (await cadastrar.isVisible()) await cadastrar.click();
	else if (await editar.isVisible()) await editar.click();
	const editor = mesa.getByRole('dialog', { name: 'Agenda do bureau' });
	if (await editor.isVisible()) {
		while ((await editor.getByLabel(/^Item \d+,/).count()) > 1) await editor.getByRole('button', { name: 'Tirar: item 1' }).click();
		const primeiro = editor.getByLabel(/^Item 1,/);
		await primeiro.fill('A. Causas');
		await primeiro.press('Enter');
		await expect(editor.getByLabel(/^Item 2,/)).toBeFocused();
		await mesa.keyboard.type('A.1 Atores');
		await mesa.keyboard.press('Tab');
		await expect(editor.getByLabel('Item 2, nível 2')).toBeFocused();
		await mesa.keyboard.press('Enter');
		await mesa.keyboard.type('B. Respostas');
		await mesa.keyboard.press('Shift+Tab');
		await expect(editor.getByLabel('Item 3, nível 1')).toHaveValue('B. Respostas');
		await editor.getByRole('button', { name: 'Para cima: item 3' }).click();
		await expect(editor.getByLabel(/^Item 2,/)).toHaveValue('B. Respostas');
		await editor.getByRole('button', { name: 'Para baixo: item 2' }).click();
		await expect(editor.getByLabel('Item 2, nível 2')).toHaveValue('A.1 Atores');
		expect((await new AxeBuilder({ page: mesa }).include('dialog[open]').analyze()).violations).toEqual([]);
		await editor.getByRole('button', { name: 'Salvar a agenda do bureau' }).click();
		await expect(mesa.getByRole('status')).toHaveText('Agenda do bureau salva.');
	}
	const liberar = mesa.getByRole('button', { name: 'Liberar a agenda' });
	if (await liberar.isVisible()) {
		await liberar.click();
		await mesa.getByRole('dialog').getByRole('button', { name: 'Liberar a agenda' }).click();
	}
	await expect(mesa.getByRole('article', { name: /^Agenda/ }).getByRole('listitem').filter({ hasText: 'A. Causas' }).getByRole('listitem')).toHaveText(/A\.1 Atores/);

	// A Alemanha propõe incluir um item; a mesa inclui e registra a adoção.
	const item = `C. Financiamento ${marca}`;
	const agenda = await page.context().newPage();
	await agenda.goto(`${AGENDA}?topico=1`);
	await agenda.getByRole('button', { name: 'Propor um item no fim' }).click();
	await agenda.getByRole('dialog').getByLabel('Item novo').fill(item);
	await agenda.getByRole('dialog').getByRole('button', { name: 'Propor', exact: true }).click();
	await expect(agenda.getByRole('status')).toHaveText('Alteração proposta. As delegações debatem e marcam a posição.');
	const linha = mesa.getByRole('region', { name: /^Alterações propostas/ }).getByRole('listitem').filter({ hasText: item });
	await linha.getByRole('button', { name: 'Incluir' }).click({ timeout: 10_000 });
	await expect(mesa.getByRole('article', { name: /^Agenda/ })).toContainText(item);
	await mesa.getByRole('button', { name: 'Registrar a adoção' }).click();
	await mesa.getByRole('dialog').getByRole('button', { name: 'Registrar a adoção' }).click();
	await expect(etapaAtual(mesa)).toContainText(/Working papers|Projeto/);
	await mesa.reload(); // a tela em repouso, sem a mensagem de "Agenda adotada."
	await expect(etapaAtual(mesa)).toBeVisible();
	expect(await semRolar(mesa)).toBe(true);
	await mesa.context().close();

	// Na sessão, sem recarregar, a trilha sai da agenda.
	await expect(etapaAtual(page)).toContainText(/Working papers|Projeto/, { timeout: 10_000 });
});

test('o projeto em branco traz pelo modal as cláusulas de working papers do tópico, de dois blocos', async ({ page }) => {
	await adotarAgenda(MESA, C.sigla, 1);
	await adotarAgenda(MESA, C.sigla, 2);
	const alemanha = await clienteComo(ALEMANHA);
	const franca = await clienteComo(FRANCA);
	const mesa = await clienteComo(MESA);
	const ok = <T>(r: { data: T; error: unknown }) => {
		expect(r.error).toBeNull();
		return r.data as NonNullable<T>;
	};
	const blocoA = ok(await alemanha.rpc('criar_bloco', { p_comite: comite, p_nome: `Bloco do Reno ${marca}` }));
	const blocoB = ok(await franca.rpc('criar_bloco', { p_comite: comite, p_nome: `Bloco do Sena ${marca}` }));
	const wp = async (cliente: typeof alemanha, bloco: string, topico: number, texto: string, aprovar: boolean) => {
		const id = ok(await cliente.rpc('criar_documento', { p_bloco: bloco, p_tipo: 'working_paper', p_titulo: `${texto} ${marca}`, p_topico: topico }));
		ok(await cliente.rpc('adicionar_clausula', { p_documento: id, p_tipo: 'operativa', p_texto: `${texto} ${marca}` }));
		if (aprovar) {
			ok(await cliente.rpc('enviar_documento', { p_documento: id }));
			ok(await mesa.rpc('aprovar_documento', { p_documento: id, p_aprovar: true }));
		}
	};
	await wp(alemanha, blocoA, 1, 'Pede um fundo para o Reno', false);
	await wp(franca, blocoB, 1, 'Decide criar um observatório', true);
	await wp(franca, blocoB, 2, 'Outro tópico', true);
	const projeto = ok(await alemanha.rpc('criar_documento', { p_bloco: blocoA, p_tipo: 'projeto', p_titulo: `Projeto do Reno ${marca}`, p_topico: 1 }));

	await entrar(page, ALEMANHA);
	await page.goto(`/documento/${projeto}`);
	await page.getByRole('button', { name: 'Trazer de working papers' }).click();
	const modal = page.getByRole('dialog', { name: 'Trazer cláusulas de working papers' });
	await expect(modal).not.toContainText(`Outro tópico ${marca}`);
	// Os aprovados pela mesa primeiro.
	await expect(modal.getByRole('group').first()).toContainText('Aprovado pela mesa');
	await expect(modal.getByRole('group').last()).not.toContainText('Aprovado pela mesa');
	await modal.getByRole('checkbox', { name: `Pede um fundo para o Reno ${marca}` }).check();
	await modal.getByRole('button', { name: /^Trazer 1 cláusulas/ }).click();
	await expect(page.getByRole('status')).toHaveText('Cláusulas trazidas.');
	await page.getByRole('button', { name: 'Trazer de working papers' }).click();
	await modal.getByRole('group').filter({ hasText: `observatório ${marca}` }).getByRole('button', { name: 'Trazer todas as cláusulas' }).click();
	await expect(page.getByRole('status')).toHaveText('Cláusulas trazidas.');
	await expect(page.locator('.cabecalho-documento')).toContainText('Baseado em');
	await expect(page.locator('.cabecalho-documento')).toContainText(`Decide criar um observatório ${marca}`);
	await expect(page.locator('.cabecalho-documento')).toContainText(`Pede um fundo para o Reno ${marca}`);
});

test('a 1366 × 768, Agenda e Documentos não rolam, e passam no axe nos dois temas', async ({ browser }) => {
	for (const conta of [ALEMANHA, MESA]) {
		for (const tema of ['light', 'dark'] as const) {
			const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 }, colorScheme: tema })).newPage();
			await entrar(page, conta);
			for (const rota of [`${AGENDA}?topico=1`, `/comite/${C.sigla}/documentos`]) {
				await page.goto(rota);
				await expect(page.getByRole('navigation', { name: 'Ordem do tópico 1' })).toBeVisible();
				expect(await semRolar(page), `${conta} em ${rota}`).toBe(true);
				expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
			}
			await page.context().close();
		}
	}
});
