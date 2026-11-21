import { expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { DELEGACOES_TREINO } from '../scripts/delegacoes.ts';
import { clienteComo, CONTAS, entrar } from './ajuda.ts';

// Passo 14: login pelo crachá e pelo código da secretaria (Edge Function
// entrar-com-cracha), e a verificação pública dos certificados.

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'o fluxo de credenciais roda num projeto só');
});

const RODADA = Date.now();
const EMAIL = `cracha-${RODADA}@exemplo.test`;
const IMPORTADOS = 150;
let evento = '';

async function celular(browser: Browser) {
	const contexto = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true });
	return contexto.newPage();
}

test('preparação: um convite novo, sem conta, no comitê de treino', async () => {
	const secretaria = await clienteComo(CONTAS.secretaria);
	const treino = (await secretaria.from('comite').select('id, evento_id').eq('sigla', 'TREINO').single()).data!;
	evento = treino.evento_id;
	const chile = (await secretaria.from('delegacao').select('id').eq('comite_id', treino.id).eq('nome', 'Chile').single()).data!;
	const { error } = await secretaria.from('convite').insert({
		email: EMAIL,
		evento_id: evento,
		papel: 'delegado',
		comite_id: treino.id,
		delegacao_id: chile.id,
		nome: 'Pessoa do Crachá'
	});
	expect(error).toBeNull();
});

test('o QR do crachá entra no celular, cria a conta no primeiro acesso e vale em outro aparelho', async ({ browser }) => {
	const secretaria = await clienteComo(CONTAS.secretaria);
	const { data, error } = await secretaria.rpc('emitir_crachas', { p_evento: evento, p_emails: [EMAIL] });
	expect(error).toBeNull();
	const codigo = data![0].codigo;

	for (const vez of ['primeiro aparelho', 'segundo aparelho']) {
		const page = await celular(browser);
		await page.goto(`/entrar/cracha#${codigo}`);
		await expect(page.getByRole('heading', { level: 1, name: 'Agora' }), vez).toBeVisible({ timeout: 15_000 });
		expect(page.url(), 'o código sai da barra de endereço').not.toContain(codigo);
		await expect(page.getByRole('article', { name: 'Você' })).toContainText('Delegado · Chile · TREINO');
		await page.context().close();
	}

	// Revogado, o crachá não entra mais.
	expect((await secretaria.rpc('revogar_credenciais', { p_evento: evento, p_email: EMAIL })).error).toBeNull();
	const page = await celular(browser);
	await page.goto(`/entrar/cracha#${codigo}`);
	await expect(page.getByRole('alert')).toHaveText('Código inválido ou vencido. Peça um novo à secretaria.');
	await page.context().close();
});

test('quem perdeu o crachá entra com o código da secretaria, uma vez só', async ({ page }) => {
	const secretaria = await clienteComo(CONTAS.secretaria);
	const { data: codigo, error } = await secretaria.rpc('emitir_codigo', { p_evento: evento, p_email: EMAIL });
	expect(error).toBeNull();

	await page.goto('/entrar');
	await page.getByLabel('Código de 8 letras e números').fill(codigo!.toLowerCase());
	await page.getByRole('button', { name: 'Entrar com o código' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Agora' })).toBeVisible({ timeout: 15_000 });

	await page.getByRole('button', { name: 'Sair' }).click();
	await page.getByLabel('Código de 8 letras e números').fill(codigo!);
	await page.getByRole('button', { name: 'Entrar com o código' }).click();
	await expect(page.getByRole('alert')).toHaveText('Código inválido ou vencido. Peça um novo à secretaria.');
});

test('/verificar mostra só nome, evento e função, sem login', async ({ page }) => {
	const secretaria = await clienteComo(CONTAS.secretaria);
	expect((await secretaria.rpc('marcar_checkin', { p_evento: evento, p_email: EMAIL })).error).toBeNull();
	expect((await secretaria.rpc('emitir_certificados', { p_evento: evento })).error).toBeNull();
	const codigo = (await secretaria.from('certificado').select('codigo').eq('email', EMAIL).single()).data!.codigo;

	await page.goto(`/verificar/${codigo}`);
	await expect(page.getByRole('status')).toHaveText('Certificado válido.');
	await expect(page.locator('dl')).toHaveText(/^Nome Pessoa do Crachá Evento UFRGSMUN Teste \d{4} Função Delegado\(a\) de Chile · Comitê de treino$/);
	await expect(page.getByText('@exemplo.test')).toHaveCount(0);

	await page.goto('/verificar/NAOEXISTE1');
	await expect(page.getByRole('alert')).toHaveText('Certificado não encontrado. Confira o código.');
});

async function semErrosDeAcessibilidade(page: Page) {
	const { violations } = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(violations).toEqual([]);
}

test('a secretaria importa um CSV fictício com 150 inscrições', async ({ page }) => {
	const linhas = ['Carimbo de data/hora,Nome completo,Endereço de e-mail,Comitê,País representado'];
	for (let i = 1; i <= IMPORTADOS; i++) {
		const n = String(i).padStart(3, '0');
		linhas.push(`2027-05-01 10:00,Importado ${RODADA} ${n},imp-${RODADA}-${n}@exemplo.test,TREINO,${DELEGACOES_TREINO[i % 6][0]}`);
		if (i === 75) linhas.push('');
	}
	linhas.push(`2027-05-01 11:00,Sem arroba,sem-arroba-${RODADA},TREINO,Chile`);
	linhas.push(`2027-05-01 11:01,Repetido,imp-${RODADA}-001@exemplo.test,TREINO,Chile`);

	await entrar(page, CONTAS.secretaria);
	await page.goto('/secretaria/participantes');
	await page.getByRole('link', { name: 'Importar inscrições' }).click();
	await page.getByLabel('Arquivo CSV').setInputFiles({
		name: 'inscricoes.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(linhas.join('\n'))
	});
	await expect(page.getByText(`${IMPORTADOS} convites prontos de ${IMPORTADOS + 2} linhas.`)).toBeVisible();
	const problemas = page.getByRole('list', { name: 'Linhas com problema' });
	await expect(problemas).toContainText(`e-mail inválido: "sem-arroba-${RODADA}"`);
	await expect(problemas).toContainText(`repetida no arquivo: imp-${RODADA}-001@exemplo.test`);
	await page.getByRole('button', { name: `Criar ${IMPORTADOS} convites` }).click();
	await expect(page.getByRole('status')).toHaveText(`${IMPORTADOS} convites criados.`, { timeout: 15_000 });
});

test('os crachás do comitê saem com QR, e o QR de um deles entra no app', async ({ page, browser }) => {
	await entrar(page, CONTAS.secretaria);
	await page.goto('/imprimir/crachas');
	await page.getByRole('combobox', { name: 'Comitê' }).selectOption({ label: 'TREINO' });
	await page.getByRole('button', { name: 'Emitir e montar os crachás' }).click();
	const cracha = page.getByRole('article', { name: `Crachá de Importado ${RODADA} 001` });
	// Emitir gera um código por pessoa do comitê: leva alguns segundos num banco cheio.
	await expect(cracha).toContainText('Bolívia · TREINO', { timeout: 20_000 });
	await expect(cracha.locator('svg')).toBeVisible();
	expect(await page.getByRole('article', { name: /^Crachá de / }).count()).toBeGreaterThanOrEqual(IMPORTADOS);

	const celular = await (await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true })).newPage();
	await celular.goto((await cracha.locator('figure').getAttribute('data-link'))!);
	await expect(celular.getByRole('article', { name: 'Você' })).toContainText('Delegado · Bolívia · TREINO', { timeout: 15_000 });
	await celular.context().close();
});

