import { expect, test, type Browser, type Page } from '@playwright/test';
import { contaDoTreino, DELEGACOES_TREINO, isolado } from '../scripts/delegacoes.ts';
import { clienteComo, entrar } from './ajuda.ts';

// Passo 39: a cópia do TREINO só deste arquivo (scripts/delegacoes.ts).
const C = isolado('12');

// O fim do fluxo do piloto no comitê de treino: o projeto de resolução votado, com a
// mesa no teclado, uma delegação num celular em 3G lento e o telão. As etapas
// anteriores (agenda, debate, crise, editor e press) têm os próprios testes (06 a 11).
const MESA = C.conta('mesa-treino@exemplo.test');
const SESSAO = `/comite/${C.sigla}/sessao`;
const PRESIDENCIA = `/comite/${C.sigla}/sessao/presidencia`;
const TELAO = `/telao/${C.sigla}`;
const TITULO = `Pacto do Rio Aurora ${Date.now()}`;
const SIGNATARIOS = ['Brasil', 'Argentina', 'Chile', 'Paraguai', 'Uruguai'];

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'o fluxo do piloto roda num projeto só');
});

async function abrir(browser: Browser, conta: string, rota: string, viewport?: { width: number; height: number }) {
	const contexto = await browser.newContext(viewport ? { viewport, isMobile: viewport.width < 500 } : {});
	const page = await contexto.newPage();
	await entrar(page, conta);
	await page.goto(rota);
	return page;
}

const aoVivo = (page: Page, timeout = 10_000) => expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout });

let comite = '';
let delegacoes: { id: string; nome: string }[] = [];

test('preparação: sessão aberta, todas presentes e um projeto aprovado pela mesa', async () => {
	const mesa = await clienteComo(MESA);
	comite = (await mesa.from('comite').select('id').eq('sigla', C.sigla).single()).data!.id;
	delegacoes = (await mesa.from('delegacao').select('id, nome').eq('comite_id', comite)).data!;

	// Uma sessão nova a cada execução; quem preside a votação é a mesa.
	const sessao = await mesa.rpc('abrir_sessao', { p_comite: comite });
	expect(sessao.error).toBeNull();
	const presenca = await mesa
		.from('presenca')
		.insert(delegacoes.map((d) => ({ sessao_id: sessao.data!, comite_id: comite, delegacao_id: d.id })));
	expect(presenca.error).toBeNull();
	const fase = (await mesa.from('estado_sessao').select('fase').eq('comite_id', comite).single()).data!.fase;
	if (fase === 'debate') expect((await mesa.rpc('assumir_presidencia', { p_comite: comite, p_assumir: true })).error).toBeNull();

	// O projeto: um bloco, três cláusulas, cinco signatários, enviado e aprovado pela mesa.
	const [redator, ...outros] = await Promise.all(SIGNATARIOS.map((nome) => clienteComo(C.conta(contaDoTreino(nome)))));
	const bloco = await redator.rpc('criar_bloco', { p_comite: comite, p_nome: `Bloco do Prata ${Date.now()}` });
	expect(bloco.error).toBeNull();
	for (const cliente of outros) expect((await cliente.rpc('entrar_bloco', { p_bloco: bloco.data! })).error).toBeNull();
	const projeto = await redator.rpc('criar_documento', {
		p_bloco: bloco.data!,
		p_tipo: 'projeto',
		p_titulo: TITULO
		// Sem tópico: um tópico só tem uma resolução aprovada, e o teste roda várias vezes.
	});
	expect(projeto.error).toBeNull();
	for (const [tipo, texto] of [
		['preambular', 'Preocupado com a seca no Rio Aurora'],
		['operativa', 'Cria uma comissão binacional das águas'],
		['operativa', 'Decide continuar ocupando-se da questão']
	]) {
		expect((await redator.rpc('adicionar_clausula', { p_documento: projeto.data!, p_tipo: tipo, p_texto: texto })).error).toBeNull();
	}
	for (const cliente of [redator, ...outros]) {
		expect((await cliente.rpc('assinar', { p_documento: projeto.data!, p_assinar: true })).error).toBeNull();
	}
	expect((await redator.rpc('enviar_documento', { p_documento: projeto.data!, p_aprovacao: 'votacao' })).error).toBeNull();
	expect((await mesa.rpc('aprovar_documento', { p_documento: projeto.data!, p_aprovar: true })).error).toBeNull();
});

