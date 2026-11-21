import { expect, test } from '@playwright/test';
import { contaDaDelegacao, DELEGACOES, isolado } from '../scripts/delegacoes.ts';
import { CONTAS, clienteComo, comiteEmDebate, entrar } from './ajuda.ts';

// Passo 39: a cópia do CSNU-T só deste arquivo (scripts/delegacoes.ts).
const C = isolado('41');

// Passo 41: o tipo de cada item do cronograma (ícone e texto) e o filtro na fila de
// placas da presidência, com as 15 delegações do CSNU.
test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'roda num projeto só');
});

// Durante a Sessão 1 do seed (passado de propósito, como no teste do passo 04).
const DURANTE_A_SESSAO_1 = new Date('2026-11-10T10:45:00-03:00');

test('o cronograma e o Agora mostram o tipo do item, e a secretaria escolhe o tipo', async ({ page, browser }) => {
	const delegado = await (await browser.newContext()).newPage();
	await delegado.clock.setFixedTime(DURANTE_A_SESSAO_1);
	await entrar(delegado, CONTAS.delegado);
	await expect(delegado.getByRole('article', { name: 'Acontecendo agora' }).locator('.etiqueta')).toHaveText('Sessão');
	await expect(delegado.getByRole('article', { name: 'Depois' }).locator('.etiqueta')).toHaveText('Intervalo');
	await delegado.context().close();

	await entrar(page, CONTAS.secretaria);
	await page.goto('/cronograma');
	const item = (titulo: string) => page.getByRole('listitem').filter({ hasText: titulo }).first();
	await expect(item('Almoço')).toContainText('Intervalo');
	await expect(item('Cerimônia de abertura').locator('.etiqueta')).toHaveText('Cerimônia');
	// "Outro" não aparece: o credenciamento fica sem etiqueta.
	await expect(item('Credenciamento').locator('.etiqueta')).toHaveCount(0);

	const titulo = `Café ${Date.now()}`;
	await page.getByLabel('Título').fill(titulo);
	await page.getByLabel('Tipo').selectOption({ label: 'Intervalo' });
	await page.getByLabel('Início').fill('2026-11-11T15:00');
	await page.getByLabel('Fim').fill('2026-11-11T15:30');
	await page.getByRole('button', { name: 'Adicionar ao cronograma' }).click();
	await expect(item(titulo)).toContainText('Intervalo');
	await page.getByRole('button', { name: `Remover ${titulo}` }).click();
	await expect(page.getByRole('listitem').filter({ hasText: titulo })).toHaveCount(0);
});

test('com mais de 12 placas, a presidência filtra a fila pelo nome', async ({ page }) => {
	const { mesa, comite } = await comiteEmDebate(C.conta(CONTAS.mesa), C.sigla, C.conta(CONTAS.delegado));
	// Formal-informal, sem pausa e sem placas, como no passo 30.
	expect((await mesa.rpc('mudar_forma', { p_comite: comite, p_forma: 'formal_informal' })).error).toBeNull();
	expect((await mesa.rpc('encerrar_pausa', { p_comite: comite })).error).toBeNull();
	expect((await mesa.rpc('baixar_todas_placas', { p_comite: comite })).error).toBeNull();
	// A delegação que preside pode não levantar placa: contam as que subiram.
	const levantadas: string[] = [];
	for (const [nome] of DELEGACOES) {
		const cliente = await clienteComo(C.conta(contaDaDelegacao(nome)));
		if (!(await cliente.rpc('levantar_placa', { p_comite: comite })).error) levantadas.push(nome);
	}
	expect(levantadas.length).toBeGreaterThan(12);
	const [alvo, busca] = levantadas.includes('Irã') ? ['Irã', 'ira'] : ['Somália', 'SOMALIA'];

	await entrar(page, C.conta(CONTAS.mesa));
	await page.goto(`/comite/${C.sigla}/sessao/presidencia`);
	await expect(page.locator('[data-ao-vivo="sim"]')).toBeVisible({ timeout: 10_000 });
	const fila = page.getByRole('region', { name: 'Pedidos de fala' });
	await expect(fila.getByRole('listitem')).toHaveCount(levantadas.length);

	// Sem acento e sem maiúsculas, como nas outras listas longas (passo 38).
	await fila.getByLabel('Filtrar').fill(busca);
	await expect(fila.getByRole('listitem')).toHaveCount(1);
	await expect(fila.getByRole('listitem')).toContainText(alvo);
	await fila.getByLabel('Filtrar').fill('xyz');
	await expect(fila.getByRole('listitem')).toHaveText('Nenhuma delegação encontrada.');
	await fila.getByLabel('Filtrar').fill('');
	await expect(fila.getByRole('listitem')).toHaveCount(levantadas.length);
});
