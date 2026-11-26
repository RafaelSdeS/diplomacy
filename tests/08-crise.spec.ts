import { expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contaDaDelegacao, DELEGACOES, isolado } from '../scripts/delegacoes.ts';
import { abrirAcao, clienteComo, CONTAS, entrar, sair } from './ajuda.ts';

// Passo 39: a cópia do CSNU-T só deste arquivo (scripts/delegacoes.ts).
const C = isolado('08');

const CRISE = `/crise/${C.sigla}`;
const NOTAS = `/comite/${C.sigla}/crise`;
const TELAO = `/telao/${C.sigla}`;

// A fila da crise do comitê de teste é uma só: os testes rodam em série, num projeto.
test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a fila da crise do comitê de teste é uma só');
});

async function abrir(browser: Browser, conta: string, rota: string, viewport?: { width: number; height: number }) {
	const contexto = await browser.newContext(viewport ? { viewport, isMobile: viewport.width < 500 } : {});
	const page = await contexto.newPage();
	await entrar(page, conta);
	await page.goto(rota);
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	return page;
}

async function semErrosDeAcessibilidade(page: Page) {
	const { violations } = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(violations).toEqual([]);
}

let comiteId = '';

test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	// Começa com a fila vazia: responde o que sobrou de outra execução.
	const crise = await clienteComo(C.conta(CONTAS.crise));
	comiteId = (await crise.from('comite').select('id').eq('sigla', C.sigla).single()).data!.id;
	const { data: abertas } = await crise
		.from('nota_crise')
		.select('id')
		.eq('comite_id', comiteId)
		.in('status', ['pendente', 'em_analise']);
	if (abertas?.length) {
		await crise.rpc('responder_notas', {
			p_ids: abertas.map((n) => n.id),
			p_status: 'rejeitada',
			p_resposta: 'Limpeza do teste.'
		});
	}
});

test('30 notas de 15 delegações chegam em poucos segundos, e o limite vale mesmo com envios simultâneos', async ({
	page
}) => {
	test.setTimeout(60_000);
	const inicio = Date.now();
	for (const [nome] of DELEGACOES) {
		const delegado = await clienteComo(C.conta(contaDaDelegacao(nome)));
		// Três envios ao mesmo tempo: o limite de 2 pendentes deixa passar só dois.
		const envios = await Promise.all(
			[1, 2, 3].map(() =>
				delegado.rpc('enviar_nota', {
					p_id: crypto.randomUUID(),
					p_comite: comiteId,
					p_tipo: 'diretiva',
					p_titulo: `Ação de ${nome}`,
					p_texto: `A delegação de ${nome} mobiliza a sua marinha.`
				})
			)
		);
		expect(envios.filter((e) => e.error).length, nome).toBe(1);
	}
	expect(Date.now() - inicio).toBeLessThan(20_000);

	await entrar(page, C.conta(CONTAS.crise));
	await page.goto(CRISE);
	await expect(page.getByText('Pendentes: 30')).toBeVisible();
	// A fila começa pela mais antiga: a primeira delegação que enviou.
	const fila = page.getByRole('region', { name: 'Notas', exact: true }).getByRole('listitem');
	await expect(fila.first()).toContainText(`Ação de ${DELEGACOES[0][0]}`);
	await expect(fila.nth(29)).toContainText(`Ação de ${DELEGACOES[14][0]}`);
});

test('aparência da fila da crise com 30 notas', async ({ page }) => {
	test.skip(!process.env.CAPTURAS, 'capturas só no contêiner (npm run capturas)');
	await entrar(page, C.conta(CONTAS.crise));
	await page.goto(CRISE);
	await expect(page.getByText('Pendentes: 30')).toBeVisible();
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	await expect(page).toHaveScreenshot('fila.png', {
		fullPage: true,
		mask: [page.locator('.idade'), page.locator('.contador-crise')]
	});
});

test('a resposta da crise chega ao celular do delegado sem recarregar', async ({ browser }) => {
	// Independente do teste anterior (numa nova tentativa, a fila pode ter sido limpa):
	// garante uma nota dos EUA esperando resposta.
	const cliente = await clienteComo(C.conta(CONTAS.delegado));
	const { count } = await cliente
		.from('nota_crise')
		.select('id', { count: 'exact', head: true })
		.eq('comite_id', comiteId)
		.eq('status', 'pendente');
	if (!count) {
		await cliente.rpc('enviar_nota', {
			p_id: crypto.randomUUID(),
			p_comite: comiteId,
			p_tipo: 'diretiva',
			p_titulo: 'Ação de EUA',
			p_texto: 'A delegação de EUA mobiliza a sua marinha.'
		});
	}

	const eua = await abrir(browser, C.conta(CONTAS.delegado), NOTAS, { width: 360, height: 740 });
	const minhas = eua.getByRole('region', { name: /^Notas de EUA/ });
	await expect(minhas.getByText(/ª na fila$/).first()).toBeVisible();
	const aprovadas = minhas.getByText('Aprovada', { exact: true });
	const antes = await aprovadas.count(); // uma execução anterior pode ter deixado notas aprovadas

	const crise = await abrir(browser, C.conta(CONTAS.crise), CRISE);
	await crise.getByLabel('Delegação').selectOption({ label: 'EUA' });
	await crise.getByRole('region', { name: 'Notas', exact: true }).getByRole('button', { name: /Ação de EUA/ }).first().click();
	const aberta = crise.getByRole('region', { name: 'Nota aberta' });
	await aberta.getByRole('button', { name: 'Assumir esta nota' }).click();
	await expect(crise.getByRole('status')).toHaveText('Nota assumida.');
	await crise.getByRole('group', { name: 'Respostas prontas' }).getByRole('button', { name: 'Aprovada' }).click();
	await crise.getByRole('button', { name: 'Aprovar' }).click();
	await expect(crise.getByRole('status')).toHaveText('Nota respondida.');

	// O delegado não recarregou a página.
	await expect(aprovadas).toHaveCount(antes + 1, { timeout: 10_000 });
	await expect(minhas.getByRole('note', { name: 'Resposta da crise' }).first()).toContainText('Os efeitos aparecem');
	await Promise.all([eua, crise].map((p) => p.context().close()));
});

