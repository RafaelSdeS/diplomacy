import { expect, test, type Browser, type Page } from '@playwright/test';
import { contaDoTreino, DELEGACOES_TREINO, isolado } from '../scripts/delegacoes.ts';
import { clienteComo, entrar, escolher, abrirAcao, abrirPainel, projetoPronto } from './ajuda.ts';

// Passo 39: a cópia do TREINO só deste arquivo (scripts/delegacoes.ts).
const C = isolado('16');

// Passo 16: a votação nominal de um projeto, do painel da mesa ao telão, e a OEA com
// tecnologia restrita (a mesa registra falas e votos; o telão acompanha).

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'roda num projeto só');
});

const TITULO = `Acordo das águas ${Date.now()}`;

async function abrir(browser: Browser, conta: string, rota: string, viewport = { width: 1366, height: 768 }) {
	const contexto = await browser.newContext({ viewport, isMobile: viewport.width < 500 });
	const page = await contexto.newPage();
	await entrar(page, conta);
	await page.goto(rota);
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	return page;
}

/** Sessão nova com todos presentes, presidida pela mesa. */
async function sessaoAberta(contaMesa: string, sigla: string) {
	const mesa = await clienteComo(contaMesa);
	const comite = (await mesa.from('comite').select('id').eq('sigla', sigla).single()).data!.id;
	const delegacoes = (await mesa.from('delegacao').select('id, nome').eq('comite_id', comite).neq('situacao', 'suspensa')).data!;
	const sessao = await mesa.rpc('abrir_sessao', { p_comite: comite });
	expect(sessao.error).toBeNull();
	expect(
		(await mesa.from('presenca').insert(delegacoes.map((d) => ({ sessao_id: sessao.data!, comite_id: comite, delegacao_id: d.id })))).error
	).toBeNull();
	const fase = (await mesa.from('estado_sessao').select('fase').eq('comite_id', comite).single()).data!.fase;
	if (fase !== 'plenaria') await mesa.rpc('assumir_presidencia', { p_comite: comite, p_assumir: true });
	return { mesa, comite, delegacoes };
}

test('uma votação nominal completa, do painel da mesa ao telão', async ({ browser }) => {
	test.setTimeout(120_000);
	await sessaoAberta(C.conta('mesa-treino@exemplo.test'), C.sigla);

	// Um projeto da sala aprovado pela mesa (sem tópico: o teste roda várias vezes).
	await projetoPronto(C.sigla, TITULO, [['operativa', 'Cria a comissão das águas']], ['Brasil', 'Argentina', 'Chile', 'Paraguai', 'Uruguai']);

	const telao = await abrir(browser, C.conta('mesa-treino@exemplo.test'), `/telao/${C.sigla}`, { width: 1920, height: 1080 });
	const painel = await abrir(browser, C.conta('mesa-treino@exemplo.test'), `/comite/${C.sigla}/sessao/presidencia`);
	const celular = await abrir(browser, C.conta(contaDoTreino('Chile')), `/comite/${C.sigla}/sessao`, { width: 360, height: 740 });

	// A mesa anuncia a votação: a sala fecha. O Chile pede a votação nominal pelo celular.
	await abrirPainel(painel, 'Projetos de resolução');
	await painel.getByRole('button', { name: new RegExp(`^Iniciar a votação \\(sala fechada\\): .*${TITULO}$`) }).click();
	await abrirAcao(celular, 'Fazer um ponto ou moção');
	await celular.getByRole('radio', { name: /^Moção de votação nominal/ }).check();
	await celular.getByRole('button', { name: /^Enviar/ }).click();
	await expect(celular.getByText('Moção de votação nominal: enviado à mesa.')).toBeVisible();
	await abrirPainel(painel, 'Pontos e moções');
	await painel.getByRole('button', { name: /^Reconhecer: Moção de votação nominal/ }).click();
	await abrirPainel(painel, 'Projetos de resolução');
	await painel.getByRole('button', { name: new RegExp(`^Abrir a votação: .*${TITULO}$`) }).click();
	await expect(painel.getByRole('region', { name: 'Votação aberta' })).toContainText('votação nominal');
	await expect(telao.getByText(/^Votação nominal · /)).toBeVisible({ timeout: 10_000 });
	await expect(celular.getByText('Votação nominal:', { exact: true })).toBeVisible({ timeout: 10_000 });

	// Chamada em ordem alfabética: a Argentina passa a vez e vota no fim. Passo 51: os controles
	// da votação ficam no cartão "Conduzir a votação".
	const chamada = painel.getByRole('region', { name: 'Conduzir a votação' });
	await chamada.getByRole('button', { name: 'Passou a vez: Argentina' }).click();
	await expect(chamada.getByText('Passou a vez')).toBeVisible();
	for (const [nome] of DELEGACOES_TREINO.filter(([n]) => n !== 'Argentina')) {
		await chamada.getByRole('button', { name: `A favor: ${nome}` }).click();
		await expect(chamada.getByRole('button', { name: `A favor: ${nome}` })).toBeVisible();
	}
	await chamada.getByRole('button', { name: 'Contra: Argentina' }).click();
	await expect(painel.getByText(`${DELEGACOES_TREINO.length} de ${DELEGACOES_TREINO.length} votaram`)).toBeVisible({ timeout: 10_000 });
	await chamada.getByRole('button', { name: 'Encerrar a votação' }).click();
	await chamada.getByRole('dialog').getByRole('button', { name: 'Encerrar a votação' }).click();
	await expect(telao.getByText(new RegExp(`${TITULO}\\. Aprovada: 5 a favor, 1 contra`))).toBeVisible({ timeout: 10_000 });
	await Promise.all([telao, painel, celular].map((p) => p.context().close()));
});

