import { expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contaDaDelegacao, contaDoTreino } from '../scripts/delegacoes.ts';
import { clienteComo, CONTAS, entrar, escolher, abrirAcao } from './ajuda.ts';

// Passo 17: bilhetes (pela caixa de saída), entrevista, edição do dia e coletiva.

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'roda num projeto só');
});

async function abrir(browser: Browser, conta: string, rota: string, viewport = { width: 1366, height: 768 }) {
	const contexto = await browser.newContext({ viewport, isMobile: viewport.width < 500 });
	const page = await contexto.newPage();
	await entrar(page, conta);
	await page.goto(rota);
	return page;
}

async function semErrosDeAcessibilidade(page: Page) {
	const { violations } = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(violations).toEqual([]);
}

test('um bilhete escrito sem rede chega uma vez só', async ({ browser }) => {
	const brasil = await abrir(browser, contaDoTreino('Brasil'), '/comite/TREINO/mensagens', { width: 360, height: 740 });
	await expect(brasil.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	const texto = `Apoiamos a comissão das águas? ${Date.now()}`;

	await brasil.context().setOffline(true);
	await abrirAcao(brasil, 'Novo bilhete');
	const novo = brasil.getByRole('form', { name: 'Novo bilhete' });
	await escolher(novo, 'Para', 'Chile');
	await novo.getByLabel('Bilhete').fill(texto);
	await novo.getByRole('button', { name: 'Enviar bilhete' }).click();
	await expect(brasil.getByText('1 para enviar')).toBeVisible();
	await brasil.context().setOffline(false);
	await expect(brasil.getByText('1 para enviar')).toHaveCount(0, { timeout: 15_000 });

	const chile = await clienteComo(contaDoTreino('Chile'));
	const { count } = await chile.from('mensagem').select('id', { count: 'exact', head: true }).eq('texto', texto);
	expect(count, 'o Chile recebe o bilhete uma vez só').toBe(1);
	const paraguai = await clienteComo(contaDoTreino('Paraguai'));
	expect((await paraguai.from('mensagem').select('id').eq('texto', texto)).data).toEqual([]);
	await brasil.context().close();
});

test('um pedido de entrevista aceito aparece para os dois lados', async ({ browser }) => {
	const tema = `A posição sobre o Iêmen ${Date.now()}`;
	const press = await abrir(browser, CONTAS.press, '/press/entrevistas');
	await abrirAcao(press, 'Pedir entrevista');
	const pedido = press.getByRole('form', { name: 'Pedir entrevista' });
	await escolher(pedido, 'Delegação', 'EUA');
	await pedido.getByLabel('Tema').fill(tema);
	await pedido.getByRole('button', { name: 'Pedir entrevista' }).click();
	await expect(press.getByRole('status')).toHaveText('Pedido enviado à delegação.');
	await expect(press.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });

	// Passo 47: a delegação responde num modal, direto do "Precisa de você" da Agora.
	const eua = await abrir(browser, CONTAS.delegado, '/', { width: 360, height: 740 });
	await eua.getByRole('article', { name: 'Precisa de você' }).getByRole('button', { name: new RegExp(`^Responder: .*${tema}`) }).click();
	const modal = eua.getByRole('dialog', { name: /^Pedido de entrevista de/ });
	await expect(modal).toContainText(tema);
	await modal.getByLabel('Horário').fill('2027-10-20T15:30');
	await modal.getByRole('button', { name: 'Aceitar' }).click();
	await expect(modal).toBeHidden();
	// Respondido, o pedido sai do "Precisa de você" (que some se nada mais espera, passo 51).
	await expect(eua.getByRole('button', { name: new RegExp(`^Responder: .*${tema}`) })).toHaveCount(0);
	await eua.goto('/comite/CSNU-T/mensagens');
	const item = eua.getByRole('region', { name: 'Pedidos de entrevista' }).getByRole('listitem').filter({ hasText: tema });
	await expect(item).toContainText('Aceita para');

	await expect(press.getByRole('region', { name: 'Pedidos' }).getByRole('listitem').filter({ hasText: tema })).toContainText(
		'Aceita',
		{ timeout: 10_000 }
	);
	await Promise.all([press, eua].map((p) => p.context().close()));
});

test('a edição do dia reúne as matérias publicadas no dia', async ({ page }) => {
	const press = await clienteComo(CONTAS.press);
	const veiculo = (await press.from('veiculo').select('id, comite!inner(sigla)').eq('comite.sigla', 'CSNU-T').single()).data!.id;
	const titulos = [`Manhã agitada no Conselho ${Date.now()}`, `Votação apertada à tarde ${Date.now()}`];
	for (const titulo of titulos) {
		const { error } = await press.rpc('publicar_noticia', {
			p_id: crypto.randomUUID(),
			p_veiculo: veiculo,
			p_tipo: 'reportagem',
			p_titulo: titulo,
			p_texto: 'Texto da matéria.'
		});
		expect(error).toBeNull();
	}
	await entrar(page, CONTAS.press);
	await page.goto('/press/CSNU-T');
	await page.getByRole('link', { name: 'Edição do dia' }).click();
	const edicao = page.getByRole('article', { name: 'Edição para impressão' });
	await expect(edicao.getByRole('heading', { level: 1 })).toHaveText('Al Jazeera');
	for (const titulo of titulos) await expect(edicao.getByRole('region', { name: titulo })).toBeVisible();
	await semErrosDeAcessibilidade(page);
});

// A coletiva (passos 17 e 45) está toda em tests/45-coletiva-oral.spec.ts, num arquivo serial:
// abrir uma coletiva fecha a outra do evento, então dois arquivos em paralelo se atrapalhariam.

for (const tema of ['light', 'dark'] as const) {
	test(`as telas de comunicação não têm erros de acessibilidade (tema ${tema})`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: tema });
		await entrar(page, CONTAS.delegado);
		await page.goto('/comite/CSNU-T/mensagens');
		await expect(page.locator('main h1')).toBeVisible();
		await semErrosDeAcessibilidade(page);
		await page.goto('/press/coletiva');
		await expect(page.locator('main h1')).toBeVisible();
		await semErrosDeAcessibilidade(page);
	});
}
