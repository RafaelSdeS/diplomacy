import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONTAS, entrar, irPeloMenu } from './ajuda.ts';

// Hora fixa no primeiro dia do evento de teste (seed), durante a Sessão 1. Fica no
// passado: com o relógio depois do vencimento da sessão, o login seria renovado o tempo todo.
const DURANTE_A_SESSAO_1 = new Date('2026-11-10T10:45:00-03:00');

// Uma conta por projeto para os testes que alteram dados de uma pessoa.
const CONTA_DO_PROJETO: Record<string, string> = {
	celular: 'delegado02@exemplo.test',
	notebook: 'delegado03@exemplo.test',
	telao: 'delegado04@exemplo.test'
};

// PNG de 1 × 1 pixel, para testar o envio da foto.
const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
	'base64'
);

async function semErrosDeAcessibilidade(page: Page) {
	const { violations } = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(violations).toEqual([]);
}

test('a Agora mostra o que acontece agora e o que vem depois', async ({ page }) => {
	await page.clock.setFixedTime(DURANTE_A_SESSAO_1);
	await entrar(page, CONTAS.delegado);

	const agora = page.getByRole('article', { name: 'Acontecendo agora' });
	await expect(agora).toContainText('Sessão 1');
	await expect(agora).toContainText('Sala 204');
	await expect(agora).toContainText('até 12:30');

	const depois = page.getByRole('article', { name: 'Depois' });
	await expect(depois).toContainText('Almoço');
	await expect(depois).toContainText('às 12:30');

	await expect(page.getByRole('article', { name: 'Você' })).toContainText('Delegado · EUA · CSNU-T');
});

test('o cronograma agrupa por dia e destaca o que está acontecendo', async ({ page }) => {
	await page.clock.setFixedTime(DURANTE_A_SESSAO_1);
	await entrar(page, CONTAS.delegado);
	await page.goto('/cronograma');

	await expect(page.getByRole('heading', { level: 2, name: 'terça-feira, 10 de novembro' })).toBeVisible();
	await expect(page.getByRole('heading', { level: 2, name: 'quarta-feira, 11 de novembro' })).toBeVisible();
	const atual = page.locator('li[aria-current="time"]');
	await expect(atual).toHaveCount(1);
	await expect(atual).toContainText('Sessão 1');
	await expect(atual).toContainText('Agora');
});

test('a secretaria adiciona e remove um item do cronograma', async ({ page }, info) => {
	const titulo = `Reunião de teste ${info.project.name} ${Date.now()}`;
	await entrar(page, CONTAS.secretaria);
	await page.goto('/cronograma');

	await page.getByLabel('Título').fill(titulo);
	await page.getByLabel('Local').fill('Sala 101');
	await page.getByLabel('Início').fill('2026-11-11T15:00');
	await page.getByLabel('Fim').fill('2026-11-11T16:00');
	await page.getByRole('button', { name: 'Adicionar ao cronograma' }).click();

	const item = page.getByRole('listitem').filter({ hasText: titulo });
	await expect(item).toContainText('15:00–16:00');
	await expect(item).toContainText('Sala 101');

	await item.getByRole('button', { name: `Remover ${titulo}` }).click();
	await expect(item).toHaveCount(0);
});

test('um aviso da secretaria chega ao delegado sem recarregar', async ({ page, browser }, info) => {
	const texto = `Aviso de teste ${info.project.name} ${Date.now()}`;
	await entrar(page, CONTAS.delegado);
	await expect(page.getByRole('heading', { level: 1, name: 'Agora' })).toBeVisible();

	const secretaria = await browser.newPage();
	await entrar(secretaria, CONTAS.secretaria);
	await secretaria.goto('/avisos');
	await secretaria.getByLabel('Aviso', { exact: true }).fill(texto);
	await secretaria.getByRole('button', { name: 'Publicar' }).click();
	await expect(secretaria.getByRole('listitem').filter({ hasText: texto })).toBeVisible();

	// O delegado não recarregou a página: o aviso chega pelo tempo real.
	await expect(page.getByRole('article', { name: 'Avisos' })).toContainText(texto, { timeout: 10_000 });

	await secretaria
		.getByRole('listitem')
		.filter({ hasText: texto })
		.getByRole('button', { name: /^Remover o aviso/ })
		.click();
	await expect(page.getByRole('article', { name: 'Avisos' })).not.toContainText(texto, { timeout: 10_000 });
	await secretaria.close();
});