test('no notebook, a fila e a nota aberta ficam lado a lado; no celular, um toque abre a nota', async ({
	page,
	browser
}) => {
	await entrar(page, C.conta(CONTAS.crise));
	await page.goto(CRISE);
	await page.getByRole('region', { name: 'Notas', exact: true }).getByRole('button', { name: /Ação de Rússia/ }).first().click();
	const [fila, aberta] = await Promise.all([
		page.getByRole('region', { name: 'Notas', exact: true }).boundingBox(),
		page.getByRole('region', { name: 'Nota aberta' }).boundingBox()
	]);
	expect(aberta!.x).toBeGreaterThan(fila!.x + fila!.width - 1);
	expect(Math.abs(aberta!.y - fila!.y)).toBeLessThan(5);

	const celular = await abrir(browser, C.conta(CONTAS.crise), CRISE, { width: 360, height: 740 });
	await celular.getByRole('region', { name: 'Notas', exact: true }).getByRole('button', { name: /Ação de China/ }).first().click();
	const notaAberta = celular.getByRole('region', { name: 'Nota aberta' });
	await expect(notaAberta).toContainText('A delegação de China mobiliza a sua marinha.');
	await expect(notaAberta).toBeInViewport();
	await celular.context().close();
});

test('várias notas parecidas são respondidas de uma vez', async ({ page }) => {
	await entrar(page, C.conta(CONTAS.crise));
	await page.goto(CRISE);
	await page.getByLabel('Delegação').selectOption({ label: 'França' });
	await page.getByLabel('Só as que esperam').check();
	const caixas = page.getByRole('region', { name: 'Notas', exact: true }).getByRole('checkbox', { name: /^Selecionar: Ação de França/ });
	await expect(caixas).toHaveCount(2);
	await caixas.nth(0).check();
	await caixas.nth(1).check();
	await expect(page.getByRole('heading', { name: '2 notas selecionadas' })).toBeVisible();
	await page.getByRole('group', { name: 'Respostas prontas' }).getByRole('button', { name: 'Rejeitada' }).click();
	await page.getByRole('button', { name: 'Rejeitar' }).click();
	await expect(page.getByRole('status')).toHaveText('2 notas respondidas.');
	await expect(page.getByRole('region', { name: 'Notas', exact: true })).toContainText('Nenhuma nota.');
});

test('uma atualização de crise chega ao delegado e vira plantão no telão', async ({ page, browser }) => {
	const eua = await abrir(browser, C.conta(CONTAS.delegado), NOTAS);
	const telao = await abrir(browser, C.conta(CONTAS.mesa), TELAO, { width: 1920, height: 1080 });
	const texto = `Explosão no porto de Áden às ${Date.now()}`;

	await entrar(page, C.conta(CONTAS.crise));
	await page.goto(CRISE);
	await abrirAcao(page, 'Nova atualização');
	await page.getByLabel('Texto da atualização').fill(texto);
	await page.getByRole('button', { name: 'Publicar atualização' }).click();
	await expect(page.getByRole('status')).toHaveText('Atualização publicada.');

	await expect(eua.getByRole('region', { name: 'Atualizações de crise' })).toContainText(texto, { timeout: 10_000 });
	await expect(telao.getByRole('status').filter({ hasText: 'Plantão de crise' })).toContainText(texto, { timeout: 10_000 });
	await Promise.all([eua, telao].map((p) => p.context().close()));
});

for (const tema of ['light', 'dark'] as const) {
	test(`as telas da crise não têm erros de acessibilidade (tema ${tema})`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: tema });
		await entrar(page, C.conta(CONTAS.delegado));
		await page.goto(NOTAS);
		await expect(page.getByRole('heading', { level: 1, name: 'Crise' })).toBeVisible();
		await semErrosDeAcessibilidade(page);
		await sair(page);
		await expect(page).toHaveURL(/\/entrar$/);

		await entrar(page, C.conta(CONTAS.crise));
		await page.goto(CRISE);
		await expect(page.getByRole('heading', { level: 1, name: 'Fila da crise' })).toBeVisible();
		await page.getByRole('region', { name: 'Notas', exact: true }).getByRole('button').first().click();
		await semErrosDeAcessibilidade(page);
	});
}
