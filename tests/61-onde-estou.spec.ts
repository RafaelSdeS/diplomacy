import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { isolado } from '../scripts/delegacoes.ts';
import { clienteComo, comiteEmDebate, entrar } from './ajuda.ts';

// Passo 61: saber onde estou (a linha do comitê desde a plenária) e o que chegou (bilhetes e
// documentos do bloco). A cópia do CE-T só deste arquivo.
const C = isolado('61');
const MESA = C.conta('mesa-ce@exemplo.test');
const ALEMANHA = C.conta('ce-alemanha@exemplo.test');
const FRANCA = C.conta('ce-franca@exemplo.test');
const SESSAO = `/comite/${C.sigla}/sessao`;
const marca = Date.now();
let comite = '';

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a sessão do comitê de teste é uma só');
});

test.beforeAll(async ({}, info) => {
	if (info.project.name !== 'notebook') return;
	const mesa = await clienteComo(MESA);
	comite = (await mesa.from('comite').select('id').eq('sigla', C.sigla).single()).data!.id;
});

const linha = (page: Page) => page.getByRole('region', { name: 'Momento do comitê' });
const aoVivo = (page: Page) => expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });

test('na plenária, a linha do comitê diz o momento e o que fazer, por papel; no debate, passa à agenda', async ({ page, browser }) => {
	const mesaApi = await clienteComo(MESA);
	const estado = (await mesaApi.from('estado_sessao').select('fase').eq('comite_id', comite).maybeSingle()).data;
	test.skip(!!estado && estado.fase !== 'plenaria', 'o comitê já passou da plenária (banco reaproveitado)');
	if (!estado) expect((await mesaApi.rpc('abrir_sessao', { p_comite: comite })).error).toBeNull();
	expect((await mesaApi.rpc('marcar_todas_presentes', { p_comite: comite })).error).toBeNull();

	await entrar(page, ALEMANHA);
	await page.goto(SESSAO);
	await aoVivo(page);
	await expect(linha(page)).toContainText('Plenária de abertura');
	const mesa = await (await browser.newContext()).newPage();
	await entrar(mesa, MESA);
	await mesa.goto(SESSAO);
	await aoVivo(mesa);

	// Até a moção do tópico, pela API: a linha muda sem recarregar.
	let etapa = (await mesaApi.from('estado_sessao').select('etapa_plenaria').eq('comite_id', comite).single()).data!.etapa_plenaria;
	while (etapa !== 'topico') {
		expect((await mesaApi.rpc('avancar_plenaria', { p_comite: comite })).error).toBeNull();
		etapa = (await mesaApi.from('estado_sessao').select('etapa_plenaria').eq('comite_id', comite).single()).data!.etapa_plenaria;
	}
	await expect(linha(page)).toContainText('Proponha qual tópico abre o debate', { timeout: 10_000 });
	await expect(linha(mesa)).toContainText('espere a moção de uma delegação');
	expect((await new AxeBuilder({ page }).include('.linha-comite').analyze()).violations).toEqual([]);

	// Aprovada a moção, o debate começa pela agenda.
	await comiteEmDebate(MESA, C.sigla, ALEMANHA);
	await expect(linha(mesa)).toContainText('Adote uma agenda', { timeout: 10_000 });
	await mesa.context().close();
});

test('um bilhete novo se anuncia em qualquer tela e conta no menu até a conversa ser aberta', async ({ page }) => {
	await entrar(page, FRANCA);
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1, name: 'Agora' })).toBeVisible();
	const alemanha = await clienteComo(ALEMANHA);
	const franca = (await alemanha.from('delegacao').select('id').eq('comite_id', comite).eq('nome', 'França').single()).data!.id;
	// Um tempo para o canal ao vivo da França abrir.
	await page.waitForTimeout(1500);
	expect(
		(await alemanha.rpc('enviar_mensagem', { p_id: crypto.randomUUID(), p_comite: comite, p_tipo: 'bilhete', p_texto: `Almoçamos juntos? ${marca}`, p_para: franca }))
			.error
	).toBeNull();
	const aviso = page.getByRole('status').filter({ hasText: 'Bilhete de Alemanha' });
	await expect(aviso).toBeVisible({ timeout: 10_000 });
	const menu = page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: /^Mensagens/ });
	await expect(menu).toContainText(/\d/);
	await expect(page).toHaveTitle(/^\(\d+\)/);
	await aviso.getByRole('link', { name: 'Abrir' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Mensagens' })).toBeVisible();
	await expect(menu).not.toContainText(/\d/);
});

test('o documento assinado continua em "Seus documentos"; "Como funciona" abre pela aba Comitê', async ({ page }) => {
	const alemanha = await clienteComo(ALEMANHA);
	const bloco = (await alemanha.rpc('criar_bloco', { p_comite: comite, p_nome: `Bloco do Reno ${marca}` })).data!;
	const wp = (await alemanha.rpc('criar_documento', { p_bloco: bloco, p_tipo: 'resolucao_crise', p_titulo: `Rios ${marca}` })).data!;
	await alemanha.rpc('adicionar_clausula', { p_documento: wp, p_tipo: 'operativa', p_texto: 'Decide cuidar dos rios' });
	expect((await alemanha.rpc('assinar', { p_documento: wp, p_assinar: true })).error).toBeNull();

	await entrar(page, ALEMANHA);
	await page.goto(`/comite/${C.sigla}/documentos`);
	await expect(page.getByRole('region', { name: 'Para você' })).not.toContainText(`Rios ${marca}`);
	await page.getByRole('region', { name: 'Seus documentos, DPOs e cartas' }).getByRole('button', { name: 'Ver todos' }).first().click();
	const seus = page.getByRole('dialog', { name: 'Seus documentos' });
	await expect(seus.getByRole('listitem').filter({ hasText: `Rios ${marca}` })).toContainText('assinado por você');
	await page.keyboard.press('Escape');

	for (const tema of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme: tema });
		await page.goto(`/comite/${C.sigla}`);
		await page.getByRole('link', { name: /^Como funciona/ }).click();
		await expect(page.getByRole('heading', { level: 1, name: 'Como funciona o comitê' })).toBeVisible();
		expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
	}
});
