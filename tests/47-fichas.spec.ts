import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contaDoTreino, isolado } from '../scripts/delegacoes.ts';
import { CONTAS, clienteComo, comiteEmDebate, entrar, desfazerRapido, noCentro } from './ajuda.ts';

// Passo 47 (item 4): as fichas da votação, do ponto e da nota abrem por cima da tela, sem
// mudar a URL, e a ação da ficha (encerrar a votação, retirar o ponto) funciona dali.
const C = isolado('47');

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a sessão do comitê de teste é uma só');
});

const MESA = C.conta('mesa-treino@exemplo.test');
const PARAGUAI = C.conta(contaDoTreino('Paraguai'));
let comite = '';

test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const { mesa, comite: id } = await comiteEmDebate(MESA, C.sigla, PARAGUAI);
	comite = id;
	// Banco reaproveitado: uma votação que ficou aberta de outra rodada fecha antes.
	const abertas = (await mesa.from('votacao').select('id').eq('comite_id', comite).eq('aberta', true)).data ?? [];
	for (const v of abertas) await mesa.rpc('encerrar_votacao', { p_votacao: v.id });
});

const aoVivo = (page: Page) => expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
const semErrosDeAcessibilidade = async (page: Page) =>
	expect((await new AxeBuilder({ page }).include('dialog[open]').analyze()).violations).toEqual([]);

test('a ficha da votação abre sem mudar a URL, e a mesa encerra a votação dali', async ({ page }) => {
	const mesa = await clienteComo(MESA);
	const objeto = `Pausa para o café ${Date.now()}`;
	expect((await mesa.rpc('abrir_votacao_livre', { p_comite: comite, p_objeto: objeto })).error).toBeNull();

	await entrar(page, MESA);
	await page.goto(`/comite/${C.sigla}/sessao/presidencia`);
	await aoVivo(page);
	const url = page.url();
	await page.getByRole('region', { name: 'Votação aberta' }).getByRole('button', { name: objeto }).click();
	const ficha = page.getByRole('dialog', { name: objeto });
	await expect(ficha).toContainText('Aberta');
	await expect(ficha).toContainText('Não votaram');
	expect(page.url()).toBe(url);
	await semErrosDeAcessibilidade(page);
	await noCentro(ficha);

	await ficha.getByRole('button', { name: 'Encerrar a votação' }).click();
	await page.getByRole('dialog', { name: `Encerrar a votação de ${objeto}?` }).getByRole('button', { name: 'Encerrar a votação' }).click();
	// A ficha continua aberta e mostra o resultado, que chega ao vivo.
	await expect(ficha).toContainText('Rejeitada');
	await expect(ficha.getByRole('button', { name: 'Encerrar a votação' })).toHaveCount(0);
	await page.keyboard.press('Escape');
	await expect(ficha).toBeHidden();
	expect(page.url()).toBe(url);
});

test('a delegação abre a ficha do próprio ponto e o retira dali', async ({ page }) => {
	const detalhe = `Qual é o tempo de fala? ${Date.now()}`;
	const paraguai = await clienteComo(PARAGUAI);
	expect((await paraguai.rpc('enviar_ponto', { p_comite: comite, p_tipo: 'ponto_duvida', p_detalhe: detalhe })).error).toBeNull();

	await desfazerRapido(page);
	await entrar(page, PARAGUAI);
	await page.goto(`/comite/${C.sigla}/sessao`);
	await aoVivo(page);
	const url = page.url();
	// O mais novo fica por último (banco reaproveitado: os de outras rodadas já foram retirados).
	await page.getByRole('list', { name: 'Seus pontos e moções' }).getByRole('button', { name: 'Ponto de dúvida' }).last().click();
	const ficha = page.getByRole('dialog', { name: 'Ponto de dúvida' });
	await expect(ficha).toContainText(detalhe);
	await expect(ficha).toContainText('Paraguai');
	await expect(ficha).toContainText('Aguardando o bureau');
	expect(page.url()).toBe(url);
	await noCentro(ficha);
	await semErrosDeAcessibilidade(page);

	// Passo 47 (item 10): retirar tem volta. "Desfazer" cancela; sem ele, vale depois da espera.
	await ficha.getByRole('button', { name: 'Retirar' }).click();
	await ficha.getByRole('button', { name: 'Desfazer' }).click();
	await expect(ficha).toContainText('Aguardando o bureau');
	await ficha.getByRole('button', { name: 'Retirar' }).click();
	await expect(ficha).toContainText('Retirado');
	await expect(ficha.getByRole('button', { name: 'Retirar' })).toHaveCount(0);
});

