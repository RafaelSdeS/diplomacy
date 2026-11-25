import { expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contaDaDelegacao, isolado } from '../scripts/delegacoes.ts';
import { CONTAS, entrar, sair, abrirAcao, abrirPainel } from './ajuda.ts';

// Passo 39: a cópia do CSNU-T só deste arquivo (scripts/delegacoes.ts).
const C = isolado('06');

const OCULTAR_RODIZIO = `${import.meta.dirname}/ocultar-rodizio.css`;

// Passos 06 e 07: sessão, plenária de abertura, votação, debate, agenda e telão.
const SESSAO = `/comite/${C.sigla}/sessao`;
const PRESIDENCIA = `/comite/${C.sigla}/sessao/presidencia`;
const CHAMADA = `/comite/${C.sigla}/sessao/chamada`;
const AGENDA = `/comite/${C.sigla}/sessao/agenda`;
const TELAO = `/telao/${C.sigla}`;
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
	// Passo 51: a faixa "Preside a sessão" mostra a bandeira e o nome de quem preside.
	return (await page.locator('.quem-preside strong').textContent())!.trim();
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
	await entrar(page, C.conta(CONTAS.mesa));
	await page.goto(CHAMADA);
	await aoVivo(page);

	// A preparação fica recolhida quando o rodízio já foi sorteado (banco reaproveitado).
	const preparacao = page.locator('details.preparacao');
	if ((await preparacao.getAttribute('open')) === null) await preparacao.locator('summary').click();
	await page.getByRole('button', { name: /^Sortear/ }).click();
	await expect(page.getByRole('list', { name: 'Ordem sorteada' }).getByRole('listitem')).toHaveCount(15);

	// Banco reaproveitado: a sessão anterior se encerra no painel (passo 21).
	const sessao = page.getByRole('region', { name: 'Sessão' });
	if (await sessao.getByText(/Sessão \d+ aberta/).isVisible()) {
		await page.goto(PRESIDENCIA);
		await page.getByRole('button', { name: 'Encerrar sessão' }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Encerrar sessão' }).click();
		await expect(page.getByRole('heading', { name: /Sessão \d+ encerrada/ })).toBeVisible();
		await page.goto(CHAMADA);
		await aoVivo(page);
	}
	await sessao.getByRole('button', { name: 'Abrir sessão' }).click();
	await expect(sessao).toContainText(/Sessão \d+ aberta/);

	// 15 delegações: quórum de 5. Um toque alterna entre ausente e presente.
	const presenca = page.getByRole('region', { name: 'Presença' });
	await expect(presenca).toContainText('Quórum: 5');
	for (const nome of PRESENTES) {
		const botao = presenca.getByRole('button', { name: nome, exact: true });
		await botao.click();
		await expect(botao).toHaveAttribute('aria-pressed', 'true');
	}
	await expect(presenca).toContainText('Presentes: 5 de 15');
	await expect(presenca).toContainText('Há quórum');
	await presenca.getByRole('button', { name: 'Rússia', exact: true }).click();
	await expect(presenca).toContainText('Sem quórum');
	await presenca.getByRole('button', { name: 'Rússia', exact: true }).click();
	await expect(presenca).toContainText('Há quórum');
});