test('com tecnologia restrita, a mesa registra falas e votos, e o telão acompanha', async ({ browser }) => {
	const { mesa, comite } = await sessaoAberta('mesa-oea@exemplo.test', 'OEA-T');

	const delegado: Page = await abrir(browser, 'oea-brasil@exemplo.test', '/comite/OEA-T/sessao', { width: 360, height: 740 });
	await expect(delegado.getByRole('note')).toHaveText(/^Tecnologia restrita/);
	await expect(delegado.getByRole('button', { name: /Levantar placa/ })).toHaveCount(0);
	const brasil = await clienteComo('oea-brasil@exemplo.test');
	expect((await brasil.rpc('levantar_placa', { p_comite: comite })).error?.code).toBe('42501');

	const telao = await abrir(browser, 'mesa-oea@exemplo.test', '/telao/OEA-T', { width: 1920, height: 1080 });
	const painel = await abrir(browser, 'mesa-oea@exemplo.test', '/comite/OEA-T/sessao/presidencia');
	const registro = painel.getByRole('form', { name: 'Registrar pedido de fala' });
	await escolher(registro, 'Delegação que levantou a placa', 'Brasil');
	await registro.getByRole('button', { name: 'Registrar pedido de fala' }).click();
	await expect(telao.getByRole('complementary', { name: 'Próximos oradores' })).toContainText('Brasil', { timeout: 10_000 });

	// A mesa conta as placas de uma votação procedimental (Cuba, suspensa, não vota).
	expect((await mesa.rpc('abrir_votacao_livre', { p_comite: comite, p_objeto: `Pausa para o café ${Date.now()}` })).error).toBeNull();
	await painel.getByText('Registrar votos de placa').click();
	for (const nome of ['Argentina', 'Brasil', 'Chile', 'Estados Unidos', 'México']) {
		await painel.getByRole('button', { name: `A favor: ${nome}` }).click();
	}
	await expect(painel.getByRole('button', { name: 'A favor: Cuba' })).toHaveCount(0);
	await expect(telao.getByRole('complementary', { name: 'Votação' }).getByText('A favor')).toHaveCount(5, { timeout: 10_000 });
	await painel.getByRole('button', { name: 'Encerrar a votação' }).click();
	await painel.getByRole('dialog').getByRole('button', { name: 'Encerrar a votação' }).click();
	await expect(delegado.getByRole('article', { name: 'Última votação' })).toContainText('Aprovada', { timeout: 10_000 });
	await Promise.all([delegado, telao, painel].map((p) => p.context().close()));
});