test('a página do comitê mostra tópicos, mesa e as 15 delegações com bandeira', async ({ page }) => {
	await entrar(page, CONTAS.delegado);
	await irPeloMenu(page, 'Comitê');

	await expect(page.getByRole('heading', { level: 1, name: 'Conselho de Segurança (teste)' })).toBeVisible();
	await expect(page.getByRole('region', { name: 'Tópicos' })).toContainText('Iêmen');
	await expect(page.getByRole('region', { name: 'Mesa' })).toContainText('Mesa 01');

	const delegacoes = page.getByRole('region', { name: /^Delegações/ });
	await expect(delegacoes.getByRole('listitem')).toHaveCount(15);
	await expect(delegacoes.locator('img.bandeira')).toHaveCount(15);
	await expect(delegacoes).toContainText('Federative Republic of Brazil');
});

test('o perfil salva a minibiografia e envia a foto', async ({ page }, info) => {
	const bio = `Minibiografia de teste ${Date.now()}`;
	await entrar(page, CONTA_DO_PROJETO[info.project.name]);
	await page.getByRole('link', { name: 'Perfil' }).click();

	await page.getByLabel('Minibiografia').fill(bio);
	await page.getByRole('button', { name: 'Salvar perfil' }).click();
	await expect(page.getByRole('status')).toHaveText('Perfil salvo.');
	await page.reload();
	await expect(page.getByLabel('Minibiografia')).toHaveValue(bio);

	await page.getByLabel('Foto').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: PNG });
	await expect(page.getByRole('status')).toHaveText('Foto atualizada.');
	await expect(page.getByRole('img', { name: 'Sua foto' })).toBeVisible();
});

test.describe('zoom de 200% nas telas com login', () => {
	// Reflow da WCAG: com 320 px, nada pode exigir rolagem horizontal (no modo
	// celular, um vazamento também faz a página encolher e desalinha os toques).
	test.use({ viewport: { width: 320, height: 640 } });

	for (const [conta, rotas] of [
		[CONTAS.delegado, ['/', '/comite/CSNU-T', '/comite/CSNU-T/regras', '/comite/CSNU-T/sessao/agenda', '/comite/CSNU-T/crise', '/comite/CSNU-T/blocos', '/comite/CSNU-T/dpo', '/comite/CSNU-T/cartas', '/press', '/press/CSNU-T', '/cronograma', '/avisos', '/perfil']],
		[CONTAS.secretaria, ['/cronograma', '/avisos', '/secretaria/participantes']],
		[CONTAS.mesa, ['/comite/CSNU-T/sessao', '/comite/CSNU-T/sessao/presidencia', '/comite/CSNU-T/sessao/chamada']],
		[CONTAS.crise, ['/crise/CSNU-T']],
		[CONTAS.press, ['/press/escrever']]
	] as const) {
		test(`não rola na horizontal (${conta})`, async ({ page }, info) => {
			test.skip(info.project.name !== 'celular', 'basta rodar uma vez');
			await entrar(page, conta);
			for (const rota of rotas) {
				await page.goto(rota);
				await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
				const sobra = await page.evaluate(
					() => document.documentElement.scrollWidth - document.documentElement.clientWidth
				);
				expect(sobra, rota).toBeLessThanOrEqual(0);
			}
		});
	}
});

test.describe('celular com tela baixa', () => {
	test.use({ viewport: { width: 360, height: 420 } });

	// WCAG 2.4.11: o que é rolado até a tela (para clicar ou receber foco) não pode
	// ficar escondido atrás da navegação fixa.
	test('o botão rolado até a tela não fica atrás da navegação fixa', async ({ page }, info) => {
		test.skip(info.project.name !== 'celular', 'a navegação fica fixa embaixo só no celular');
		await entrar(page, CONTAS.delegado);
		await page.goto('/perfil');
		const botao = page.getByRole('button', { name: 'Salvar perfil' });
		await botao.scrollIntoViewIfNeeded();

		const nav = await page.getByRole('navigation', { name: 'Principal' }).boundingBox();
		const caixa = await botao.boundingBox();
		expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(nav!.y);
	});
});

for (const tema of ['light', 'dark'] as const) {
	test(`as telas do passo 04 não têm erros de acessibilidade (tema ${tema})`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: tema });
		await entrar(page, CONTAS.delegado);
		for (const [rota, titulo] of [
			['/', 'Agora'],
			['/comite/CSNU-T', 'Conselho de Segurança (teste)'],
			['/cronograma', 'Cronograma'],
			['/avisos', 'Avisos'],
			['/perfil', 'Perfil']
		]) {
			await page.goto(rota);
			await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
			await semErrosDeAcessibilidade(page);
		}

		// A secretaria vê os formulários do cronograma e dos avisos.
		await page.getByRole('button', { name: 'Sair' }).click();
		await expect(page).toHaveURL(/\/entrar$/);
		await entrar(page, CONTAS.secretaria);
		for (const [rota, titulo] of [
			['/cronograma', 'Cronograma'],
			['/avisos', 'Avisos']
		]) {
			await page.goto(rota);
			await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
			await semErrosDeAcessibilidade(page);
		}
	});
}
