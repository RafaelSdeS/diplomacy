import { expect, test } from '@playwright/test';
import { contaDoTreino, isolado } from '../scripts/delegacoes.ts';
import { adotarAgenda, clienteComo, entrar } from './ajuda.ts';

// Passo 63: o working paper de cada item da agenda é de toda a sala. A redatora do bloco
// propõe; quem entra no bloco passa a escrita a ela, mas marca posição; quem preside (a mesa,
// sem sessão aberta) aceita, e o texto muda no lugar. Cópia do TREINO só deste arquivo.
const C = isolado('63');
const MESA = C.conta('mesa-treino@exemplo.test');
const PARAGUAI = C.conta(contaDoTreino('Paraguai'));
const CHILE = C.conta(contaDoTreino('Chile'));
const marca = Date.now();
const NOTEBOOK = { viewport: { width: 1366, height: 768 } };

test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'o working paper do comitê de teste é um só');
});

test('a redatora propõe no working paper da sala, a sala marca posição e quem preside aceita (passo 63)', async ({ page, browser }) => {
	await adotarAgenda(MESA, C.sigla, 1);
	const api = await clienteComo(MESA);
	const comite = (await api.from('comite').select('id').eq('sigla', C.sigla).single()).data!.id;
	const wp = (
		await api
			.from('documento')
			.select('id, titulo')
			.eq('comite_id', comite)
			.eq('topico', 1)
			.eq('tipo', 'working_paper')
			.is('bloco_id', null)
			.eq('status', 'rascunho')
			.limit(1)
			.single()
	).data!;

	// A Paraguai cria um bloco (é a redatora); o Chile entra nele.
	const paraguaiApi = await clienteComo(PARAGUAI);
	const bloco = (await paraguaiApi.rpc('criar_bloco', { p_comite: comite, p_nome: `Bloco ${marca}` })).data!;
	expect((await (await clienteComo(CHILE)).rpc('entrar_bloco', { p_bloco: bloco })).error).toBeNull();

	// A redatora propõe uma operativa nova; o link antigo do documento leva à tela da sala.
	await entrar(page, PARAGUAI);
	await page.goto(`/documento/${wp.id}`);
	await expect(page).toHaveURL(new RegExp(`/documento/${wp.id}/sala$`));
	await expect(page.getByRole('heading', { level: 1, name: wp.titulo })).toBeVisible();
	await page.getByRole('button', { name: 'Propor uma cláusula nova' }).click();
	const formulario = page.getByRole('dialog');
	await formulario.getByLabel('Texto da cláusula').fill(`Decide cooperar ${marca}`);
	await formulario.getByLabel('Por quê (opcional)').fill('O centro do texto');
	await formulario.getByRole('button', { name: 'Propor' }).click();
	await expect(page.getByRole('status')).toHaveText('Proposta feita. A sala debate e marca a posição; quem preside decide.');
	const descricao = `Incluir (Operativa): "Decide cooperar ${marca}"`;
	await expect(page.getByRole('region', { name: 'Cláusulas novas propostas' })).toContainText(descricao);

	// O Chile, membro do bloco, não propõe (a escrita é da redatora), mas marca posição.
	const chile = await (await browser.newContext(NOTEBOOK)).newPage();
	await entrar(chile, CHILE);
	await chile.goto(`/documento/${wp.id}/sala`);
	await expect(chile.getByRole('button', { name: 'Propor uma cláusula nova' })).toHaveCount(0);
	const posicao = chile.getByRole('group', { name: `Sua posição sobre: ${descricao}` });
	await posicao.getByRole('button', { name: 'Apoio' }).click();
	await expect(posicao.getByRole('button', { name: 'Apoio' })).toHaveAttribute('aria-pressed', 'true');

	// Quem preside (a mesa) aceita; sem o sinal de consenso, confirma antes.
	const mesa = await (await browser.newContext(NOTEBOOK)).newPage();
	await entrar(mesa, MESA);
	await mesa.goto(`/documento/${wp.id}/sala`);
	await expect(mesa.getByRole('button', { name: 'Transformar em projeto' })).toBeVisible();
	await mesa.getByRole('group', { name: `Decidir: ${descricao}` }).getByRole('button', { name: 'Aceitar' }).click();
	await mesa.getByRole('dialog').getByRole('button', { name: 'Aceitar' }).click();
	await expect(mesa.getByRole('status')).toHaveText('Proposta aceita: o texto mudou.');
	const texto = mesa.getByRole('article', { name: 'Texto do documento' });
	await expect(texto).toContainText(`Decide cooperar ${marca}`);

	// A redatora propõe mudar o texto; a proposta fica ao lado da cláusula, no notebook.
	await page.reload();
	await page.getByRole('button', { name: `Propor uma mudança em "Decide cooperar ${marca}"` }).click();
	await formulario.getByLabel('Texto novo').fill(`Decide cooperar mais ${marca}`);
	await formulario.getByRole('button', { name: 'Propor' }).click();
	await expect(page.getByRole('status')).toHaveText('Proposta feita. A sala debate e marca a posição; quem preside decide.');
	await mesa.reload();
	const clausula = mesa.locator('.clausula-sala', { hasText: `Decide cooperar ${marca}` });
	const propostas = clausula.getByRole('list', { name: 'Propostas para esta cláusula' });
	await expect(propostas).toContainText(`Mudar para: "Decide cooperar mais ${marca}"`);
	await clausula.scrollIntoViewIfNeeded();
	await expect(clausula.locator('.clausula-sala-texto')).toBeInViewport();
	await expect(propostas).toBeInViewport();
	const [caixaTexto, caixaPropostas] = [await clausula.locator('.clausula-sala-texto').boundingBox(), await propostas.boundingBox()];
	expect(caixaPropostas!.x, 'as propostas ficam ao lado da cláusula').toBeGreaterThan(caixaTexto!.x + caixaTexto!.width / 2);
});
