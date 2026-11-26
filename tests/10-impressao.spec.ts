import { expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contaDaDelegacao, isolado } from '../scripts/delegacoes.ts';
import { pdfDeTexto } from '../scripts/demonstracao/pdf.ts';
import { adotarAgenda, clienteComo, CONTAS, entrar, abrirAcao } from './ajuda.ts';

// Passo 39: a cópia do CSNU-T só deste arquivo (scripts/delegacoes.ts).
const C = isolado('10');

const DPO = `/comite/${C.sigla}/dpo`;
const CARTAS = `/comite/${C.sigla}/cartas`;
const CARTA = `Proposta de cooperação ${Date.now()}`;

// O DPO dos EUA passa da delegação para o comitê e para a mesa: roda em série, num projeto só.
test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'o fluxo de impressão roda num projeto só');
});

async function abrir(browser: Browser, conta: string, rota: string, viewport?: { width: number; height: number }) {
	const contexto = await browser.newContext(viewport ? { viewport, isMobile: viewport.width < 500 } : {});
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

let projeto = '';

// Passo 53: o DPO é um PDF que a delegação envia e o comitê lê na hora, sem aprovação.
test('o DPO em PDF: enviado no celular, lido por outra delegação, trocado, comentado e retirado pela mesa', async ({ browser }) => {
	const celular = await abrir(browser, C.conta(CONTAS.delegado), DPO, { width: 390, height: 844 });
	const meu = celular.getByRole('region', { name: /^Tópico 1:/ });
	const arquivo = meu.getByLabel(/^(Enviar|Trocar) o PDF: Tópico 1$/);

	// Recusado com mensagem clara: o que não é PDF e o que passa de 5 MB.
	await arquivo.setInputFiles({ name: 'dpo.txt', mimeType: 'text/plain', buffer: Buffer.from('texto') });
	await expect(celular.getByRole('alert')).toHaveText('O DPO precisa ser um arquivo PDF.');
	await arquivo.setInputFiles({ name: 'grande.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
	await expect(celular.getByRole('alert')).toContainText('passa de 5 MB');

	await arquivo.setInputFiles({ name: 'dpo.pdf', mimeType: 'application/pdf', buffer: pdfDeTexto('DPO · EUA', 'Primeiro parágrafo.') });
	await expect(celular.getByRole('status')).toHaveText('DPO enviado. O comitê já pode ler.');
	await expect(meu.getByText('Enviado', { exact: true })).toBeVisible();

	// Outra delegação do comitê lê o arquivo na hora, sem aprovação.
	const brasil = await abrir(browser, C.conta(contaDaDelegacao('Brasil')), DPO);
	const link = brasil.getByRole('link', { name: 'Abrir o PDF: DPO de EUA, Tópico 1' });
	const href = (await link.getAttribute('href'))!;
	const pdf = await brasil.request.get(href);
	expect(pdf.ok()).toBe(true);
	expect(pdf.headers()['content-type']).toBe('application/pdf');

	// Enviar de novo troca o arquivo e guarda a data do envio anterior.
	await meu.getByLabel('Trocar o PDF: Tópico 1').setInputFiles({ name: 'dpo.pdf', mimeType: 'application/pdf', buffer: pdfDeTexto('DPO · EUA', 'Versão nova.') });
	await expect(celular.getByRole('status')).toHaveText('DPO enviado. O comitê já pode ler.');
	await expect(meu.getByText('Envios anteriores:')).toBeVisible();

	// A mesa comenta (só a delegação lê) e retira o arquivo, com o motivo.
	const mesa = await abrir(browser, C.conta(CONTAS.mesa), DPO);
	await mesa.getByRole('button', { name: 'Comentar: DPO de EUA, Tópico 1' }).click();
	const comentar = mesa.getByRole('dialog', { name: /^Comentar: DPO de EUA/ });
	await comentar.getByLabel('Comentário para a delegação').fill('Cite as fontes do segundo parágrafo.');
	await comentar.getByRole('button', { name: 'Salvar' }).click();
	await expect(mesa.getByRole('status')).toHaveText('Comentário salvo. Só a delegação lê.');
	await expect(meu.getByRole('note', { name: 'Comentário da mesa' })).toHaveText('Cite as fontes do segundo parágrafo.');

	await mesa.getByRole('button', { name: 'Retirar: DPO de EUA, Tópico 1' }).click();
	const retirar = mesa.getByRole('dialog', { name: /^Retirar: DPO de EUA/ });
	await retirar.getByRole('button', { name: 'Retirar o arquivo' }).click();
	await expect(retirar.getByRole('alert')).toHaveText('Diga por que o DPO foi retirado.');
	await retirar.getByLabel('Motivo').fill('O arquivo é de outro comitê.');
	await retirar.getByRole('button', { name: 'Retirar o arquivo' }).click();
	await expect(mesa.getByRole('status')).toContainText('DPO retirado.');

	await expect(meu.getByText('Retirado pela mesa')).toBeVisible();
	await expect(meu.getByRole('note', { name: 'Comentário da mesa' })).toHaveText('O arquivo é de outro comitê.');
	await expect(link).toBeHidden();
	expect((await brasil.request.get(href)).ok()).toBe(false);
	await Promise.all([celular, brasil, mesa].map((p) => p.context().close()));
});

test('o projeto impresso tem a linha do comitê e os signatários', async ({ page }) => {
	// O projeto é montado pela API, como o app faria (o editor já foi testado no passo 09).
	const eua = await clienteComo(C.conta(CONTAS.delegado));
	const comite = (await eua.from('comite').select('id').eq('sigla', C.sigla).single()).data!.id;
	const bloco = await eua.rpc('criar_bloco', { p_comite: comite, p_nome: `Bloco da impressão ${Date.now()}` });
	expect(bloco.error).toBeNull();
	for (const nome of ['Rússia', 'China', 'Reino Unido', 'França']) {
		const cliente = await clienteComo(C.conta(contaDaDelegacao(nome)));
		expect((await cliente.rpc('entrar_bloco', { p_bloco: bloco.data! })).error).toBeNull();
	}
	await adotarAgenda(C.conta(CONTAS.mesa), C.sigla, 1);
	const documento = await eua.rpc('criar_documento', {
		p_bloco: bloco.data!,
		p_tipo: 'projeto',
		p_titulo: 'Segurança marítima',
		p_topico: 1
	});
	expect(documento.error).toBeNull();
	projeto = documento.data!;
	for (const [tipo, texto] of [
		['preambular', 'Recordando a resolução 2722'],
		['operativa', 'Condena os ataques a navios mercantes'],
		['operativa', 'Decide continuar ocupando-se da questão']
	]) {
		expect((await eua.rpc('adicionar_clausula', { p_documento: projeto, p_tipo: tipo, p_texto: texto })).error).toBeNull();
	}
	for (const conta of [C.conta(CONTAS.delegado), ...['Rússia', 'China', 'Reino Unido', 'França'].map((n) => C.conta(contaDaDelegacao(n)))]) {
		const cliente = await clienteComo(conta);
		expect((await cliente.rpc('assinar', { p_documento: projeto, p_assinar: true })).error).toBeNull();
	}

	await entrar(page, C.conta(CONTAS.delegado));
	await page.goto(`/documento/${projeto}`);
	// Passo 57: a impressão fica em "Mais opções", na faixa das assinaturas.
	await page.getByText('Mais opções').click();
	await page.getByRole('link', { name: 'Imprimir ou salvar como PDF' }).click();
	const folha = page.getByRole('article', { name: 'Documento para impressão' });
	await expect(folha.getByRole('heading', { level: 1 })).toHaveText('Projeto de resolução: Segurança marítima');
	await expect(folha).toContainText('O Conselho de Segurança:');
	await expect(folha).toContainText('1. Condena os ataques a navios mercantes;');
	await expect(folha).toContainText('2. Decide continuar ocupando-se da questão.');
	await expect(folha).toContainText('Signatários: French Republic, People');
	await page.emulateMedia({ media: 'print' });
	expect((await page.pdf({ format: 'A4' })).byteLength).toBeGreaterThan(1000);
});

test('a carta privada só chega ao destinatário', async ({ browser }) => {
	const eua = await abrir(browser, C.conta(CONTAS.delegado), CARTAS);
	await abrirAcao(eua, 'Escrever carta');
	await eua.getByRole('button', { name: 'Escolher: Para as delegações' }).click();
	await eua.getByRole('group', { name: 'Para as delegações' }).getByLabel('Brasil').check();
	await eua.getByRole('button', { name: 'Pronto' }).click();
	await eua.getByLabel('Título').fill(CARTA);
	await eua.getByLabel('Carta', { exact: true }).fill('Propomos uma reunião bilateral.\n\nAguardamos a resposta.');
	await eua.getByRole('button', { name: 'Enviar carta' }).click();
	await expect(eua.getByRole('status')).toHaveText('Carta enviada.');

	const brasil = await abrir(browser, C.conta(contaDaDelegacao('Brasil')), CARTAS);
	await expect(brasil.getByRole('region', { name: 'Cartas' })).toContainText(CARTA);
	const china = await abrir(browser, C.conta(contaDaDelegacao('China')), CARTAS);
	await expect(china.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	await expect(china.getByRole('region', { name: 'Cartas' })).not.toContainText(CARTA);

	await brasil.getByRole('link', { name: `Abrir e imprimir a carta "${CARTA}"` }).click();
	const folha = brasil.getByRole('article', { name: 'Carta para impressão' });
	await expect(folha).toContainText('United States of America');
	await expect(folha).toContainText('Para: Federative Republic of Brazil');
	await expect(folha.getByRole('heading', { level: 1 })).toHaveText(CARTA);
	await semErrosDeAcessibilidade(brasil);
	await Promise.all([eua, brasil, china].map((p) => p.context().close()));
});

for (const tema of ['light', 'dark'] as const) {
	test(`as telas de DPO, cartas e impressão não têm erros de acessibilidade (tema ${tema})`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: tema });
		await entrar(page, C.conta(CONTAS.delegado));
		for (const rota of [DPO, CARTAS, `/imprimir/documento/${projeto}`]) {
			await page.goto(rota);
			await expect(page.locator('main h1')).toBeVisible();
			await semErrosDeAcessibilidade(page);
		}
	});
}
