import { expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contaDaDelegacao } from '../scripts/delegacoes.ts';
import { CONTAS, entrar } from './ajuda.ts';

const OCULTAR_RODIZIO = `${import.meta.dirname}/ocultar-rodizio.css`;

// Passos 06 e 07: sessão, plenária de abertura, votação, debate, agenda e telão.
const SESSAO = '/comite/CSNU-T/sessao';
const PRESIDENCIA = '/comite/CSNU-T/sessao/presidencia';
const CHAMADA = '/comite/CSNU-T/sessao/chamada';
const AGENDA = '/comite/CSNU-T/sessao/agenda';
const TELAO = '/telao/CSNU-T';
const PRESENTES = ['Brasil', 'China', 'EUA', 'França', 'Rússia'];

// O comitê de teste tem uma sessão só, e estes testes mexem nela: rodam em série,
// num projeto só, como um fluxo. As telas de outros tamanhos usam viewport próprio.
test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a sessão do comitê de teste é uma só');
});

async function abrir(browser: Browser, conta: string, rota: string, viewport?: { width: number; height: number }) {
	const contexto = await browser.newContext(viewport ? { viewport, isMobile: viewport.width < 500 } : {});
	const page = await contexto.newPage();
	await entrar(page, conta);
	await page.goto(rota);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	// As telas ao vivo só valem depois de ligadas ao tempo real (a agenda não é ao vivo).
	if (await page.locator('[data-ao-vivo]').count()) await aoVivo(page);
	return page;
}

/** Espera a tela se ligar ao tempo real. */
const aoVivo = (page: Page) => expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });

const segundos = (texto: string | null) => {
	const [m, s] = texto!.split(':').map(Number);
	return m * 60 + s;
};

/** A delegação que preside agora, lida na tela da sessão. */
async function presidencia(page: Page) {
	await page.goto(SESSAO);
	const linha = await page.getByText(/Presidência: /).first().textContent();
	return linha!.match(/Presidência: ([^·\n]+)/)![1].trim();
}

async function semErrosDeAcessibilidade(page: Page) {
	const { violations } = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(violations).toEqual([]);
}

// Preenchido no fluxo: quem preside o debate e uma delegação presente que não preside.
let preside = '';
let outra = '';

test('a mesa sorteia o rodízio, abre a sessão e faz a chamada', async ({ page }) => {
	await entrar(page, CONTAS.mesa);
	await page.goto(CHAMADA);
	await aoVivo(page);

	await page.getByRole('button', { name: /^Sortear/ }).click();
	await expect(page.getByRole('list', { name: 'Ordem sorteada' }).getByRole('listitem')).toHaveCount(15);

	const situacao = page.getByRole('region', { name: 'Sessão' }).locator('p').first();
	const antes = await situacao.textContent();
	await page.getByRole('button', { name: /^Abrir/ }).click();
	await expect(situacao).not.toHaveText(antes!);
	await expect(situacao).toContainText(/Sessão \d+ aberta/);

	// 15 delegações: quórum de 5.
	const presenca = page.getByRole('region', { name: 'Presença' });
	await expect(presenca).toContainText('Quórum: 5');
	for (const nome of PRESENTES) {
		await presenca.getByRole('group', { name: nome }).getByLabel('Presente', { exact: true }).check();
	}
	await expect(presenca).toContainText('Presentes: 5 de 15');
	await expect(presenca).toContainText('Há quórum');
	await presenca.getByRole('group', { name: 'Rússia' }).getByLabel('Ausente').check();
	await expect(presenca).toContainText('Sem quórum');
	await presenca.getByRole('group', { name: 'Rússia' }).getByLabel('Presente', { exact: true }).check();
	await expect(presenca).toContainText('Há quórum');
});

