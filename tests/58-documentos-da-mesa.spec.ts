import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { isolado } from '../scripts/delegacoes.ts';
import { clienteComo, entrar } from './ajuda.ts';

// Passo 58: a mesa escreve e publica um documento; a delegação lê ao vivo e vê o que mudou;
// quem salva por cima de outra pessoa da mesa escolhe. A cópia do CE-T só deste arquivo.
const C = isolado('58');
const MESA = C.conta('mesa-ce@exemplo.test');
const ALEMANHA = C.conta('ce-alemanha@exemplo.test');
const DOCUMENTOS = `/comite/${C.sigla}/documentos`;

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'os documentos do comitê de teste são um só conjunto');
});

const semViolacoes = async (page: import('@playwright/test').Page) =>
	expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);

test('a mesa publica, a delegação lê ao vivo e vê as alterações; o conflito de duas pessoas da mesa', async ({ page, browser }) => {
	const titulo = `Roteiro do dia ${Date.now()}`;
	await entrar(page, MESA);
	await page.goto(DOCUMENTOS);
	await page.getByRole('region', { name: 'Seus documentos, DPOs e cartas' }).getByRole('article', { name: /^Da mesa/ }).getByRole('button', { name: 'Ver todos' }).click();
	const lista = page.getByRole('dialog', { name: 'Da mesa' });
	await lista.getByRole('textbox', { name: 'Novo documento da mesa' }).fill(titulo);
	await lista.getByRole('button', { name: 'Criar e escrever' }).click();
	await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();

	const escrita = page.getByRole('form', { name: 'Escrever o documento' });
	await escrita.getByRole('textbox', { name: /^Texto/ }).fill('# Manhã\n\n- Tópico **1** às 9h');
	await expect(page.getByRole('region', { name: 'Prévia' }).getByRole('heading', { name: 'Manhã' })).toBeVisible();
	await escrita.getByRole('button', { name: 'Publicar', exact: true }).click();
	await escrita.getByRole('button', { name: 'Confirmar: publicar para o comitê' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Publicado para o comitê.' })).toBeVisible();
	await semViolacoes(page);

	// A delegação vê "Novo" na aba Documentos e lê.
	const alemanha = await (await browser.newContext()).newPage();
	await entrar(alemanha, ALEMANHA);
	await alemanha.goto(DOCUMENTOS);
	const daMesa = alemanha.getByRole('article', { name: /^Da mesa/ });
	await expect(daMesa).toContainText(titulo);
	await expect(daMesa).toContainText('Novo');
	await daMesa.getByRole('link', { name: titulo }).click();
	const leitura = alemanha.getByRole('article', { name: titulo });
	await expect(leitura.getByRole('listitem')).toHaveText('Tópico 1 às 9h');
	await expect(alemanha.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	await semViolacoes(alemanha);

	// Outra pessoa da mesa (aqui, pela API) salva antes: quem salva depois vê a diferença e escolhe.
	const mesaApi = await clienteComo(MESA);
	const id = page.url().split('/').at(-1)!;
	const { data: r } = await mesaApi.from('documento_mesa_rascunho').select('versao').eq('documento_id', id).single();
	expect((await mesaApi.rpc('salvar_documento_mesa', { p_documento: id, p_titulo: titulo, p_corpo: '# Manhã\n\n- Tópico 1 às 10h', p_versao: r!.versao })).error).toBeNull();
	await escrita.getByRole('textbox', { name: /^Texto/ }).fill('# Manhã\n\n- Tópico 2 às 9h');
	await escrita.getByRole('button', { name: 'Salvar rascunho' }).click();
	const conflito = page.getByRole('region', { name: /salvou este documento às/ });
	await expect(conflito.locator('del').filter({ hasText: '10h' })).toBeVisible();
	await conflito.getByRole('button', { name: 'Manter o meu texto' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Rascunho salvo.' })).toBeVisible();
	await escrita.getByRole('button', { name: 'Publicar alterações' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Publicado para o comitê.' })).toBeVisible();

	// A delegação, sem recarregar, vê o texto novo e o que mudou.
	await expect(leitura.getByRole('listitem')).toHaveText('Tópico 2 às 9h', { timeout: 10_000 });
	await expect(alemanha.getByText('Atualizado agora')).toBeVisible();
	await alemanha.getByRole('button', { name: 'Ver alterações' }).click();
	const alteracoes = alemanha.getByRole('dialog', { name: 'Alterações' });
	await expect(alteracoes.locator('del').filter({ hasText: '**1**' })).toBeVisible();
	await expect(alteracoes.locator('ins').filter({ hasText: '2' })).toBeVisible();
	await alemanha.context().close();
});