test('plenária de abertura: discursos pela lista de oradores e moção do tópico votada no celular, vista no telão', async ({
	page,
	browser
}) => {
	test.setTimeout(90_000); // quatro aparelhos, cada um com login
	await entrar(page, C.conta(CONTAS.mesa));
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
	const eua = await abrir(browser, C.conta(CONTAS.delegado), SESSAO, { width: 360, height: 740 });
	await abrirAcao(eua, 'Fazer um ponto ou moção');
	await eua.getByLabel('Tipo').selectOption({ label: 'Moção de introdução do tópico no topo da agenda' });
	await eua.getByRole('combobox', { name: /^Tópico/ }).selectOption({ index: 1 });
	await eua.getByRole('button', { name: 'Enviar à mesa' }).click();
	await expect(eua.getByRole('status').filter({ hasText: 'enviado' })).toBeVisible();

	// Lista especial: a Rússia fala a favor.
	const pontos = page.getByRole('region', { name: 'Pontos e moções' });
	await abrirPainel(page, 'Pontos e moções');
	await pontos.getByRole('button', { name: /^Abrir lista especial/ }).click();
	const russia = await abrir(browser, C.conta(contaDaDelegacao('Rússia')), SESSAO);
	await russia.getByRole('button', { name: 'Falar a favor' }).click();
	await expect(page.getByRole('region', { name: 'Lista especial' })).toContainText('Rússia');

	// Votação: o voto dado no celular aparece no telão.
	await abrirPainel(page, 'Pontos e moções');
	await pontos.getByRole('button', { name: /^Votar/ }).click();
	const telao = await abrir(browser, C.conta(CONTAS.mesa), TELAO, { width: 1920, height: 1080 });
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
	await page.getByRole('dialog').getByRole('button', { name: 'Encerrar a votação' }).click();
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
	await entrar(page, C.conta(CONTAS.mesa));
	preside = await presidencia(page);
	expect(preside).not.toBe('Mesa');
	outra = PRESENTES.find((n) => n !== preside)!;

	const painel = await abrir(browser, C.conta(contaDaDelegacao(preside)), PRESIDENCIA);
	const fila = painel.getByRole('region', { name: 'Pedidos de fala' });
	await expect(
		painel.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Sessão' })
	).toHaveAttribute('aria-current', 'true');

	const delegado = await abrir(browser, C.conta(contaDaDelegacao(outra)), SESSAO);
	await delegado.getByRole('button', { name: 'Levantar placa' }).click();
	await expect(fila).toContainText(outra, { timeout: 1_000 });
	await expect(delegado.getByRole('article', { name: 'A palavra' })).toContainText('1ª na fila');
	await Promise.all([painel, delegado].map((p) => p.context().close()));
});

test('Enter dá a palavra ao próximo, e os dois aparelhos mostram o mesmo tempo', async ({ browser }) => {
	const painel = await abrir(browser, C.conta(contaDaDelegacao(preside)), PRESIDENCIA);
	await expect(painel.getByRole('region', { name: 'Pedidos de fala' })).toContainText(outra);
	const delegado = await abrir(browser, C.conta(contaDaDelegacao(outra)), SESSAO);

	await painel.keyboard.press('Enter');
	await expect(painel.getByRole('region', { name: 'Com a palavra' })).toContainText(outra);
	await expect(delegado.getByRole('article', { name: 'A palavra' })).toContainText(outra);

	const [aqui, la] = await Promise.all([
		painel.locator('[data-cronometro]').textContent(),
		delegado.locator('[data-cronometro]').textContent()
	]);
	expect(segundos(aqui)).toBeGreaterThan(60);
	expect(Math.abs(segundos(aqui) - segundos(la))).toBeLessThanOrEqual(1);
	await Promise.all([painel, delegado].map((p) => p.context().close()));
});

test('Espaço pausa e retoma o cronômetro, mas não dentro de um campo', async ({ browser }) => {
	const painel = await abrir(browser, C.conta(contaDaDelegacao(preside)), PRESIDENCIA);
	const palavra = painel.getByRole('region', { name: 'Com a palavra' });
	const delegado = await abrir(browser, C.conta(contaDaDelegacao(outra)), SESSAO);

	await painel.keyboard.press('Space');
	await expect(palavra.getByRole('status')).toHaveText('Pausado');
	await expect(delegado.getByRole('article', { name: 'A palavra' }).getByRole('status')).toHaveText('Pausado');
	const pausado = await palavra.locator('[data-cronometro]').textContent();
	await painel.waitForTimeout(1_500);
	await expect(palavra.locator('[data-cronometro]')).toHaveText(pausado!);

	// Digitar no campo não pausa nem retoma, e o valor digitado não some com os eventos ao vivo.
	// Passo 43: o tempo de fala fica nos ajustes, recolhidos.
	await painel.getByRole('button', { name: 'Ajustes da fala e do debate' }).click();
	await painel.getByLabel('Tempo de fala (segundos)').fill('120');
	await painel.getByLabel('Tempo de fala (segundos)').press('Space');
	await expect(palavra.getByRole('status')).toHaveText('Pausado');
	await delegado.getByRole('button', { name: 'Levantar placa' }).click();
	await expect(painel.getByRole('region', { name: 'Pedidos de fala' })).toContainText(outra);
	await expect(painel.getByLabel('Tempo de fala (segundos)')).toHaveValue('120');

	await painel.keyboard.press('Escape'); // fecha os ajustes (passo 51: um modal)
	await painel.locator('h1').click();
	await painel.keyboard.press('Space');
	await expect(palavra.getByRole('status')).toHaveText('');
	await Promise.all([painel, delegado].map((p) => p.context().close()));
});

