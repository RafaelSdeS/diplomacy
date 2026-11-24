import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contaDoTreino, isolado } from '../scripts/delegacoes.ts';
import { clienteComo, comiteEmDebate, entrar } from './ajuda.ts';

// Passo 47 (item 4): as fichas da votação, do ponto e da nota abrem por cima da tela, sem
// mudar a URL, e a ação da ficha (encerrar a votação, retirar o ponto) funciona dali.
const C = isolado('47');

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a sessão do comitê de teste é uma só');
});

const MESA = C.conta('mesa-treino@exemplo.test');
const PARAGUAI = C.conta(contaDoTreino('Paraguai'));
let comite = '';

test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const { mesa, comite: id } = await comiteEmDebate(MESA, C.sigla, PARAGUAI);
	comite = id;
	// Banco reaproveitado: uma votação que ficou aberta de outra rodada fecha antes.
	const abertas = (await mesa.from('votacao').select('id').eq('comite_id', comite).eq('aberta', true)).data ?? [];
	for (const v of abertas) await mesa.rpc('encerrar_votacao', { p_votacao: v.id });
});

const aoVivo = (page: Page) => expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
const semErrosDeAcessibilidade = async (page: Page) =>
	expect((await new AxeBuilder({ page }).include('dialog[open]').analyze()).violations).toEqual([]);

test('a ficha da votação abre sem mudar a URL, e a mesa encerra a votação dali', async ({ page }) => {
	const mesa = await clienteComo(MESA);
	const objeto = `Pausa para o café ${Date.now()}`;
	expect((await mesa.rpc('abrir_votacao_livre', { p_comite: comite, p_objeto: objeto })).error).toBeNull();

	await entrar(page, MESA);
	await page.goto(`/comite/${C.sigla}/sessao/presidencia`);
	await aoVivo(page);
	const url = page.url();
	await page.getByRole('region', { name: 'Votação aberta' }).getByRole('button', { name: objeto }).click();
	const ficha = page.getByRole('dialog', { name: objeto });
	await expect(ficha).toContainText('Aberta');
	await expect(ficha).toContainText('Não votaram');
	expect(page.url()).toBe(url);
	await semErrosDeAcessibilidade(page);

	await ficha.getByRole('button', { name: 'Encerrar a votação' }).click();
	await page.getByRole('dialog', { name: `Encerrar a votação de ${objeto}?` }).getByRole('button', { name: 'Encerrar a votação' }).click();
	// A ficha continua aberta e mostra o resultado, que chega ao vivo.
	await expect(ficha).toContainText('Rejeitada');
	await expect(ficha.getByRole('button', { name: 'Encerrar a votação' })).toHaveCount(0);
	await page.keyboard.press('Escape');
	await expect(ficha).toBeHidden();
	expect(page.url()).toBe(url);
});

test('a delegação abre a ficha do próprio ponto e o retira dali', async ({ page }) => {
	const detalhe = `Qual é o tempo de fala? ${Date.now()}`;
	const paraguai = await clienteComo(PARAGUAI);
	expect((await paraguai.rpc('enviar_ponto', { p_comite: comite, p_tipo: 'ponto_duvida', p_detalhe: detalhe })).error).toBeNull();

	await entrar(page, PARAGUAI);
	await page.goto(`/comite/${C.sigla}/sessao`);
	await aoVivo(page);
	const url = page.url();
	// O mais novo fica por último (banco reaproveitado: os de outras rodadas já foram retirados).
	await page.getByRole('list', { name: 'Seus pontos e moções' }).getByRole('button', { name: 'Ponto de dúvida' }).last().click();
	const ficha = page.getByRole('dialog', { name: 'Ponto de dúvida' });
	await expect(ficha).toContainText(detalhe);
	await expect(ficha).toContainText('Paraguai');
	await expect(ficha).toContainText('Aguardando o bureau');
	expect(page.url()).toBe(url);
	await semErrosDeAcessibilidade(page);

	await ficha.getByRole('button', { name: 'Retirar' }).click();
	await expect(ficha).toContainText('Retirado');
	await expect(ficha.getByRole('button', { name: 'Retirar' })).toHaveCount(0);
});

test('a ficha da nota mostra o texto inteiro, na página da crise', async ({ page }) => {
	const paraguai = await clienteComo(PARAGUAI);
	const titulo = `Pedido de informações ${Date.now()}`;
	const texto = 'O Paraguai pede os dados das barragens.\nE o calendário das cheias.';
	// Limite de notas pendentes: com uma já esperando de outra rodada, usa ela.
	const pendente = (
		await paraguai.from('nota_crise').select('titulo, texto').eq('comite_id', comite).eq('status', 'pendente').limit(1)
	).data?.[0];
	if (!pendente)
		expect(
			(await paraguai.rpc('enviar_nota', { p_id: crypto.randomUUID(), p_comite: comite, p_tipo: 'nota', p_titulo: titulo, p_texto: texto }))
				.error
		).toBeNull();
	const nota = pendente ?? { titulo, texto };

	await entrar(page, PARAGUAI);
	await page.goto(`/comite/${C.sigla}/crise`);
	const url = page.url();
	await page.getByRole('button', { name: nota.titulo }).click();
	const ficha = page.getByRole('dialog', { name: nota.titulo });
	await expect(ficha).toContainText(nota.texto.split('\n')[0]);
	await expect(ficha).toContainText('Nota');
	expect(page.url()).toBe(url);
	await semErrosDeAcessibilidade(page);
});
