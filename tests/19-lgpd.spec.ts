import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { clienteComo, CONTAS, entrar } from './ajuda.ts';

// Passo 19: direitos do titular (meus dados, pedido de exclusão), pesquisa e arquivo
// da edição. A exclusão do evento inteiro é destrutiva: fica no pgTAP.

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'roda num projeto só');
});

const EMAIL = `titular-${Date.now()}@exemplo.test`;
const NOME = `Titular ${Date.now()}`;

async function semErrosDeAcessibilidade(page: Page) {
	const { violations } = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(violations).toEqual([]);
}

async function jsonDoDownload(page: Page, botao: string) {
	const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: botao }).click()]);
	return JSON.parse(await readFile((await download.path())!, 'utf8'));
}

test('uma pessoa responde à pesquisa, baixa os próprios dados e pede a exclusão; a secretaria apaga a conta', async ({ page, browser }) => {
	// Uma pessoa nova, pelo crachá (a conta nasce no primeiro acesso).
	const secretaria = await clienteComo(CONTAS.secretaria);
	const treino = (await secretaria.from('comite').select('id, evento_id').eq('sigla', 'TREINO').single()).data!;
	const chile = (await secretaria.from('delegacao').select('id').eq('comite_id', treino.id).eq('nome', 'Chile').single()).data!;
	expect(
		(await secretaria.from('convite').insert({
			email: EMAIL, evento_id: treino.evento_id, papel: 'delegado', comite_id: treino.id, delegacao_id: chile.id, nome: NOME
		})).error
	).toBeNull();
	const codigo = (await secretaria.rpc('emitir_crachas', { p_evento: treino.evento_id, p_emails: [EMAIL] })).data![0].codigo;
	await page.goto(`/entrar/cracha#${codigo}`);
	await expect(page.getByRole('heading', { level: 1, name: 'Agora' })).toBeVisible({ timeout: 15_000 });

	await page.goto('/pesquisa');
	await page.getByRole('group', { name: /De 1 a 5/ }).getByLabel('4').check();
	await page.getByRole('button', { name: 'Enviar respostas' }).click();
	await expect(page.getByRole('status')).toHaveText('Obrigado por responder!');

	await page.goto('/perfil');
	await page.getByRole('link', { name: 'Meus dados (LGPD)' }).click();
	const dados = await jsonDoDownload(page, 'Baixar os meus dados');
	expect(dados.conta.email).toBe(EMAIL);
	expect(dados.participacoes).toEqual([expect.objectContaining({ papel: 'delegado', comite: 'TREINO', delegacao: 'Chile' })]);
	// Nenhum e-mail além do próprio.
	expect(new Set(JSON.stringify(dados).match(/[\w.+-]+@exemplo\.test/g))).toEqual(new Set([EMAIL]));
	expect(JSON.stringify(dados.credenciais)).not.toMatch(/hash/);

	await page.getByRole('button', { name: 'Pedir a exclusão da minha conta' }).click();
	await page.getByRole('button', { name: 'Sim, pedir a exclusão' }).click();
	await expect(page.getByRole('status')).toContainText('Pedido enviado à secretaria');

	const contexto = await browser.newContext();
	const sec = await contexto.newPage();
	await entrar(sec, CONTAS.secretaria);
	await sec.goto('/secretaria/dados');
	await sec.getByRole('button', { name: `Apagar a conta de ${NOME}` }).click();
	await expect(sec.getByRole('status')).toHaveText(`A conta de ${NOME} foi apagada.`);
	const restou = await secretaria.from('convite').select('id').eq('email', EMAIL);
	expect(restou.data).toEqual([]);
	await contexto.close();
});

test('o arquivo da edição tem os documentos públicos e o JSON esperados', async ({ page }) => {
	await entrar(page, CONTAS.secretaria);
	await page.goto('/secretaria/dados');
	const arquivo = await jsonDoDownload(page, 'Baixar os dados públicos (JSON)');
	expect(arquivo.evento.nome).toBe('UFRGSMUN Teste');
	const siglas = arquivo.comites.map((c: { sigla: string }) => c.sigla);
	expect(siglas).toEqual(expect.arrayContaining(['CSNU-T', 'TREINO']));
	const csnu = arquivo.comites.find((c: { sigla: string }) => c.sigla === 'CSNU-T');
	expect(csnu.regras.votacao_substantiva).toBe('csnu');
	expect(JSON.stringify(arquivo)).not.toMatch(/@exemplo\.test/);

	await page.getByRole('link', { name: 'Imprimir o arquivo (PDF)' }).click();
	const impresso = page.getByRole('article', { name: 'Arquivo da edição' });
	await expect(impresso.getByRole('region', { name: 'CSNU-T', exact: true })).toBeVisible();
	await page.emulateMedia({ media: 'print' });
	expect((await page.pdf({ format: 'A4' })).byteLength).toBeGreaterThan(1000);
});

for (const tema of ['light', 'dark'] as const) {
	test(`as telas da LGPD não têm erros de acessibilidade (tema ${tema})`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: tema });
		await page.goto('/privacidade');
		await expect(page.locator('main h1')).toHaveText('Aviso de privacidade');
		await semErrosDeAcessibilidade(page);
		await entrar(page, CONTAS.secretaria);
		for (const rota of ['/perfil/meus-dados', '/secretaria/dados', '/pesquisa']) {
			await page.goto(rota);
			await expect(page.locator('main h1')).toBeVisible();
			await semErrosDeAcessibilidade(page);
		}
	});
}