test('plenária de abertura: discursos pela lista de oradores e moção do tópico votada no celular, vista no telão', async ({
	page,
	browser
}) => {
	test.setTimeout(90_000); // quatro aparelhos, cada um com login
	await entrar(page, CONTAS.mesa);
	await page.goto(PRESIDENCIA);
	await aoVivo(page);
	const plenaria = page.getByRole('region', { name: 'Plenária de abertura' });
	test.skip(!(await plenaria.isVisible()), 'o comitê já passou da plenária (banco reaproveitado)');

	// Briefing → discursos: todas as presentes na lista, em ordem alfabética.
	await expect(plenaria).toContainText('Briefing e diálogo interativo');
	await plenaria.getByRole('button', { name: 'Começar os discursos de abertura' }).click();
	const lista = page.getByRole('region', { name: 'Lista de oradores' });
	await expect(lista.getByRole('listitem')).toHaveText(PRESENTES.map((n) => new RegExp(n)));
	await page.keyboard.press('Enter'); // o foco saiu do botão: Enter é o atalho, não um clique
	await expect(page.getByRole('region', { name: 'Com a palavra' })).toContainText('Brasil');
	await expect(lista.getByRole('listitem').first()).toContainText('Falou');

	// Discursos → moção do tópico no topo, proposta por uma delegação no celular.
	await plenaria.getByRole('button', { name: 'Passar à moção do tópico no topo' }).click();
	await expect(plenaria).toContainText('Moção do tópico no topo da agenda');
	const eua = await abrir(browser, CONTAS.delegado, SESSAO, { width: 360, height: 740 });
	await eua.getByLabel('Tipo').selectOption({ label: 'Moção de introdução do tópico no topo da agenda' });
	await eua.getByRole('combobox', { name: /^Tópico/ }).selectOption({ index: 1 });
	await eua.getByRole('button', { name: 'Enviar à presidência' }).click();
	await expect(eua.getByRole('status').filter({ hasText: 'enviado' })).toBeVisible();

	// Lista especial: a Rússia fala a favor.
	const pontos = page.getByRole('region', { name: 'Pontos e moções' });
	await pontos.getByRole('button', { name: /^Abrir lista especial/ }).click();
	const russia = await abrir(browser, contaDaDelegacao('Rússia'), SESSAO);
	await russia.getByRole('button', { name: 'Falar a favor' }).click();
	await expect(page.getByRole('region', { name: 'Lista especial' })).toContainText('Rússia');

	// Votação: o voto dado no celular aparece no telão.
	await pontos.getByRole('button', { name: /^Votar/ }).click();
	const telao = await abrir(browser, CONTAS.mesa, TELAO, { width: 1920, height: 1080 });
	const grade = telao.getByRole('complementary', { name: 'Votação' });
	await expect(grade).toContainText('Tópico 2 no topo da agenda');
	await eua.getByRole('button', { name: 'A favor' }).click();
	await expect(grade.getByRole('listitem').filter({ hasText: 'EUA' })).toContainText('A favor');
	await expect(eua.getByText('Voto da sua delegação: A favor')).toBeVisible();
	await russia.getByRole('button', { name: 'A favor' }).click();

	// Voto de placa, registrado pela mesa; a votação procedimental não aceita abstenção.
	await page.getByText('Registrar votos de placa').click();
	await expect(page.getByRole('button', { name: 'Abstenção: China' })).toHaveCount(0);
	await page.getByRole('button', { name: 'A favor: China' }).click();
	await expect(grade.getByRole('listitem').filter({ hasText: 'China' })).toContainText('A favor');
	await page.getByRole('button', { name: 'Encerrar a votação' }).click();
	await expect(page.getByRole('region', { name: 'Última votação' })).toContainText(
		'Aprovada: 3 a favor, 0 contra e 0 abstenções (3 votos necessários)'
	);

	// Fim da plenária: o tópico 2 vai para o debate, e a delegação sorteada assume.
	await expect(telao.getByText(/Tópico em debate:/)).toBeVisible();
	await expect(eua.getByText('Debate · Formal-informal')).toBeVisible();
	await Promise.all([eua, russia, telao].map((p) => p.context().close()));
});