test('check-in pela busca e código de acesso para quem perdeu o crachá', async ({ page }) => {
	await entrar(page, CONTAS.secretaria);
	await page.goto('/secretaria/checkin');
	await page.getByLabel('Buscar por nome ou e-mail').fill(`Importado ${RODADA} 002`);
	await page.getByRole('button', { name: `Marcar presença de Importado ${RODADA} 002` }).click();
	await expect(page.getByRole('list', { name: 'Pessoas encontradas' })).toContainText('Presente');
	await page.getByRole('button', { name: `Gerar código de acesso para Importado ${RODADA} 002` }).click();
	await expect(page.getByRole('status')).toHaveText(/^Código de Importado \d+ 002: [A-Z2-9]{8} \(vale por 30 minutos/);
});

test('150 certificados saem numa única impressão', async ({ page }) => {
	test.setTimeout(120_000);
	const secretaria = await clienteComo(CONTAS.secretaria);
	for (let i = 1; i <= IMPORTADOS; i++) {
		const email = `imp-${RODADA}-${String(i).padStart(3, '0')}@exemplo.test`;
		expect((await secretaria.rpc('marcar_checkin', { p_evento: evento, p_email: email })).error).toBeNull();
	}
	await entrar(page, CONTAS.secretaria);
	await page.goto('/secretaria/certificados');
	await page.getByRole('button', { name: 'Emitir certificados' }).click();
	await expect(page.getByRole('status')).toHaveText(/^\d+ certificados novos\.$/);
	await page.getByRole('link', { name: 'Imprimir os certificados' }).click();
	await expect(page.getByRole('article', { name: `Certificado de Importado ${RODADA} 150` })).toContainText(
		'participou do UFRGSMUN Teste'
	);
	const total = await page.getByRole('article', { name: /^Certificado de / }).count();
	expect(total).toBeGreaterThanOrEqual(IMPORTADOS);
	await page.emulateMedia({ media: 'print' });
	const pdf = await page.pdf({ format: 'A4' });
	const paginas = pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length ?? 0;
	expect(paginas, 'um certificado por página').toBe(total);
});

for (const tema of ['light', 'dark'] as const) {
	test(`as telas de login e da secretaria não têm erros de acessibilidade (tema ${tema})`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: tema });
		for (const rota of ['/entrar', '/verificar/NAOEXISTE1']) {
			await page.goto(rota);
			await expect(page.locator('main h1')).toBeVisible();
			await semErrosDeAcessibilidade(page);
		}
		await entrar(page, CONTAS.secretaria);
		for (const rota of ['/secretaria/participantes', '/secretaria/importar', '/secretaria/checkin', '/secretaria/certificados', '/imprimir/crachas']) {
			await page.goto(rota);
			await expect(page.locator('main h1')).toBeVisible();
			await semErrosDeAcessibilidade(page);
		}
	});
}
