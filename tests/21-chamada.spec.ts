import { expect, test, type Browser, type Page } from '@playwright/test';
import { isolado } from '../scripts/delegacoes.ts';
import AxeBuilder from '@axe-core/playwright';
import { entrar } from './ajuda.ts';

// Passo 39: a cópia do CE-T só deste arquivo (scripts/delegacoes.ts).
const C = isolado('21');

// Passo 21: abrir, fazer a chamada, aceitar quem chega depois e encerrar com resumo.
// Usa o Conselho Europeu de teste (CE-T), para não disputar a sessão do CSNU-T.
const CHAMADA = `/comite/${C.sigla}/sessao/chamada`;
const PAINEL = `/comite/${C.sigla}/sessao/presidencia`;
const SESSAO = `/comite/${C.sigla}/sessao`;
const MESA = C.conta('mesa-ce@exemplo.test');
const ALEMANHA = C.conta('ce-alemanha@exemplo.test');

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a sessão do comitê de teste é uma só');
});

const aoVivo = (page: Page) => expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });

async function abrir(browser: Browser, conta: string, rota: string) {
	const page = await (await browser.newContext()).newPage();
	await entrar(page, conta);
	await page.goto(rota);
	await aoVivo(page);
	return page;
}

/** Banco reaproveitado: encerra a sessão que ficou aberta, para começar do zero. */
async function semSessaoAberta(page: Page) {
	await page.goto(PAINEL);
	await aoVivo(page);
	const encerrar = page.getByRole('button', { name: 'Encerrar sessão' });
	if (await encerrar.isVisible()) {
		await encerrar.click();
		await page.getByRole('dialog').getByRole('button', { name: 'Encerrar sessão' }).click();
		await expect(page.getByRole('heading', { name: /Sessão \d+ encerrada/ })).toBeVisible();
	}
}

test('a mesa abre a sessão, faz a chamada em poucos toques e conclui', async ({ page }) => {
	await entrar(page, MESA);
	await semSessaoAberta(page);
	await page.goto(CHAMADA);
	await aoVivo(page);

	const sessao = page.getByRole('region', { name: 'Sessão' });
	await sessao.getByRole('button', { name: 'Abrir sessão' }).click();
	await expect(sessao).toContainText(/Sessão \d+ aberta/);

	const presenca = page.getByRole('region', { name: 'Presença' });
	await presenca.getByRole('button', { name: 'Marcar todas como presentes' }).click();
	await expect(presenca).toContainText('Presentes: 5 de 5');
	// A Alemanha ainda não chegou.
	const alemanha = presenca.getByRole('button', { name: 'Alemanha', exact: true });
	await alemanha.click();
	await expect(alemanha).toHaveAttribute('aria-pressed', 'false');
	await expect(presenca).toContainText('Presentes: 4 de 5');

	const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
	expect(violations).toEqual([]);

	await page.getByRole('link', { name: 'Concluir chamada' }).click();
	await expect(page).toHaveURL(PAINEL);
});

test('a delegação que chega depois avisa, e a mesa confirma em um toque', async ({ page, browser }) => {
	await entrar(page, MESA);
	await page.goto(PAINEL);
	await aoVivo(page);

	const delegada = await abrir(browser, ALEMANHA, SESSAO);
	const ausente = delegada.getByRole('article', { name: 'Sua delegação está ausente na chamada' });
	await ausente.getByRole('button', { name: 'Cheguei' }).click();
	await expect(ausente).toContainText('Aguardando a mesa confirmar a presença.');

	const chegadas = page.getByRole('region', { name: 'Chegadas' });
	await chegadas.getByRole('button', { name: 'Confirmar presença: Alemanha' }).click();
	await expect(chegadas).toHaveCount(0);
	await expect(ausente).toHaveCount(0);
});

test('encerrar pede confirmação e mostra o resumo da sessão', async ({ page }) => {
	await entrar(page, MESA);
	await page.goto(PAINEL);
	await aoVivo(page);

	await page.getByRole('button', { name: 'Encerrar sessão' }).click();
	const dialogo = page.getByRole('dialog');
	await dialogo.getByRole('button', { name: 'Cancelar' }).click();
	await expect(dialogo).toBeHidden();
	await expect(page.getByRole('button', { name: 'Encerrar sessão' })).toBeVisible();

	await page.getByRole('button', { name: 'Encerrar sessão' }).click();
	await dialogo.getByRole('button', { name: 'Encerrar sessão' }).click();
	const resumo = page.getByRole('region', { name: /Sessão \d+ encerrada/ });
	await expect(resumo).toContainText('Presentes: 5');
	await expect(page.getByRole('button', { name: /^Abrir a sessão \d+/ })).toBeVisible();
});