test('a ficha da nota mostra o texto inteiro, na página da crise', async ({ page }) => {
	const paraguai = await clienteComo(PARAGUAI);
	const titulo = `Pedido de informações ${Date.now()}`;
	const texto = 'O Paraguai pede os dados das barragens.\nE o calendário das cheias.';
	// Limite de notas pendentes: com uma já esperando de outra rodada, usa ela.
	const pendente = (
		await paraguai.from('nota_crise').select('titulo, texto').eq('comite_id', comite).eq('status', 'pendente').limit(1)
	).data?.[0];
	if (!pendente)
		expect(
			(await paraguai.rpc('enviar_nota', { p_id: crypto.randomUUID(), p_comite: comite, p_tipo: 'nota', p_titulo: titulo, p_texto: texto }))
				.error
		).toBeNull();
	const nota = pendente ?? { titulo, texto };

	await entrar(page, PARAGUAI);
	await page.goto(`/comite/${C.sigla}/crise`);
	const url = page.url();
	await page.getByRole('button', { name: nota.titulo }).click();
	const ficha = page.getByRole('dialog', { name: nota.titulo });
	await expect(ficha).toContainText(nota.texto.split('\n')[0]);
	await expect(ficha).toContainText('Nota');
	expect(page.url()).toBe(url);
	await semErrosDeAcessibilidade(page);
	await noCentro(ficha);
});

