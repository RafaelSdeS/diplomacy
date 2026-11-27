import { expect, test } from '@playwright/test';
import { contaDoTreino, isolado } from '../scripts/delegacoes.ts';
import { comiteEmDebate, entrar } from './ajuda.ts';

// Passo 65: a ata da sessão é da mesa. Traz a presença, os pontos e moções, as votações e as
// propostas decididas nos working papers. Cópia do TREINO só deste arquivo.
const C = isolado('65');
const MESA = C.conta('mesa-treino@exemplo.test');
const BRASIL = C.conta(contaDoTreino('Brasil'));

test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a ata é uma página de impressão, a mesma em qualquer tela');
});

test('a mesa abre a ata da sessão pelo Comitê; a delegação não vê nem abre', async ({ page, browser }) => {
	// A sessão aberta, todas presentes e a moção do tópico votada na plenária.
	await comiteEmDebate(MESA, C.sigla, BRASIL);

	await entrar(page, MESA);
	await page.goto(`/comite/${C.sigla}`);
	await page.getByRole('link', { name: /Atas das sessões/ }).click();
	const ata = page.getByRole('article', { name: 'Ata da sessão' });
	await expect(ata.getByRole('heading', { level: 1 })).toHaveText(/^Ata da sessão \d+$/);
	await expect(ata).toContainText('6 de 6 presentes');
	await expect(ata).toContainText('Moção de introdução do tópico no topo da agenda: tópico 1');
	await expect(ata).toContainText(/Aprovada: \d+ a favor/);

	const brasil = await (await browser.newContext()).newPage();
	await entrar(brasil, BRASIL);
	await brasil.goto(`/comite/${C.sigla}`);
	await expect(brasil.getByRole('link', { name: /Atas das sessões/ })).toHaveCount(0);
	await brasil.goto(`/imprimir/ata/${C.sigla}`);
	await expect(brasil.getByText('A ata da sessão é da mesa.')).toBeVisible();
});
