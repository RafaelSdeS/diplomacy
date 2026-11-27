import { expect, test } from '@playwright/test';
import { contaDoTreino, isolado } from '../scripts/delegacoes.ts';
import { adotarAgenda, clienteComo, entrar, reabrirTopicoDaSala, rejeitarProjeto } from './ajuda.ts';

// Passo 63: o working paper de cada item da agenda é de toda a sala. A redatora do bloco
// propõe; quem entra no bloco passa a escrita a ela, mas marca posição; quem preside (a mesa,
// sem sessão aberta) aceita, e o texto muda no lugar. Cópia do TREINO só deste arquivo.
const C = isolado('63');
const MESA = C.conta('mesa-treino@exemplo.test');
const PARAGUAI = C.conta(contaDoTreino('Paraguai'));
const CHILE = C.conta(contaDoTreino('Chile'));
const marca = Date.now();
const NOTEBOOK = { viewport: { width: 1366, height: 768 } };

test.describe.configure({ mode: 'serial' });
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
	// Passo 64: a cláusula nova fica numa linha no fim do texto, que abre o painel à direita.
	const NOVAS = /cláusulas? novas? propostas?/;
	await page.getByRole('button', { name: NOVAS }).click();
	await expect(page.getByRole('dialog', { name: 'Cláusulas novas propostas' })).toContainText(descricao);

	// O Chile, membro do bloco, não propõe (a escrita é da redatora), mas marca posição.
	const chile = await (await browser.newContext(NOTEBOOK)).newPage();
	await entrar(chile, CHILE);
	await chile.goto(`/documento/${wp.id}/sala`);
	await expect(chile.getByRole('button', { name: 'Propor uma cláusula nova' })).toHaveCount(0);
	await chile.getByRole('button', { name: NOVAS }).click();
	const posicao = chile.getByRole('dialog').getByRole('group', { name: `Sua posição sobre: ${descricao}` });
	await posicao.getByRole('button', { name: 'Apoio' }).click();
	await expect(posicao.getByRole('button', { name: 'Apoio' })).toHaveAttribute('aria-pressed', 'true');

	// Quem preside (a mesa) aceita; sem o sinal de consenso, confirma antes.
	const mesa = await (await browser.newContext(NOTEBOOK)).newPage();
	await entrar(mesa, MESA);
	await mesa.goto(`/documento/${wp.id}/sala`);
	await expect(mesa.getByRole('button', { name: 'Transformar em projeto' })).toBeVisible();
	await mesa.getByRole('button', { name: NOVAS }).click();
	await mesa.getByRole('group', { name: `Decidir: ${descricao}` }).getByRole('button', { name: 'Aceitar' }).click();
	await mesa.getByRole('dialog', { name: 'Aceitar sem o sinal de consenso?' }).getByRole('button', { name: 'Aceitar' }).click();
	await expect(mesa.getByRole('status')).toHaveText('Proposta aceita: o texto mudou.');
	await mesa.keyboard.press('Escape');
	const texto = mesa.getByRole('article', { name: 'Texto do documento' });
	await expect(texto).toContainText(`Decide cooperar ${marca}`);

	// A redatora propõe mudar o texto em 3 cliques: a cláusula, "Mudar o texto" e "Propor".
	await page.reload();
	const linha = (p: typeof page) => p.getByRole('article', { name: 'Texto do documento' }).getByRole('button', { name: new RegExp(`Decide cooperar ${marca}`) });
	await linha(page).click();
	const painel = page.getByRole('dialog');
	await painel.getByRole('button', { name: 'Mudar o texto' }).click();
	await painel.getByLabel('Texto novo').fill(`Decide cooperar mais ${marca}`);
	await painel.getByRole('button', { name: 'Propor', exact: true }).click();
	await expect(painel.getByRole('status')).toHaveText('Proposta feita. A sala debate e marca a posição; quem preside decide.');
	await expect(painel.getByRole('list', { name: 'Propostas para esta cláusula' })).toContainText(`Mudar para: "Decide cooperar mais ${marca}"`);

	// Na mesa, a linha mostra a proposta; o painel abre à direita, com a cláusula à vista ao lado.
	await mesa.reload();
	await expect(linha(mesa)).toContainText('1 proposta');
	await linha(mesa).click();
	const painelDaMesa = mesa.getByRole('dialog');
	await expect(painelDaMesa.getByRole('list', { name: 'Propostas para esta cláusula' })).toContainText(`Mudar para: "Decide cooperar mais ${marca}"`);
	await expect(linha(mesa)).toBeInViewport();
	const [caixaLinha, caixaPainel] = [await linha(mesa).boundingBox(), await painelDaMesa.boundingBox()];
	expect(caixaPainel!.x, 'o painel abre à direita, sem cobrir a cláusula').toBeGreaterThanOrEqual(caixaLinha!.x + caixaLinha!.width);
});