test('a mesa abre a votação pelo teclado, o celular em 3G lento vota e o telão mostra o resultado', async ({ browser }) => {
	test.setTimeout(120_000);
	const telao = await abrir(browser, MESA, TELAO, { width: 1920, height: 1080 });
	await aoVivo(telao);

	// O celular do Brasil numa rede ruim: 400 ms de latência e 400 kbit/s.
	const contexto = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true });
	const celular = await contexto.newPage();
	const cdp = await contexto.newCDPSession(celular);
	await cdp.send('Network.emulateNetworkConditions', {
		offline: false,
		latency: 400,
		downloadThroughput: (400 * 1024) / 8,
		uploadThroughput: (400 * 1024) / 8
	});
	await entrar(celular, C.conta(contaDoTreino('Brasil')));
	await celular.goto(SESSAO);
	await aoVivo(celular, 30_000);

	const mesa = await abrir(browser, MESA, PRESIDENCIA);
	await aoVivo(mesa);
	const abrirVotacao = mesa.getByRole('button', { name: new RegExp(`^Abrir a votação: .*${TITULO}$`) });
	await expect(abrirVotacao).toBeVisible();
	// Só com o teclado: Tab até o botão e Enter.
	let chegou = false;
	for (let i = 0; i < 150 && !chegou; i++) {
		await mesa.keyboard.press('Tab');
		chegou = await abrirVotacao.evaluate((botao) => botao === document.activeElement);
	}
	expect(chegou, 'o botão de abrir a votação é alcançável pelo Tab').toBe(true);
	await mesa.keyboard.press('Enter');
	await expect(mesa.getByRole('region', { name: 'Votação aberta' })).toContainText(TITULO);

	// O celular recebe a votação sem recarregar e vota.
	const votacao = celular.getByRole('article', { name: /Votação/ });
	await expect(votacao).toContainText(TITULO, { timeout: 30_000 });
	await votacao.getByRole('button', { name: 'A favor' }).click();
	await expect(votacao).toContainText('Voto da sua delegação: A favor', { timeout: 30_000 });

	// As outras delegações votam pelos próprios aparelhos (aqui, pela API).
	const id = (await (await clienteComo(MESA)).from('votacao').select('id').eq('comite_id', comite).eq('aberta', true).single()).data!.id;
	for (const [nome] of DELEGACOES_TREINO.filter(([nome]) => nome !== 'Brasil')) {
		const cliente = await clienteComo(C.conta(contaDoTreino(nome)));
		const escolha = nome === 'Bolívia' ? 'contra' : 'a_favor';
		expect((await cliente.rpc('votar', { p_votacao: id, p_escolha: escolha })).error).toBeNull();
	}
	await expect(mesa.getByText(`${DELEGACOES_TREINO.length} de ${DELEGACOES_TREINO.length} votaram`)).toBeVisible({ timeout: 10_000 });

	await mesa.getByRole('button', { name: 'Encerrar a votação' }).focus();
	await mesa.keyboard.press('Enter');
	await expect(mesa.getByRole('dialog')).toBeVisible();
	await mesa.keyboard.press('Enter');
	await expect(telao.getByText(new RegExp(`${TITULO}\\. Aprovada: 5 a favor, 1 contra`))).toBeVisible({ timeout: 10_000 });
	await expect(mesa.getByRole('region', { name: 'Projetos de resolução' }).getByRole('listitem').filter({ hasText: TITULO })).toContainText(
		'Aprovado'
	);
	await Promise.all([telao, celular, mesa].map((p) => p.context().close()));
});

test('a conexão cai no meio da sessão, e a tela do celular se atualiza quando ela volta', async ({ browser }) => {
	const celular = await abrir(browser, C.conta(contaDoTreino('Chile')), SESSAO, { width: 360, height: 740 });
	await aoVivo(celular);
	const palavra = celular.getByRole('article', { name: 'Com a palavra' });

	await celular.context().setOffline(true);
	const mesa = await clienteComo(MESA);
	const orador = delegacoes.find((d) => d.nome === 'Uruguai')!;
	expect((await mesa.rpc('dar_palavra', { p_comite: comite, p_delegacao: orador.id, p_seg: 60 })).error).toBeNull();
	await celular.waitForTimeout(3_000);
	await celular.context().setOffline(false);

	await expect(palavra).toContainText('Uruguai', { timeout: 40_000 });
	await aoVivo(celular, 40_000);
	await celular.context().close();
});
