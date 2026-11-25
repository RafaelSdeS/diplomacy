import { expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contaDaDelegacao, isolado } from '../scripts/delegacoes.ts';
import { adotarAgenda, clienteComo, CONTAS, entrar, abrirAcao } from './ajuda.ts';

// Passo 39: a cópia do CSNU-T só deste arquivo (scripts/delegacoes.ts).
const C = isolado('10');

const DPO = `/comite/${C.sigla}/dpo`;
const CARTAS = `/comite/${C.sigla}/cartas`;
const CARTA = `Proposta de cooperação ${Date.now()}`;

// O DPO dos EUA passa da delegação para a mesa e para a impressão: roda em série, num projeto só.
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

let dpo = '';
let projeto = '';

test('o DPO escrito no celular vai à mesa, que pede ajustes e depois aprova', async ({ browser }) => {
	// Uma execução anterior deixa o DPO dos EUA enviado ou aprovado: a mesa devolve para ajuste.
	const eua = await clienteComo(C.conta(CONTAS.delegado));
	const anterior = (
		await eua.from('dpo').select('id, status, delegacao!inner(nome)').eq('topico', 1).eq('delegacao.nome', 'EUA').maybeSingle()
	).data;
	if (anterior && (anterior.status === 'enviado' || anterior.status === 'aprovado')) {
		const mesa = await clienteComo(C.conta(CONTAS.mesa));
		expect((await mesa.rpc('avaliar_dpo', { p_dpo: anterior.id, p_status: 'pede_ajustes', p_comentario: 'De novo.' })).error).toBeNull();
	}

	const celular = await abrir(browser, C.conta(CONTAS.delegado), DPO, { width: 360, height: 740 });
	await expect(celular.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	// Passo 51: o cartão do tópico mostra a situação; escrever abre o modal, com a prévia ao lado.
	const topico = celular.getByRole('region', { name: /^Tópico 1:/ });
	const escrita = celular.getByRole('dialog', { name: /^DPO · Tópico 1/ });
	await topico.getByRole('button', { name: /^(Escrever|Continuar)$/ }).click();
	await escrita.getByLabel(/^Texto/).fill(
		'Os Estados Unidos condenam os ataques no Mar Vermelho.\n\nPropomos uma força naval conjunta.'
	);
	await expect(escrita).toContainText('Propomos uma força naval conjunta.');
	await escrita.getByLabel(/^Referências/).fill('Resolução 2722 (2024)\nCarta das Nações Unidas');
	await escrita.getByRole('button', { name: 'Salvar rascunho' }).click();
	await expect(escrita.getByRole('status')).toHaveText('DPO salvo.');
	await escrita.getByRole('button', { name: 'Enviar à mesa' }).click();
	await expect(escrita).toBeHidden();
	await expect(celular.getByRole('status')).toHaveText('DPO enviado à mesa.');
	await expect(topico.getByRole('button', { name: /^(Escrever|Continuar)$/ })).toHaveCount(0);

	const mesa = await abrir(browser, C.conta(CONTAS.mesa), DPO);
	await mesa.getByRole('button', { name: 'Avaliar o DPO de EUA, tópico 1' }).click();
	await mesa.getByRole('button', { name: 'Pedir ajustes' }).click();
	await expect(mesa.getByRole('alert')).toHaveText('Diga o que precisa ser ajustado.');
	await mesa.getByLabel('Comentário para a delegação').fill('Cite a fonte da força naval.');
	await mesa.getByRole('button', { name: 'Pedir ajustes' }).click();
	await expect(mesa.getByRole('status')).toHaveText('Ajustes pedidos.');

	// No celular, o comentário da mesa chega sem recarregar, e o texto volta a ser editável.
	await expect(topico.getByRole('note', { name: 'Comentário da mesa' })).toHaveText('Cite a fonte da força naval.', {
		timeout: 10_000
	});
	await topico.getByRole('button', { name: 'Continuar' }).click();
	await escrita.getByLabel(/^Referências/).fill('Resolução 2722 (2024)\nCarta das Nações Unidas\nRelatório do Secretário-Geral');
	await escrita.getByRole('button', { name: 'Enviar à mesa' }).click();
	await expect(celular.getByRole('status')).toHaveText('DPO enviado à mesa.');

	await mesa.getByRole('button', { name: 'Avaliar o DPO de EUA, tópico 1' }).click();
	await mesa.getByRole('button', { name: 'Aprovar' }).click();
	await expect(mesa.getByRole('status')).toHaveText('DPO aprovado.');
	await expect(topico.getByText('Aprovado', { exact: true })).toBeVisible({ timeout: 10_000 });

	dpo = await topico.getByRole('link', { name: 'Imprimir ou salvar como PDF' }).getAttribute('href').then((h) => h!);
	await Promise.all([celular, mesa].map((p) => p.context().close()));
});

test('o DPO impresso tem bandeira, nome oficial, tópico, duas colunas e referências', async ({ page }) => {
	await entrar(page, C.conta(CONTAS.delegado));
	await page.goto(dpo);
	const folha = page.getByRole('article', { name: 'DPO para impressão' });
	await expect(folha.getByRole('heading', { level: 1 })).toHaveText('United States of America');
	await expect(folha).toContainText('Documento de Posição Oficial');
	await expect(folha).toContainText('Tópico 1:');
	await expect(folha.locator('.dpo-texto p')).toHaveCount(2);
	await expect(folha.locator('.dpo-texto')).toHaveCSS('column-count', '2');
	await expect(folha.getByRole('region', { name: 'Referências' }).getByRole('listitem')).toHaveCount(3);
	await expect(folha).toContainText('Delegação de United States of America');
	// Sem a moldura do app, e o botão some na impressão.
	await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0);
	await page.emulateMedia({ media: 'print' });
	await expect(page.getByRole('button', { name: 'Imprimir ou salvar como PDF' })).toBeHidden();
	const pdf = await page.pdf({ format: 'A4' });
	expect(pdf.byteLength).toBeGreaterThan(1000);
	if (process.env.CAPTURAS) await expect(page).toHaveScreenshot('dpo-impresso.png', { fullPage: true });
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
		for (const rota of [DPO, CARTAS, dpo, `/imprimir/documento/${projeto}`]) {
			await page.goto(rota);
			await expect(page.locator('main h1')).toBeVisible();
			await semErrosDeAcessibilidade(page);
		}
	});
}
