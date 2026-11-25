import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contaDoTreino, isolado } from '../scripts/delegacoes.ts';
import { adotarAgenda, clienteComo, entrar, noCentro } from './ajuda.ts';

// Passo 55: todo país abre a ficha, e a ficha mostra as minhas anotações sobre ele (da
// delegação ou da mesa). A cópia do TREINO só deste arquivo.
const C = isolado('55');
const MESA = C.conta('mesa-treino@exemplo.test');
const conta = (nome: string) => C.conta(contaDoTreino(nome));

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'uma tela basta; o comitê de teste é um só');
});

let comite = '';
let documento = '';
let bloco = '';
const ids = new Map<string, string>();
const marca = Date.now();

test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const paraguai = await clienteComo(conta('Paraguai'));
	const chile = await clienteComo(conta('Chile'));
	comite = (await paraguai.from('comite').select('id').eq('sigla', C.sigla).single()).data!.id;
	for (const d of (await paraguai.from('delegacao').select('id, nome').eq('comite_id', comite)).data!) ids.set(d.nome, d.id);
	bloco = (await paraguai.rpc('criar_bloco', { p_comite: comite, p_nome: `Bloco do Chaco ${marca}` })).data!;
	expect((await chile.rpc('entrar_bloco', { p_bloco: bloco })).error).toBeNull();
	await adotarAgenda(MESA, C.sigla, 1);
	const doc = await paraguai.rpc('criar_documento', { p_bloco: bloco, p_tipo: 'working_paper', p_titulo: `Águas do Chaco ${marca}`, p_topico: 1 });
	expect(doc.error).toBeNull();
	documento = doc.data!;
	for (const c of [paraguai, chile]) expect((await c.rpc('assinar', { p_documento: documento, p_assinar: true })).error).toBeNull();
	const bilhete = { p_id: crypto.randomUUID(), p_comite: comite, p_tipo: 'bilhete', p_texto: `Conversamos sobre o Chaco? ${marca}`, p_para: ids.get('Brasil') };
	expect((await paraguai.rpc('enviar_mensagem', bilhete)).error).toBeNull();
});

/** Clica no país, confere a ficha no centro e que fechar devolve o foco a quem abriu. */
async function abreAFicha(page: Page, botao: Locator, nome: string) {
	await botao.click();
	const ficha = page.getByRole('dialog', { name: nome });
	await expect(ficha).toBeVisible();
	await noCentro(ficha);
	await page.keyboard.press('Escape');
	await expect(ficha).toBeHidden();
	await expect(botao).toBeFocused();
}

async function fichaPelaBusca(page: Page, nome: string) {
	// O atalho só vale com a página pronta: tenta de novo até o "Ir para…" abrir.
	await expect(async () => {
		await page.keyboard.press('Control+K');
		await expect(page.getByRole('dialog', { name: 'Ir para…' })).toBeVisible({ timeout: 1000 });
	}).toPass();
	await page.getByRole('dialog', { name: 'Ir para…' }).getByRole('searchbox').fill(nome);
	await page.getByRole('dialog', { name: 'Ir para…' }).getByRole('button', { name: nome }).click();
	const ficha = page.getByRole('dialog', { name: nome });
	await expect(ficha).toBeVisible();
	return ficha;
}

test('membro do bloco, remetente do bilhete e signatário abrem a ficha certa', async ({ page }) => {
	await entrar(page, conta('Brasil'));
	await page.goto(`/comite/${C.sigla}/blocos`);
	const cartao = page.getByRole('article', { name: `Bloco Bloco do Chaco ${marca}` });
	await abreAFicha(page, cartao.getByRole('button', { name: 'Chile' }), 'Chile');

	await page.goto(`/comite/${C.sigla}/mensagens`);
	await abreAFicha(page, page.locator('.conversas').getByRole('button', { name: 'Paraguai' }).first(), 'Paraguai');

	// O rascunho só o bloco vê: o Paraguai abre o documento.
	await page.context().clearCookies();
	await page.evaluate(() => localStorage.clear());
	await entrar(page, conta('Paraguai'));
	await page.goto(`/documento/${documento}`);
	await abreAFicha(page, page.getByRole('region', { name: 'Assinaturas' }).getByRole('button', { name: 'Chile' }), 'Chile');
});

