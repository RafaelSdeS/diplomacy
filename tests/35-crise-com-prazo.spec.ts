import { expect, test, type Page } from '@playwright/test';
import { contaDoTreino, isolado } from '../scripts/delegacoes.ts';
import { abrirAcao, clienteComo, entrar, escolher } from './ajuda.ts';

// Passo 39: a cópia do TREINO só deste arquivo (scripts/delegacoes.ts).
const C = isolado('35');

// Passo 35: a equipe de crise lança uma crise com prazo que deixa o Brasil sem voz; o
// telão entra em modo crise; no fim, o desfecho aparece e a voz volta. Comitê TREINO.
const CRISE = C.conta('crise-treino@exemplo.test');
const MESA = C.conta('mesa-treino@exemplo.test');
const BRASIL = C.conta(contaDoTreino('Brasil'));
// Nas capturas (banco sempre novo) o título é fixo; fora delas, único a cada execução.
const TITULO = process.env.CAPTURAS ? 'Sequestro na fronteira' : `Sequestro na fronteira ${Date.now()}`;
const OCULTAR_RODIZIO = `${import.meta.dirname}/ocultar-rodizio.css`;

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a crise do comitê de teste é uma só');
});

async function semCriseAtiva() {
	const crise = await clienteComo(CRISE);
	const comite = (await crise.from('comite').select('id').eq('sigla', C.sigla).single()).data!.id;
	const ativas = await crise.from('incidente_comite').select('incidente:incidente_crise(id, encerrado_em)').eq('comite_id', comite);
	for (const a of ativas.data ?? []) {
		if (a.incidente && !a.incidente.encerrado_em) await crise.rpc('encerrar_incidente', { p_id: a.incidente.id, p_desfecho: 'fracassou', p_texto: '' });
	}
	return comite;
}

test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const comite = await semCriseAtiva();
	// Uma sessão aberta, com o Brasil presente, para a placa aparecer.
	const mesa = await clienteComo(MESA);
	const estado = await mesa.from('estado_sessao').select('sessao_id').eq('comite_id', comite).maybeSingle();
	if (!estado.data?.sessao_id) await mesa.rpc('abrir_sessao', { p_comite: comite });
	await mesa.rpc('marcar_todas_presentes', { p_comite: comite });
	await mesa.rpc('assumir_presidencia', { p_comite: comite, p_assumir: true });
});

test.afterAll(async ({}, info) => {
	if (info.project.name === 'notebook') await semCriseAtiva();
});

const aoVivo = (page: Page) => expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });

test('a crise deixa o Brasil sem voz, toma o telão e, no fim, devolve a voz', async ({ page, browser }) => {
	await entrar(page, CRISE);
	await page.goto(`/crise/${C.sigla}`);
	await abrirAcao(page, 'Lançar uma crise');
	const lancar = page.getByRole('form', { name: 'Lançar uma crise' });
	await lancar.getByLabel('Título').fill(TITULO);
	await lancar.getByLabel('Briefing').fill('O delegado brasileiro foi sequestrado. O comitê tem 20 minutos para negociar.');
	await lancar.getByRole('button', { name: 'Adicionar uma delegação atingida' }).click();
	await escolher(lancar, 'Delegação', 'Brasil');
	await lancar.getByLabel('O que aconteceu com ela').fill('Delegado sequestrado');
	await lancar.getByRole('button', { name: 'Lançar a crise' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Crise lançada.' })).toBeVisible();

	const telao = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
	await entrar(telao, MESA);
	await telao.goto(`/telao/${C.sigla}`);
	const modoCrise = telao.locator('.telao-crise', { hasText: TITULO });
	await expect(modoCrise).toContainText('Urgente');
	await expect(modoCrise.locator('.telao-crise-prazo')).toHaveText(/^(20:00|19:\d\d)$/);
	await expect(modoCrise).toContainText('Delegado sequestrado');
	// Passo 41: a aparência do telão em modo crise (o prazo corre: fica mascarado).
	const mascaras = [telao.locator('.telao-crise-prazo'), telao.locator('.cronometro')];
	if (process.env.CAPTURAS) await expect(telao).toHaveScreenshot('telao-crise.png', { mask: mascaras, stylePath: OCULTAR_RODIZIO });

	const brasil = await (await browser.newContext()).newPage();
	await entrar(brasil, BRASIL);
	await brasil.goto(`/comite/${C.sigla}/sessao`);
	await aoVivo(brasil);
	await expect(brasil.getByRole('alert').filter({ hasText: 'impedida pela crise' })).toContainText('Delegado sequestrado');
	// Sem voz: o formulário de ponto ou moção some (e a placa, fora da plenária).
	await expect(brasil.getByRole('button', { name: 'Fazer um ponto ou moção' })).toHaveCount(0);

	// A equipe encerra a crise: resolvida.
	await page.getByRole('button', { name: `Encerrar: ${TITULO}` }).click();
	const encerrar = page.getByRole('form', { name: `Encerrar: ${TITULO}` });
	await encerrar.getByLabel('O que aconteceu').fill('O delegado foi libertado.');
	await encerrar.getByRole('button', { name: 'Encerrar a crise' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Crise encerrada.' })).toBeVisible();
	await expect(modoCrise).toContainText('Resolvida: O delegado foi libertado.');
	if (process.env.CAPTURAS) await expect(telao).toHaveScreenshot('telao-desfecho.png', { mask: mascaras, stylePath: OCULTAR_RODIZIO });
	await expect(brasil.getByRole('button', { name: 'Fazer um ponto ou moção' })).toBeVisible();
});