test('a conversa do bloco, "Suas propostas" na Agora e os documentos da sala na aba Documentos (passo 63)', async ({ page, browser }) => {
	await adotarAgenda(MESA, C.sigla, 1);
	const paraguaiApi = await clienteComo(PARAGUAI);
	const comite = (await paraguaiApi.from('comite').select('id').eq('sigla', C.sigla).single()).data!.id;
	const wp = (
		await paraguaiApi
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
	const nomeDoBloco = `Conversa ${marca}`;
	const bloco = (await paraguaiApi.rpc('criar_bloco', { p_comite: comite, p_nome: nomeDoBloco })).data!;
	expect((await (await clienteComo(CHILE)).rpc('entrar_bloco', { p_bloco: bloco })).error).toBeNull();
	expect((await paraguaiApi.rpc('propor_no_documento', { p_documento: wp.id, p_acao: 'incluir', p_texto: `Recordando ${marca}`, p_tipo: 'preambular' })).error).toBeNull();

	// A redatora vê na Agora a proposta dela em debate e escreve na conversa do bloco.
	await entrar(page, PARAGUAI);
	await page.goto('/');
	await expect(page.getByRole('link', { name: 'Suas propostas em debate' })).toHaveAttribute('href', new RegExp(`/documento/.+/sala$`));
	await page.goto(`/comite/${C.sigla}/blocos`);
	await page.getByRole('article', { name: `Bloco ${nomeDoBloco}` }).getByRole('link', { name: 'Conversa do bloco' }).click();
	await page.getByLabel(`Escrever para Bloco ${nomeDoBloco}`).fill(`Proponho a preambular ${marca}`);
	await page.getByRole('button', { name: 'Enviar' }).click();

	// O Chile, membro do bloco, lê; na aba Documentos, a etapa "Working papers" leva ao da sala.
	const chile = await (await browser.newContext(NOTEBOOK)).newPage();
	await entrar(chile, CHILE);
	await chile.goto(`/comite/${C.sigla}/mensagens?conversa=bl:${bloco}`);
	await expect(chile.getByText(`Proponho a preambular ${marca}`).first()).toBeVisible();
	await chile.goto(`/comite/${C.sigla}/documentos`);
	await chile.getByRole('navigation', { name: 'Ordem do tópico 1' }).getByRole('button', { name: /^Working papers/ }).click();
	await expect(chile).toHaveURL(/\/documento\/.+\/sala$/);
});

test('do working paper ao projeto: a mesa transforma, preâmbulos primeiro e assinaturas junto; rejeitado, os working papers reabrem', async ({
	page
}) => {
	// O tópico 2 desta cópia, do começo: agenda com dois itens grandes, cada um com o seu working paper.
	const comite = await reabrirTopicoDaSala(C.sigla, 2);
	const mesaApi = await clienteComo(MESA);
	const ok = <T>(r: { data: T; error: { message: string } | null }) => {
		expect(r.error?.message ?? null).toBeNull();
		return r.data as NonNullable<T>;
	};
	if (!ok(await mesaApi.rpc('agenda_adotada', { p_comite: comite, p_topico: 2 }))) {
		const proposta = ok(
			await mesaApi.rpc('salvar_proposta_agenda', {
				p_comite: comite,
				p_topico: 2,
				p_itens: [
					{ texto: 'A. Causas', nivel: 0 },
					{ texto: 'B. Respostas', nivel: 0 }
				]
			})
		);
		ok(await mesaApi.rpc('adotar_proposta', { p_proposta: proposta }));
	}
	const wps = ok(await mesaApi.from('documento').select('id, titulo').eq('comite_id', comite).eq('topico', 2).is('bloco_id', null).eq('tipo', 'working_paper'));
	const [itemA, itemB] = [wps.find((w) => w.titulo === 'A. Causas')!, wps.find((w) => w.titulo === 'B. Respostas')!];

	// O Uruguai, sem bloco, é o próprio redator: propõe nos dois itens; quem preside (a mesa) aceita.
	const uruguai = await clienteComo(C.conta(contaDoTreino('Uruguai')));
	for (const [wp, tipo, texto] of [
		[itemA.id, 'operativa', 'Decide A'],
		[itemB.id, 'operativa', 'Decide B'],
		[itemB.id, 'preambular', 'Lembrando B']
	] as const) {
		const proposta = ok(await uruguai.rpc('propor_no_documento', { p_documento: wp, p_acao: 'incluir', p_texto: texto, p_tipo: tipo }));
		ok(await mesaApi.rpc('decidir_proposta', { p_proposta: proposta, p_aceitar: true }));
	}
	for (const nome of ['Uruguai', 'Brasil', 'Argentina', 'Chile', 'Paraguai']) {
		const cliente = await clienteComo(C.conta(contaDoTreino(nome)));
		ok(await cliente.rpc('assinar', { p_documento: nome === 'Chile' ? itemB.id : itemA.id, p_assinar: true }));
	}

	// A mesa ouve a sala e transforma: o projeto junta os dois, com os preâmbulos primeiro.
	await entrar(page, MESA);
	await page.goto(`/documento/${itemA.id}/sala`);
	await page.getByRole('button', { name: 'Transformar em projeto' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Transformar em projeto' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Projeto de resolução' })).toBeVisible();
	const projeto = page.url().split('/').at(-2)!;
	const texto = page.getByRole('article', { name: 'Texto do documento' });
	await expect(texto.locator('.clausula-sala-texto')).toHaveText([/Lembrando B/, /1\.\s*Decide A/, /2\.\s*Decide B/]);
	await expect(page.getByRole('region', { name: /^Assinaturas/ }).getByRole('listitem')).toHaveCount(5);

	// Com as 5 assinaturas, a mesa leva o projeto à fase de ação.
	await page.getByRole('button', { name: 'Levar à fase de ação' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Levar à fase de ação' }).click();
	await expect(page.getByRole('status')).toHaveText('O projeto está na fase de ação.');
	// Passo 64: da sala do projeto, a fase de ação está a um clique (abre os projetos na Presidência).
	await expect(page.getByRole('link', { name: 'Conduzir a fase de ação' })).toHaveAttribute('href', /\/sessao\/presidencia\?projetos$/);

	// Rejeitado na votação (aqui direto no banco), os working papers do tópico reabrem.
	await rejeitarProjeto(projeto);
	await page.goto(`/documento/${itemB.id}/sala`);
	await expect(page.getByText(/^Aberto a propostas\./)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Transformar em projeto' })).toBeVisible();
});