test('a anotação feita pelo "Anotar" aparece na ficha, e a compartilhada só para quem recebeu', async ({ page, browser }) => {
	const texto = `Chile quer cotas de água ${marca}`;
	await entrar(page, conta('Brasil'));
	await page.goto(`/comite/${C.sigla}`);
	let ficha = await fichaPelaBusca(page, 'Chile');
	const notas = ficha.getByRole('region', { name: /^Minhas anotações/ });
	await notas.getByRole('button', { name: 'Anotar' }).click();
	const caderno = page.getByRole('dialog', { name: 'Caderno' });
	await caderno.getByLabel('Anotação').fill(texto);
	await caderno.getByRole('button', { name: 'Guardar no caderno' }).click();
	await expect(caderno.locator('.caderno-notas')).toContainText(texto);
	await caderno.getByRole('button', { name: 'Fechar' }).click();
	await expect(notas).toContainText(texto);

	// Com três notas, a ficha não rola a 1366 × 768 e passa no axe.
	const brasil = await clienteComo(conta('Brasil'));
	for (const n of [2, 3])
		await brasil.rpc('salvar_anotacao', { p_id: crypto.randomUUID(), p_comite: comite, p_tipo: 'sobre', p_texto: `Nota ${n} ${marca}`, p_sobre: ids.get('Chile') });
	await page.keyboard.press('Escape');
	await page.setViewportSize({ width: 1366, height: 768 });
	ficha = await fichaPelaBusca(page, 'Chile');
	// A primeira lista é a das minhas (banco reaproveitado: pode haver compartilhadas de antes).
	await expect(ficha.getByRole('region', { name: /^Minhas anotações/ }).getByRole('list').first().getByRole('listitem')).toHaveCount(3);
	expect(await ficha.evaluate((d) => d.scrollHeight <= d.clientHeight + 1)).toBe(true);
	expect((await new AxeBuilder({ page }).include('dialog[open]').analyze()).violations).toEqual([]);

	// O Paraguai compartilha com o Brasil uma nota sobre o Chile; a Argentina não a vê.
	const paraguai = await clienteComo(conta('Paraguai'));
	const id = crypto.randomUUID();
	const compartilhada = `O Chile cede no tópico 1 ${marca}`;
	await paraguai.rpc('salvar_anotacao', { p_id: id, p_comite: comite, p_tipo: 'sobre', p_texto: compartilhada, p_sobre: ids.get('Chile') });
	expect((await paraguai.rpc('compartilhar_anotacao', { p_id: id, p_delegacoes: [ids.get('Brasil')!] })).error).toBeNull();
	await page.keyboard.press('Escape');
	ficha = await fichaPelaBusca(page, 'Chile');
	await expect(ficha.getByRole('region', { name: /^Minhas anotações/ })).toContainText(new RegExp(`Compartilhadas comigo \\(\\d+\\)\\s*${compartilhada}`));

	const argentina = await (await browser.newContext()).newPage();
	await entrar(argentina, conta('Argentina'));
	await argentina.goto(`/comite/${C.sigla}`);
	const fichaArgentina = await fichaPelaBusca(argentina, 'Chile');
	await expect(fichaArgentina.getByRole('region', { name: /^Minhas anotações/ })).toContainText('Nada anotado ainda.');
	await expect(fichaArgentina).not.toContainText(compartilhada);
	await argentina.context().close();
});

test('a mesa anota na ficha, no caderno da mesa', async ({ page }) => {
	const texto = `Discurso firme do Chile ${marca}`;
	await entrar(page, MESA);
	await page.goto(`/comite/${C.sigla}`);
	const ficha = await fichaPelaBusca(page, 'Chile');
	const notas = ficha.getByRole('region', { name: /^Anotações da mesa/ });
	await expect(notas).not.toContainText(`Chile quer cotas de água ${marca}`);
	await notas.getByRole('button', { name: 'Anotar' }).click();
	const caderno = page.getByRole('dialog', { name: 'Caderno' });
	await expect(caderno).toContainText('Só a mesa do comitê lê');
	await caderno.getByLabel('Anotação').fill(texto);
	await caderno.getByRole('button', { name: 'Guardar no caderno' }).click();
	await caderno.getByRole('button', { name: 'Fechar' }).click();
	await expect(notas).toContainText(texto);
});