test('no debate, preside a delegação sorteada, e um pedido de fala chega ao painel em menos de 1 segundo', async ({
	page,
	browser
}) => {
	await entrar(page, CONTAS.mesa);
	preside = await presidencia(page);
	expect(preside).not.toBe('Mesa');
	outra = PRESENTES.find((n) => n !== preside)!;

	const painel = await abrir(browser, contaDaDelegacao(preside), PRESIDENCIA);
	const fila = painel.getByRole('region', { name: 'Pedidos de fala' });
	await expect(
		painel.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Sessão' })
	).toHaveAttribute('aria-current', 'true');

	const delegado = await abrir(browser, contaDaDelegacao(outra), SESSAO);
	await delegado.getByRole('button', { name: 'Levantar placa' }).click();
	await expect(fila).toContainText(outra, { timeout: 1_000 });
	await expect(delegado.getByRole('article', { name: 'Sua placa' })).toContainText('1ª na fila');
	await Promise.all([painel, delegado].map((p) => p.context().close()));
});

test('Enter dá a palavra ao próximo, e os dois aparelhos mostram o mesmo tempo', async ({ browser }) => {
	const painel = await abrir(browser, contaDaDelegacao(preside), PRESIDENCIA);
	await expect(painel.getByRole('region', { name: 'Pedidos de fala' })).toContainText(outra);
	const delegado = await abrir(browser, contaDaDelegacao(outra), SESSAO);

	await painel.keyboard.press('Enter');
	await expect(painel.getByRole('region', { name: 'Com a palavra' })).toContainText(outra);
	await expect(delegado.getByRole('article', { name: 'Com a palavra' })).toContainText(outra);

	const [aqui, la] = await Promise.all([
		painel.locator('[data-cronometro]').textContent(),
		delegado.locator('[data-cronometro]').textContent()
	]);
	expect(segundos(aqui)).toBeGreaterThan(60);
	expect(Math.abs(segundos(aqui) - segundos(la))).toBeLessThanOrEqual(1);
	await Promise.all([painel, delegado].map((p) => p.context().close()));
});

test('Espaço pausa e retoma o cronômetro, mas não dentro de um campo', async ({ browser }) => {
	const painel = await abrir(browser, contaDaDelegacao(preside), PRESIDENCIA);
	const palavra = painel.getByRole('region', { name: 'Com a palavra' });
	const delegado = await abrir(browser, contaDaDelegacao(outra), SESSAO);

	await painel.keyboard.press('Space');
	await expect(palavra.getByRole('status')).toHaveText('Pausado');
	await expect(delegado.getByRole('article', { name: 'Com a palavra' }).getByRole('status')).toHaveText('Pausado');
	const pausado = await palavra.locator('[data-cronometro]').textContent();
	await painel.waitForTimeout(1_500);
	await expect(palavra.locator('[data-cronometro]')).toHaveText(pausado!);

	// Digitar no campo não pausa nem retoma, e o valor digitado não some com os eventos ao vivo.
	await painel.getByLabel('Tempo de fala (segundos)').fill('120');
	await painel.getByLabel('Tempo de fala (segundos)').press('Space');
	await expect(palavra.getByRole('status')).toHaveText('Pausado');
	await delegado.getByRole('button', { name: 'Levantar placa' }).click();
	await expect(painel.getByRole('region', { name: 'Pedidos de fala' })).toContainText(outra);
	await expect(painel.getByLabel('Tempo de fala (segundos)')).toHaveValue('120');

	await painel.locator('h1').click();
	await painel.keyboard.press('Space');
	await expect(palavra.getByRole('status')).toHaveText('');
	await Promise.all([painel, delegado].map((p) => p.context().close()));
});