test('um ponto chega à presidência, e a resposta volta à delegação', async ({ browser }) => {
	const delegado = await abrir(browser, C.conta(contaDaDelegacao(outra)), SESSAO);
	await abrirAcao(delegado, 'Fazer um ponto ou moção');
	await delegado.getByLabel('Tipo').selectOption({ label: 'Ponto de dúvida' });
	await delegado.getByLabel('Detalhe (opcional)').fill('Qual é o tempo de fala?');
	await delegado.getByRole('button', { name: 'Enviar à mesa' }).click();
	await expect(delegado.getByRole('status').filter({ hasText: 'enviado' })).toBeVisible();

	// Passo 29: o bureau aprova, e só então a presidência vê o pedido.
	const painel = await abrir(browser, C.conta(contaDaDelegacao(preside)), PRESIDENCIA);
	const pontos = painel.getByRole('region', { name: 'Pontos e moções' });
	await abrirPainel(painel, 'Pontos e moções');
	await expect(pontos).not.toContainText('Qual é o tempo de fala?');
	await expect(delegado.getByRole('list', { name: 'Seus pontos e moções' })).toContainText('Aguardando o bureau');
	const mesa = await abrir(browser, C.conta(CONTAS.mesa), PRESIDENCIA);
	await abrirPainel(mesa, 'Bureau · pedidos para aprovar');
	await mesa
		.getByRole('region', { name: 'Bureau · pedidos para aprovar' })
		.getByRole('button', { name: `Em ordem: Ponto de dúvida, ${outra}` })
		.click();
	await expect(delegado.getByRole('list', { name: 'Seus pontos e moções' })).toContainText('Aprovado pelo bureau');
	await expect(pontos).toContainText('Qual é o tempo de fala?');
	await pontos.getByRole('button', { name: `Aceitar: Ponto de dúvida, ${outra}` }).click();
	await expect(painel.getByRole('dialog', { name: 'Pontos e moções' })).toBeHidden();
	await abrirPainel(painel, 'Pontos e moções');
	await expect(pontos).toContainText('Nenhum ponto ou moção');

	await expect(delegado.getByRole('list', { name: 'Seus pontos e moções' })).toContainText('Aceito');
	await Promise.all([painel, delegado, mesa].map((p) => p.context().close()));
});

test('quem não preside não usa o painel', async ({ page }) => {
	await entrar(page, C.conta(contaDaDelegacao(outra)));
	await page.goto(PRESIDENCIA);
	await expect(page.getByText('Você não preside esta sessão.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Pausar' })).toHaveCount(0);

	await page.goto(SESSAO);
	await expect(page.getByRole('link', { name: 'Painel da presidência' })).toHaveCount(0);
});

test('a agenda informal: propostas em tópicos, lado a lado, e a mesa adota uma', async ({ browser }) => {
	const delegado = await abrir(browser, C.conta(contaDaDelegacao(outra)), AGENDA);
	// Passo 56: um tópico por vez. Um tópico ainda sem agenda adotada (numa nova tentativa, o
	// primeiro já pode estar).
	const livres = [];
	for (const n of [1, 2]) {
		await delegado.goto(`${AGENDA}?topico=${n}`);
		await expect(delegado.getByRole('heading', { level: 2 })).not.toHaveCount(0);
		if (!(await delegado.getByRole('heading', { name: 'Agenda adotada' }).count())) livres.push(n);
	}
	test.skip(!livres.length, 'os dois tópicos já têm agenda adotada (banco reaproveitado)');
	const n = livres[0];
	// Propor colando uma lista (o editor de itens tem o próprio teste, no passo 56).
	const propor = async (page: Page, lista: string) => {
		await page.goto(`${AGENDA}?topico=${n}`);
		await page.getByRole('button', { name: /^(Propor agenda|Editar a minha proposta)$/ }).click();
		const editor = page.getByRole('dialog');
		await editor.getByText('Colar uma lista').click();
		await editor.locator('.colar-lista textarea').fill(lista);
		await editor.getByRole('button', { name: 'Montar os itens' }).click();
		await editor.getByRole('button', { name: 'Salvar proposta' }).click();
		await expect(page.getByRole('status')).toHaveText('Proposta salva.');
	};
	await propor(delegado, 'A. Causas\n  A.1 Financiamento\nB. Respostas');
	const mesa = await abrir(browser, C.conta(CONTAS.mesa), AGENDA);
	await propor(mesa, 'A. Contexto\nB. Cooperação\n  B.1 Inteligência');

	// No notebook, as propostas do mesmo tópico ficam lado a lado.
	const daDelegacao = mesa.getByRole('article', { name: `Proposta de ${outra}` });
	const daMesa = mesa.getByRole('article', { name: 'Proposta de Mesa' });
	const [a, b] = await Promise.all([daDelegacao.boundingBox(), daMesa.boundingBox()]);
	expect(Math.abs(a!.y - b!.y)).toBeLessThan(5);
	// A árvore: "A.1 Financiamento" fica dentro de "A. Causas".
	await expect(
		daDelegacao.getByRole('listitem').filter({ hasText: 'A. Causas' }).getByRole('listitem')
	).toHaveText(/A\.1 Financiamento/);

	await daDelegacao.getByRole('button', { name: 'Adotar esta' }).click();
	await mesa.getByRole('dialog').getByRole('button', { name: 'Adotar esta' }).click();
	const adotada = mesa.getByRole('article', { name: 'Agenda adotada' });
	await expect(adotada).toContainText('A.1 Financiamento');
	const andamento = adotada.getByRole('combobox', { name: 'Andamento de A. Causas' });
	await andamento.selectOption('em_debate');
	await expect(andamento).toHaveValue('em_debate');
	await Promise.all([delegado, mesa].map((p) => p.context().close()));
});

