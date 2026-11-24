import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contaDoTreino, isolado } from '../scripts/delegacoes.ts';
import { clienteComo, entrar, escolher, desfazerRapido } from './ajuda.ts';

// Passo 47 (item 8): o cabeçalho com ícones. Só a lupa e o sino ficam sem texto; no celular,
// tema, idioma, Perfil e Sair ficam em "Mais". A conta é do comitê isolado 47: trocar o
// idioma de uma conta compartilhada mudaria os testes que rodam em paralelo.
const CHILE = isolado('47').conta(contaDoTreino('Chile'));

test.beforeEach(({}, info) => {
	test.skip(info.project.name === 'telao', 'o telão não tem cabeçalho');
});

test('a lupa e o sino têm nome; tema e idioma trocam na hora; Tab percorre tudo', async ({ page }, info) => {
	await entrar(page, CHILE);
	const cabecalho = page.getByRole('banner');
	await expect(cabecalho.getByRole('button', { name: 'Ir para…' })).toBeVisible();
	await expect(cabecalho.getByRole('link', { name: 'Avisos' })).toHaveAttribute('href', '/avisos');
	if (info.project.name === 'celular') {
		// No celular, tema, idioma, Perfil e Sair ficam em "Mais", com texto.
		await expect(cabecalho.getByRole('button', { name: 'Sair', exact: true })).toBeHidden();
		await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Mais', exact: true }).click();
		await expect(page.getByRole('main').getByRole('button', { name: /^Sair/ })).toBeVisible();
		await page.getByRole('main').getByRole('button', { name: /^Usar o tema/ }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', /dark|light/);
		return;
	}
	await cabecalho.getByRole('button', { name: /^Usar o tema/ }).click();
	const tema = await page.locator('html').getAttribute('data-theme');
	expect(tema).toMatch(/dark|light/);
	await cabecalho.getByRole('button', { name: /^Usar o tema/ }).click();
	await expect(page.locator('html')).not.toHaveAttribute('data-theme', tema!);

	// Idioma: um clique troca o app inteiro, e outro volta.
	await cabecalho.getByRole('button', { name: 'Switch the app to English' }).click();
	await expect(cabecalho.getByRole('link', { name: 'Profile' })).toBeVisible();
	await cabecalho.getByRole('button', { name: 'Mudar o app para português' }).click();
	await expect(cabecalho.getByRole('link', { name: 'Perfil' })).toBeVisible();

	// Tab passa pela lupa, pelo sino, pelo tema, pelo idioma, pelo Perfil e pelo Sair.
	await cabecalho.getByRole('button', { name: 'Ir para…' }).focus();
	const nomes: string[] = [];
	for (let i = 0; i < 7; i++) {
		await page.keyboard.press('Tab');
		nomes.push(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim() ?? ''));
	}
	expect(nomes).toEqual(expect.arrayContaining(['Avisos', 'Perfil', 'Sair']));
	expect((await new AxeBuilder({ page }).include('header').analyze()).violations).toEqual([]);
});

test('"Ir para…" acha comitês, e documentos e matérias só chegam quando a pessoa digita', async ({ page }, info) => {
	test.skip(info.project.name !== 'notebook', 'uma tela basta');
	await entrar(page, CHILE);
	const pesados: string[] = [];
	page.on('request', (r) => {
		// Só as leituras do "Ir para…" (a Agora também lê documentos, para saber se há votação).
		const url = decodeURIComponent(r.url());
		if (/\/rest\/v1\/(documento\?select=id,tipo,numero,titulo|noticia\?select=id,titulo,veiculo)/.test(url)) pesados.push(url);
	});
	await page.keyboard.press('Control+K');
	const busca = page.getByRole('dialog', { name: 'Ir para…' });
	await expect(busca.getByRole('searchbox')).toBeFocused();
	expect(pesados, pesados.join('\n')).toEqual([]);

	await busca.getByRole('searchbox').pressSequentially('treino-47');
	await expect(busca.getByRole('link', { name: /^TREINO-47/ })).toBeVisible();
	// Uma leitura de documentos e uma de matérias, por mais teclas que a pessoa digite.
	await expect.poll(() => pesados.length).toBe(2);
	expect((await new AxeBuilder({ page }).include('dialog[open]').analyze()).violations).toEqual([]);
});

test('um bilhete não enviado sai da caixa com "Remover", e "Desfazer" o traz de volta', async ({ page, context }, info) => {
	test.skip(info.project.name !== 'notebook', 'uma tela basta');
	const texto = `Bilhete que não vai sair ${Date.now()}`;
	await desfazerRapido(page);
	await entrar(page, CHILE);
	await page.goto(`/comite/${isolado('47').sigla}/mensagens`);
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	await context.setOffline(true);
	const novo = page.getByRole('form', { name: 'Novo bilhete' });
	await escolher(novo, 'Para', 'Brasil');
	await novo.getByLabel('Bilhete').fill(texto);
	await novo.getByRole('button', { name: 'Enviar bilhete' }).click();

	await page.getByRole('banner').getByRole('button', { name: '1 para enviar' }).click();
	const caixa = page.getByRole('dialog', { name: 'Não enviados' });
	await expect(caixa).toContainText('Bilhete para Brasil');
	await caixa.getByRole('button', { name: 'Remover: Bilhete para Brasil' }).click();
	await caixa.getByRole('button', { name: 'Desfazer' }).click();
	await caixa.getByRole('button', { name: 'Remover: Bilhete para Brasil' }).click();
	await expect(caixa).toContainText('Nada esperando.');
	await expect(page.getByRole('banner').getByRole('button', { name: /para enviar/ })).toHaveCount(0);

	// Com a rede de volta, nada sai: o bilhete foi removido do aparelho.
	await context.setOffline(false);
	const chile = await clienteComo(CHILE);
	await expect.poll(async () => (await chile.from('mensagem').select('id').eq('texto', texto)).data?.length, { timeout: 5_000 }).toBe(0);
});