test('um ponto chega à presidência, e a resposta volta à delegação', async ({ browser }) => {
	const delegado = await abrir(browser, contaDaDelegacao(outra), SESSAO);
	await delegado.getByLabel('Tipo').selectOption({ label: 'Ponto de dúvida' });
	await delegado.getByLabel('Detalhe (opcional)').fill('Qual é o tempo de fala?');
	await delegado.getByRole('button', { name: 'Enviar à presidência' }).click();
	await expect(delegado.getByRole('status').filter({ hasText: 'enviado' })).toBeVisible();

	const painel = await abrir(browser, contaDaDelegacao(preside), PRESIDENCIA);
	const pontos = painel.getByRole('region', { name: 'Pontos e moções' });
	await expect(pontos).toContainText('Qual é o tempo de fala?');
	await pontos.getByRole('button', { name: `Aceitar: Ponto de dúvida, ${outra}` }).click();
	await expect(pontos).toContainText('Nenhum ponto ou moção');

	await expect(delegado.getByRole('list', { name: 'Seus pontos e moções' })).toContainText('Aceito');
	await Promise.all([painel, delegado].map((p) => p.context().close()));
});

test('quem não preside não usa o painel', async ({ page }) => {
	await entrar(page, contaDaDelegacao(outra));
	await page.goto(PRESIDENCIA);
	await expect(page.getByText('Você não preside esta sessão.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Pausar' })).toHaveCount(0);

	await page.goto(SESSAO);
	await expect(page.getByRole('link', { name: 'Painel da presidência' })).toHaveCount(0);
});

test('a agenda informal: propostas em tópicos, lado a lado, e a mesa adota uma', async ({ browser }) => {
	const delegado = await abrir(browser, contaDaDelegacao(outra), AGENDA);
	// Um tópico ainda sem agenda adotada (numa nova tentativa, o primeiro já pode estar).
	const livres = [];
	for (const n of [1, 2]) {
		const secao = delegado.getByRole('region', { name: `Agenda informal · tópico ${n}` });
		if (!(await secao.getByText('Adotada').count())) livres.push(n);
	}
	test.skip(!livres.length, 'os dois tópicos já têm agenda adotada (banco reaproveitado)');
	const n = livres[0];
	const escolher = async (page: Page) => {
		const campo = page.getByRole('combobox', { name: /^Tópico/ });
		const rotulo = await campo.locator('option', { hasText: new RegExp(`^${n}\\.`) }).textContent();
		await campo.selectOption({ label: rotulo!.trim() });
	};

	await escolher(delegado);
	await delegado.getByLabel('Agenda em tópicos').fill('A. Causas\n  A.1 Financiamento\nB. Respostas');
	await delegado.getByRole('button', { name: 'Salvar proposta' }).click();
	await expect(delegado.getByRole('status')).toHaveText('Proposta salva.');

	const mesa = await abrir(browser, CONTAS.mesa, AGENDA);
	await escolher(mesa);
	await mesa.getByLabel('Agenda em tópicos').fill('A. Contexto\nB. Cooperação\n  B.1 Inteligência');
	await mesa.getByRole('button', { name: 'Salvar proposta' }).click();
	await expect(mesa.getByRole('status')).toHaveText('Proposta salva.');

	// No notebook, as propostas do mesmo tópico ficam lado a lado.
	const secao = mesa.getByRole('region', { name: `Agenda informal · tópico ${n}` });
	const daDelegacao = secao.getByRole('article', { name: `Proposta de ${outra}` });
	const daMesa = secao.getByRole('article', { name: 'Proposta de Mesa' });
	const [a, b] = await Promise.all([daDelegacao.boundingBox(), daMesa.boundingBox()]);
	expect(Math.abs(a!.y - b!.y)).toBeLessThan(5);
	// A árvore: "A.1 Financiamento" fica dentro de "A. Causas".
	await expect(
		daDelegacao.getByRole('listitem').filter({ hasText: 'A. Causas' }).getByRole('listitem')
	).toHaveText(/A\.1 Financiamento/);

	await secao.getByRole('button', { name: `Adotar a proposta de ${outra}` }).click();
	await expect(daDelegacao).toContainText('Adotada');
	await daDelegacao.getByRole('button', { name: /^Andamento de A\. Causas: Pendente/ }).click();
	await expect(daDelegacao.getByRole('button', { name: /^Andamento de A\. Causas: Em debate/ })).toBeVisible();
	await Promise.all([delegado, mesa].map((p) => p.context().close()));
});