test('a prévia da carta abre na central de Documentos e na página de cartas, sem mudar a URL', async ({ page }) => {
	const paraguai = await clienteComo(PARAGUAI);
	const titulo = `Convite ao diálogo ${Date.now()}`;
	const corpo = 'O Paraguai convida as delegações para uma reunião.\n\nAguardamos as respostas.';
	expect((await paraguai.rpc('enviar_carta', { p_comite: comite, p_titulo: titulo, p_corpo: corpo, p_publica: true })).error).toBeNull();

	await entrar(page, PARAGUAI);
	for (const rota of [`/comite/${C.sigla}/documentos`, `/comite/${C.sigla}/cartas`]) {
		await page.goto(rota);
		await page.getByRole('button', { name: titulo }).click();
		const previa = page.getByRole('dialog', { name: titulo });
		await expect(previa).toContainText('Aguardamos as respostas.');
		await expect(previa.getByRole('link', { name: 'Imprimir ou salvar como PDF' })).toHaveAttribute('href', /^\/imprimir\/carta\//);
		expect(page.url()).toContain(rota);
		await semErrosDeAcessibilidade(page);
		await noCentro(previa);
		await page.keyboard.press('Escape');
		await expect(previa).toBeHidden();
	}
});

test('na matéria, a delegação citada sai só pelo teclado, digitando parte do nome', async ({ page }) => {
	// O CSNU-T tem mais de seis delegações (a lista ganha o filtro); a tela só lê, nada publica.
	await entrar(page, CONTAS.press);
	await page.goto('/press/escrever');
	await page.getByRole('button', { name: 'Escolher: Delegações citadas' }).focus();
	await page.keyboard.press('Enter');
	const modal = page.getByRole('dialog', { name: 'Delegações citadas' });
	await expect(modal.getByRole('searchbox')).toBeFocused();
	await page.keyboard.type('russ');
	await page.keyboard.press('Enter');
	await expect(modal.getByLabel('Rússia')).toBeChecked();
	await expect(modal.getByLabel('Brasil')).toBeHidden();
	await page.keyboard.press('ArrowDown');
	await expect(modal.getByLabel('Rússia')).toBeFocused();
	await semErrosDeAcessibilidade(page);
	await page.keyboard.press('Escape');
	await expect(modal).toBeHidden();
	await expect(page.locator('.escolha-resumo')).toContainText('Rússia');
});

test('da ficha da delegação saem um bilhete e uma carta, sem ir a outra tela', async ({ page }) => {
	const bilhete = `Podemos conversar no intervalo? ${Date.now()}`;
	const titulo = `Proposta conjunta ${Date.now()}`;
	await entrar(page, PARAGUAI);
	await page.goto(`/comite/${C.sigla}/sessao`);
	await aoVivo(page);
	const url = page.url();
	await page.keyboard.press('Control+K');
	await page.getByRole('dialog', { name: 'Ir para…' }).getByRole('searchbox').fill('brasil');
	await page.getByRole('dialog', { name: 'Ir para…' }).getByRole('button', { name: 'Brasil' }).click();
	const ficha = page.getByRole('dialog', { name: 'Brasil' });
	await noCentro(ficha);
	await ficha.getByRole('button', { name: 'Mandar bilhete' }).click();
	const escrever = page.getByRole('dialog', { name: 'Bilhete para Brasil' });
	await escrever.getByLabel('Bilhete').fill(bilhete);
	await semErrosDeAcessibilidade(page);
	await escrever.getByRole('button', { name: 'Enviar bilhete' }).click();
	await expect(ficha.getByRole('status')).toHaveText('Bilhete enviado.');

	await ficha.getByRole('button', { name: 'Escrever carta' }).click();
	const carta = page.getByRole('dialog', { name: 'Carta para Brasil' });
	await carta.getByLabel('Título').fill(titulo);
	await carta.getByLabel('Carta').fill('O Paraguai propõe um projeto conjunto sobre as barragens.');
	await carta.getByRole('button', { name: 'Enviar carta' }).click();
	await expect(ficha.getByRole('status')).toHaveText('Carta enviada.');
	expect(page.url()).toBe(url);

	const brasil = await clienteComo(C.conta(contaDoTreino('Brasil')));
	expect((await brasil.from('mensagem').select('id').eq('texto', bilhete)).data).toHaveLength(1);
	expect((await brasil.from('carta').select('id').eq('titulo', titulo)).data).toHaveLength(1);
});

test('o redator divide a redação do bloco com outra delegação (passo 51)', async ({ page }) => {
	const paraguai = await clienteComo(PARAGUAI);
	const chile = await clienteComo(C.conta(contaDoTreino('Chile')));
	const nome = `Bloco do rio ${Date.now()}`;
	const bloco = (await paraguai.rpc('criar_bloco', { p_comite: comite, p_nome: nome })).data!;
	expect((await chile.rpc('entrar_bloco', { p_bloco: bloco })).error).toBeNull();

	await entrar(page, PARAGUAI);
	await page.goto(`/comite/${C.sigla}/blocos`);
	const cartao = page.getByRole('article', { name: `Bloco ${nome}` });
	await cartao.getByRole('button', { name: 'Mudar: Redatores' }).click();
	const lista = page.getByRole('dialog', { name: 'Redatores' });
	await lista.getByRole('checkbox', { name: /^Chile/ }).check();
	await lista.getByRole('button', { name: 'Pronto' }).click();
	await expect(cartao.getByRole('listitem').filter({ hasText: 'Chile' })).toContainText('Redator');
	const chileRedator = await chile.from('bloco_membro').select('redator, delegacao!inner(nome)').eq('bloco_id', bloco).eq('delegacao.nome', 'Chile').single();
	expect(chileRedator.data?.redator).toBe(true);
});

test('o redator passa a redação a outro membro e deixa de ser redator (passo 51, lote dos blocos)', async ({ page }) => {
	const paraguai = await clienteComo(PARAGUAI);
	const chile = await clienteComo(C.conta(contaDoTreino('Chile')));
	const nome = `Bloco da passagem ${Date.now()}`;
	const bloco = (await paraguai.rpc('criar_bloco', { p_comite: comite, p_nome: nome })).data!;
	expect((await chile.rpc('entrar_bloco', { p_bloco: bloco })).error).toBeNull();

	await entrar(page, PARAGUAI);
	await page.goto(`/comite/${C.sigla}/blocos`);
	const cartao = page.getByRole('article', { name: `Bloco ${nome}` });
	await cartao.getByRole('button', { name: 'Passar a redação' }).click();
	const modal = page.getByRole('dialog', { name: `Passar a redação · ${nome}` });
	await expect(modal.getByRole('button', { name: 'Confirmar: passar a redação' })).toBeDisabled();
	await modal.getByRole('radio', { name: /Chile/ }).check();
	await modal.getByRole('button', { name: 'Confirmar: passar a redação' }).click();
	await expect(modal).toBeHidden();
	await expect(cartao.getByRole('listitem').filter({ hasText: 'Chile' })).toContainText('Redator');
	await expect(cartao.getByRole('listitem').filter({ hasText: 'Paraguai' })).not.toContainText('Redator');
	await expect(cartao.getByRole('button', { name: 'Passar a redação' })).toBeHidden();
});
