import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contaDoTreino, isolado } from '../scripts/delegacoes.ts';
import { clienteComo, entrar } from './ajuda.ts';

// Passo 51 (lote 3): as mensagens como num aplicativo de conversa. A cópia do TREINO só deste
// arquivo; cada projeto marca os seus bilhetes.
const C = isolado('51');
const BRASIL = C.conta(contaDoTreino('Brasil'));
const CHILE = C.conta(contaDoTreino('Chile'));
const MESA = C.conta('mesa-treino@exemplo.test');
const MENSAGENS = `/comite/${C.sigla}/mensagens`;

test.beforeEach(({}, info) => {
	test.skip(info.project.name === 'telao', 'o telão não tem mensagens');
});

async function chileEscreve(texto: string) {
	const chile = await clienteComo(CHILE);
	const comite = (await chile.from('comite').select('id').eq('sigla', C.sigla).single()).data!.id;
	const brasil = (await chile.from('delegacao').select('id').eq('comite_id', comite).eq('nome', 'Brasil').single()).data!.id;
	const { error } = await chile.rpc('enviar_mensagem', { p_id: crypto.randomUUID(), p_comite: comite, p_tipo: 'bilhete', p_texto: texto, p_para: brasil });
	expect(error).toBeNull();
	return { chile, comite };
}

test('a conversa: balões com quem escreveu, separador da sessão, Enter envia, e o que chega aparece sem recarregar', async ({ page }, info) => {
	test.skip(info.project.name !== 'notebook', 'o celular está no teste seguinte');
	const marca = `${Date.now()}`;
	const mesa = await clienteComo(MESA);
	const comite = (await mesa.from('comite').select('id').eq('sigla', C.sigla).single()).data!.id;
	await mesa.rpc('abrir_sessao', { p_comite: comite });
	await chileEscreve(`Café no intervalo? ${marca}`);

	await entrar(page, BRASIL);
	await page.goto(MENSAGENS);
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	// A conversa mais recente já vem aberta no notebook.
	const conversa = page.getByRole('region', { name: 'Chile' });
	const balao = conversa.locator('.balao--outro').filter({ hasText: `Café no intervalo? ${marca}` });
	await expect(balao).toContainText('Chile');
	await expect(conversa.getByRole('listitem').filter({ hasText: /^Sessão \d+ · / }).first()).toBeVisible();

	// Enter envia; o balão é meu, à direita.
	const escrever = conversa.getByRole('textbox', { name: 'Escrever para Chile' });
	await escrever.fill(`Combinado ${marca}`);
	await escrever.press('Enter');
	await expect(conversa.locator('.balao--meu').filter({ hasText: `Combinado ${marca}` })).toContainText('Você');
	await expect(escrever).toHaveValue('');

	// A resposta chega na conversa aberta, sem recarregar.
	await chileEscreve(`Às 15h ${marca}`);
	await expect(conversa.locator('.balao--outro').filter({ hasText: `Às 15h ${marca}` })).toBeVisible({ timeout: 10_000 });

	// A 1366 × 768, quem rola é a coluna, não a página.
	const rola = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
	expect(rola).toBeLessThanOrEqual(1);
	for (const tema of ['light', 'dark'] as const) {
		// Recarrega: trocar o tema com a página aberta pega as cores no meio da transição.
		await page.emulateMedia({ colorScheme: tema });
		await page.reload();
		await expect(conversa.locator('.balao--meu').first()).toBeVisible();
		expect((await new AxeBuilder({ page }).include('.chat').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
	}
});

test('no celular, a lista e a conversa uma de cada vez, com "Voltar"; a não lida tem o ponto', async ({ page }, info) => {
	test.skip(info.project.name !== 'celular', 'o notebook está no teste anterior');
	const marca = `${Date.now()}`;
	await chileEscreve(`Bom dia ${marca}`);
	await entrar(page, BRASIL);
	await page.goto(MENSAGENS);
	const lista = page.getByRole('region', { name: 'Conversas' });
	const item = lista.getByRole('button', { name: /Chile/ });
	await expect(item).toContainText('não lida');
	await item.click();
	const conversa = page.getByRole('region', { name: 'Chile' });
	await expect(conversa.locator('.balao--outro').filter({ hasText: `Bom dia ${marca}` })).toBeVisible();
	await expect(lista).toBeHidden();
	await conversa.getByRole('button', { name: 'Voltar' }).click();
	await expect(lista).toBeVisible();
	await expect(item).not.toContainText('não lida');
});