test.describe('telão em 1920 × 1080', () => {
	test.use({ viewport: { width: 1920, height: 1080 } });

	test('mostra orador, bandeira, cronômetro e o tópico, sem rolagem e sem a navegação do app', async ({ page }) => {
		await entrar(page, CONTAS.mesa);
		await page.goto(TELAO);
		await aoVivo(page);

		const orador = page.getByRole('region', { name: 'Com a palavra' });
		await expect(orador).toContainText(outra);
		await expect(orador.locator('img.bandeira')).toBeVisible();
		await expect(orador.locator('[data-cronometro]')).toBeVisible();
		await expect(page.getByRole('heading', { level: 1 })).toContainText(/Sessão \d+ · Debate · Formal-informal/);
		await expect(page.getByText(/Tópico em debate:/)).toBeVisible();

		await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0);
		await expect(page.getByRole('button')).toHaveCount(0);
		const sobra = await page.evaluate(() => {
			const raiz = document.documentElement;
			return [raiz.scrollWidth - raiz.clientWidth, raiz.scrollHeight - raiz.clientHeight];
		});
		expect(sobra).toEqual([0, 0]);
	});

	test('aparência do telão', async ({ page }) => {
		test.skip(!process.env.CI, 'capturas de referência só no CI');
		await entrar(page, CONTAS.mesa);
		await page.goto(TELAO);
		await aoVivo(page);
		await expect(page.getByRole('region', { name: 'Com a palavra' })).toContainText(outra);
		// A presidência do rodízio depende de quantas vezes o fluxo já rodou: fica invisível.
		await expect(page).toHaveScreenshot('telao.png', { mask: [page.locator('.cronometro')], stylePath: OCULTAR_RODIZIO });
	});
});

test('aparência do painel da presidência', async ({ page }) => {
	test.skip(!process.env.CI, 'capturas de referência só no CI');
	await entrar(page, contaDaDelegacao(preside));
	await page.goto(PRESIDENCIA);
	await aoVivo(page);
	await expect(page.getByRole('region', { name: 'Com a palavra' })).toContainText(outra);
	// Quem preside muda com o rodízio: o nome da conta e o subtítulo ficam invisíveis.
	await expect(page).toHaveScreenshot('presidencia.png', {
		fullPage: true,
		mask: [page.locator('.cronometro')],
		stylePath: OCULTAR_RODIZIO
	});
});

for (const tema of ['light', 'dark'] as const) {
	test(`as telas da sessão não têm erros de acessibilidade (tema ${tema})`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: tema });
		await entrar(page, contaDaDelegacao(preside));
		for (const [rota, titulo] of [
			[SESSAO, /^Sessão/],
			[PRESIDENCIA, 'Presidência'],
			[AGENDA, 'Agenda']
		] as const) {
			await page.goto(rota);
			await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
			await semErrosDeAcessibilidade(page);
		}
		await page.getByRole('button', { name: 'Sair' }).click();
		await expect(page).toHaveURL(/\/entrar$/);

		await entrar(page, CONTAS.mesa);
		for (const rota of [CHAMADA, PRESIDENCIA, TELAO]) {
			await page.goto(rota);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			await aoVivo(page);
			await semErrosDeAcessibilidade(page);
		}
	});
}

test('a presidência passada vai para a próxima delegação sorteada', async ({ browser }) => {
	const painel = await abrir(browser, contaDaDelegacao(preside), PRESIDENCIA);
	const mesa = await abrir(browser, CONTAS.mesa, SESSAO);

	await painel.getByRole('button', { name: 'Passar a presidência' }).click();
	await expect(painel.getByText('Você não preside esta sessão.')).toBeVisible();
	await expect(mesa.getByText(/Presidência: /)).not.toContainText(`Presidência: ${preside}`);
	await expect(mesa.getByText(/Presidência: /)).not.toContainText('Presidência: Mesa');
	await Promise.all([painel, mesa].map((p) => p.context().close()));
});