test.describe('telão em 1920 × 1080', () => {
	test.use({ viewport: { width: 1920, height: 1080 } });

	test('mostra orador, bandeira, cronômetro e o tópico, sem rolagem e sem a navegação do app', async ({ page }) => {
		await entrar(page, C.conta(CONTAS.mesa));
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
		test.skip(!process.env.CAPTURAS, 'capturas só no contêiner (npm run capturas)');
		await page.clock.install();
		await entrar(page, C.conta(CONTAS.mesa));
		await page.goto(TELAO);
		await aoVivo(page);
		await expect(page.getByRole('region', { name: 'Com a palavra' })).toContainText(outra);
		// Depois de uma votação, a grade fica 30 s na tela (passo 23): o relógio pula esse tempo.
		await page.clock.fastForward(30_000);
		await expect(page.getByRole('complementary', { name: 'Próximos oradores' })).toBeVisible();
		// A presidência do rodízio depende de quantas vezes o fluxo já rodou: fica invisível.
		await expect(page).toHaveScreenshot('telao.png', { mask: [page.locator('.cronometro')], stylePath: OCULTAR_RODIZIO });
	});
});

test('aparência do painel da presidência', async ({ page }) => {
	test.skip(!process.env.CAPTURAS, 'capturas só no contêiner (npm run capturas)');
	await entrar(page, C.conta(contaDaDelegacao(preside)));
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
		await entrar(page, C.conta(contaDaDelegacao(preside)));
		for (const [rota, titulo] of [
			[SESSAO, /^Sessão/],
			[PRESIDENCIA, 'Presidência'],
			[AGENDA, 'Agenda']
		] as const) {
			await page.goto(rota);
			await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
			await semErrosDeAcessibilidade(page);
		}
		await sair(page);
		await expect(page).toHaveURL(/\/entrar$/);

		await entrar(page, C.conta(CONTAS.mesa));
		for (const rota of [CHAMADA, PRESIDENCIA, TELAO]) {
			await page.goto(rota);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			await aoVivo(page);
			await semErrosDeAcessibilidade(page);
		}
	});
}

test('a presidência passada vai para a próxima delegação sorteada', async ({ browser }) => {
	const painel = await abrir(browser, C.conta(contaDaDelegacao(preside)), PRESIDENCIA);
	const mesa = await abrir(browser, C.conta(CONTAS.mesa), SESSAO);

	await painel.getByRole('button', { name: 'Passar a presidência' }).click();
	await painel.getByRole('dialog').getByRole('button', { name: 'Passar a presidência' }).click();
	await expect(painel.getByText('Você não preside esta sessão.')).toBeVisible();
	const quem = mesa.locator('.quem-preside strong');
	await expect(quem).not.toHaveText(preside);
	await expect(quem).not.toHaveText('Mesa');
	await expect(quem).not.toBeEmpty();
	await Promise.all([painel, mesa].map((p) => p.context().close()));
});
