import { expect, test } from '@playwright/test';
import { contaDaDelegacao } from '../scripts/delegacoes.ts';
import { CONTAS, entrar, escolher, abrirAcao } from './ajuda.ts';

// Passo 34: o caderno da delegação. Os EUA (dois delegados no seed) anotam sobre o Irã,
// compartilham com a França, e a França só lê. Comitê CSNU-T.
const CADERNO = '/comite/CSNU-T/caderno';
const TEXTO = `O Irã deve se opor à resolução ${Date.now()}`;

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'o caderno de teste é um só');
});

test('os EUA anotam sobre o Irã, o outro delegado vê, e a França lê só o compartilhado', async ({ page, browser }) => {
	await entrar(page, CONTAS.delegado);
	await page.goto(CADERNO);
	await page.getByRole('tab', { name: 'Sobre as delegações' }).click();
	await abrirAcao(page, 'Nova anotação');
	const formulario = page.getByRole('form', { name: 'Nova anotação' });
	await escolher(formulario, 'Sobre a delegação', 'Irã');
	await formulario.getByLabel('Anotação').fill(TEXTO);
	await formulario.getByRole('button', { name: 'Salvar no caderno' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Anotação salva.' })).toBeVisible();
	const anotacao = page.getByRole('listitem').filter({ hasText: TEXTO });
	await expect(anotacao).toBeVisible();

	// O segundo delegado dos EUA vê a mesma anotação, ao vivo.
	const outro = await (await browser.newContext()).newPage();
	await entrar(outro, 'delegado16@exemplo.test');
	await outro.goto(CADERNO);
	await outro.getByRole('tab', { name: 'Sobre as delegações' }).click();
	await expect(outro.getByText(TEXTO)).toBeVisible();

	// Compartilhar com a França: ela lê, mas não ganha botões.
	// Passo 51: com bandeiras e modal; salva ao fechar a lista.
	await anotacao.getByRole('button', { name: 'Compartilhar: Compartilhada com' }).click();
	const lista = page.getByRole('dialog', { name: 'Compartilhada com' });
	await lista.getByRole('checkbox', { name: /^França/ }).check();
	await lista.getByRole('button', { name: 'Pronto' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Compartilhamento salvo.' })).toBeVisible();

	const franca = await (await browser.newContext()).newPage();
	await entrar(franca, contaDaDelegacao('França'));
	await franca.goto(CADERNO);
	const recebidas = franca.getByRole('region', { name: 'Compartilhadas com a sua delegação' });
	await expect(recebidas).toContainText(TEXTO);
	await expect(recebidas).toContainText('De EUA');
	// Só leitura: dá para abrir inteira (passo 66), não para apagar nem compartilhar.
	await expect(recebidas.getByRole('button', { name: /Apagar|Compartilhar/ })).toHaveCount(0);
	await expect(recebidas.getByRole('button', { name: 'Ler' })).not.toHaveCount(0);

	// O Irã, que não recebeu, não vê.
	const ira = await (await browser.newContext()).newPage();
	await entrar(ira, contaDaDelegacao('Irã'));
	await ira.goto(CADERNO);
	await expect(ira.getByText(TEXTO)).toHaveCount(0);
});

test('o rascunho de fala mostra a duração estimada e abre em letra grande', async ({ page }) => {
	await entrar(page, CONTAS.delegado);
	await page.goto(CADERNO);
	await page.getByRole('tab', { name: 'Falas' }).click();
	await abrirAcao(page, 'Escrever fala');
	const formulario = page.getByRole('form', { name: 'Nova anotação' });
	await formulario.getByLabel('Título da fala').fill('Abertura');
	await formulario.getByLabel('Texto da fala').fill(Array(130).fill('palavra').join(' '));
	await expect(formulario).toContainText(/~1:00 de \d+:\d\d de tempo de fala/);
	await formulario.getByRole('button', { name: 'Salvar no caderno' }).click();
	await page.getByRole('listitem').filter({ hasText: 'Abertura' }).first().getByRole('button', { name: 'Usar na próxima fala' }).click();
	await expect(page.getByRole('dialog', { name: 'Texto da fala' })).toContainText('Abertura');
});
