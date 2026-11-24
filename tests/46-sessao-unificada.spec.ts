import { expect, test, type Page } from '@playwright/test';
import { contaDoTreino, isolado } from '../scripts/delegacoes.ts';
import { clienteComo, comiteEmDebate, entrar } from './ajuda.ts';

// Passo 46: a nota rápida e a próxima fala ficam sempre à vista na sessão, guardam o
// contexto de quando começaram e não se perdem com a troca de orador, a reconexão ou a
// recarga; a Agora mostra o que espera cada papel.
const C = isolado('46');

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a sessão do comitê de teste é uma só');
});

const MESA = C.conta('mesa-treino@exemplo.test');
const PARAGUAI = C.conta(contaDoTreino('Paraguai'));
const SESSAO = `/comite/${C.sigla}/sessao`;

let comite = '';
let delegacoes: Record<string, string> = {};
test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const { mesa, comite: id } = await comiteEmDebate(MESA, C.sigla, PARAGUAI);
	comite = id;
	const lidas = (await mesa.from('delegacao').select('id, nome').eq('comite_id', comite)).data!;
	delegacoes = Object.fromEntries(lidas.map((d) => [d.nome, d.id]));
});

async function darPalavra(nome: string) {
	const mesa = await clienteComo(MESA);
	expect((await mesa.rpc('dar_palavra', { p_comite: comite, p_delegacao: delegacoes[nome], p_seg: 60 })).error).toBeNull();
}

const aoVivo = (page: Page) => expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });

test('a nota rápida não se perde com a troca de orador, a reconexão e a recarga', async ({ page }) => {
	await darPalavra('Brasil');
	await entrar(page, PARAGUAI);
	await page.goto(SESSAO);
	await aoVivo(page);
	// Passo 51: um botão "Anotar" abre a nota num modal; o rascunho continua guardado.
	const anotar = page.getByRole('main').getByRole('button', { name: 'Anotar', exact: true });
	const nota = page.getByRole('dialog', { name: 'Anotar' });
	await expect(anotar).toBeInViewport();
	await anotar.click();

	await nota.getByRole('radio', { name: 'Sobre Brasil' }).check();
	const texto = `O Brasil propõe um fundo para as barragens ${Date.now()}`;
	await nota.getByLabel('Nota rápida').fill(texto);
	await expect(nota).toContainText('Brasil com a palavra');

	// Outro orador: o texto fica, e a nota continua sendo sobre o Brasil.
	await darPalavra('Chile');
	await expect(page.getByRole('article', { name: 'Com a palavra' })).toContainText('Chile');
	await expect(nota.getByLabel('Nota rápida')).toHaveValue(texto);
	await expect(nota.getByRole('radio', { name: 'Sobre Brasil' })).toBeChecked();

	await page.context().setOffline(true);
	await page.context().setOffline(false);
	await aoVivo(page);
	await expect(nota.getByLabel('Nota rápida')).toHaveValue(texto);
	await page.reload();
	await aoVivo(page);
	await anotar.click();
	await nota.getByRole('radio', { name: 'Sobre Brasil' }).check();
	await expect(nota.getByLabel('Nota rápida')).toHaveValue(texto);

	await nota.getByRole('button', { name: 'Guardar no caderno' }).click();
	await expect(page.getByText('Anotado no caderno.')).toBeVisible();
	await expect(nota).toBeHidden();
	await anotar.click();
	await expect(nota.getByLabel('Nota rápida')).toHaveValue('');
	const salva = (await (await clienteComo(PARAGUAI)).from('anotacao').select('tipo, sobre_delegacao_id, orador_delegacao_id, topico').eq('texto', texto).single()).data!;
	expect(salva).toEqual({ tipo: 'sobre', sobre_delegacao_id: delegacoes.Brasil, orador_delegacao_id: delegacoes.Brasil, topico: 1 });
});

test('a próxima fala é uma só no caderno: guardar de novo atualiza a mesma', async ({ page }) => {
	await entrar(page, PARAGUAI);
	await page.goto(SESSAO);
	await aoVivo(page);
	const anotar = page.getByRole('main').getByRole('button', { name: 'Anotar', exact: true });
	const nota = page.getByRole('dialog', { name: 'Anotar' });
	await anotar.click();
	await nota.getByRole('radio', { name: 'Minha próxima fala' }).check();
	const campo = nota.getByLabel('Rascunho da próxima fala');
	const marca = String(Date.now());
	await campo.fill(`Senhora presidente, ${marca}.`);
	await nota.getByRole('button', { name: 'Guardar no caderno' }).click();
	await expect(page.getByText('Fala guardada no caderno.')).toBeVisible();
	await anotar.click();
	await campo.fill(`Senhora presidente, ${marca}. O Paraguai propõe uma comissão.`);
	await nota.getByRole('button', { name: 'Guardar no caderno' }).click();
	await anotar.click();
	await expect(campo).toHaveValue(/comissão/);

	const delegado = await clienteComo(PARAGUAI);
	await expect
		.poll(async () => (await delegado.from('anotacao').select('texto').eq('tipo', 'fala').like('texto', `%${marca}%`)).data)
		.toEqual([{ texto: `Senhora presidente, ${marca}. O Paraguai propõe uma comissão.` }]);
	// Apagar o texto começa outra fala.
	await campo.fill('');
});

test('no celular, o botão "Anotar" abre a nota, e o rascunho fica guardado', async ({ browser }) => {
	const page = await (await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true })).newPage();
	await entrar(page, PARAGUAI);
	await page.goto(SESSAO);
	await aoVivo(page);
	const anotar = page.getByRole('main').getByRole('button', { name: 'Anotar', exact: true });
	const nota = page.getByRole('dialog', { name: 'Anotar' });
	await anotar.click();
	await expect(nota.getByLabel('Nota rápida')).toBeFocused();
	await nota.getByLabel('Nota rápida').fill('Ver o mapa das barragens.');
	await nota.getByRole('button', { name: 'Fechar', exact: true }).click();
	await expect(page.getByRole('main').getByText('rascunho guardado')).toBeVisible();
	await page.context().close();
});

test('a Agora mostra o ponto que espera a mesa, e a mesa tem três atalhos', async ({ browser }) => {
	const paraguai = await clienteComo(PARAGUAI);
	expect((await paraguai.rpc('enviar_ponto', { p_comite: comite, p_tipo: 'ponto_duvida' })).error).toBeNull();
	const page = await (await browser.newContext()).newPage();
	await entrar(page, PARAGUAI);
	const precisa = page.getByRole('article', { name: 'Precisa de você' });
	await expect(precisa.getByRole('link', { name: 'Seu ponto ou moção espera a mesa' })).toHaveAttribute('href', SESSAO);

	const pontos = (await paraguai.from('ponto_mocao').select('id').eq('comite_id', comite).eq('status', 'aberto')).data!;
	for (const p of pontos) await paraguai.rpc('retirar_ponto', { p_ponto: p.id });
	await page.reload();
	await expect(precisa.getByRole('link', { name: 'Seu ponto ou moção espera a mesa' })).toHaveCount(0);

	await page.context().clearCookies();
	await page.evaluate(() => localStorage.clear());
	await entrar(page, MESA);
	const mesa = page.getByRole('article', { name: `Mesa · ${C.sigla}` });
	await expect(mesa.getByRole('link')).toHaveText(['Chegadas a confirmar', 'Pedidos para o bureau', 'Documentos enviados à mesa', 'Abrir o painel']);
	await page.context().close();
});
