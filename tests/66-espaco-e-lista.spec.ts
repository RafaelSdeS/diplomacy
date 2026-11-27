import { expect, test } from '@playwright/test';
import { contaDoTreino, DELEGACOES_TREINO, isolado } from '../scripts/delegacoes.ts';
import { clienteComo, comiteEmDebate, entrar } from './ajuda.ts';

// Passo 66: quem preside à vista no cabeçalho, o debate por lista (por moção), o menu lateral
// recolhível e a busca do caderno. Cópia do TREINO só deste arquivo.
const C = isolado('66');
const MESA = C.conta('mesa-treino@exemplo.test');
const BRASIL = C.conta(contaDoTreino('Brasil'));
const CHILE = C.conta(contaDoTreino('Chile'));
const marca = Date.now();
const ok = <T>(r: { data: T; error: { message: string } | null }) => {
	expect(r.error?.message ?? null).toBeNull();
	return r.data as NonNullable<T>;
};

test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'o cabeçalho, o menu lateral e o painel são do notebook');
});

test('o cabeçalho mostra quem preside: o martelo no crachá da delegação da vez e, para as outras, ao lado', async ({ browser }) => {
	const { mesa, comite } = await comiteEmDebate(MESA, C.sigla, BRASIL, { mesaConduz: false });
	// Uma delegação na presidência (como no teste 29): sorteia o rodízio e reabre a sessão no debate.
	const antes = ok(await mesa.from('estado_sessao').select('sessao(presidencia_delegacao_id)').eq('comite_id', comite).single());
	if (!antes.sessao?.presidencia_delegacao_id) {
		ok(await mesa.rpc('sortear_presidencia', { p_comite: comite }));
		ok(await mesa.rpc('abrir_sessao', { p_comite: comite }));
		ok(await mesa.rpc('marcar_todas_presentes', { p_comite: comite }));
	}
	const estado = ok(
		await mesa
			.from('estado_sessao')
			.select('sessao(presidencia:delegacao!sessao_presidencia_delegacao_id_comite_id_fkey(nome))')
			.eq('comite_id', comite)
			.single()
	);
	const nome = estado.sessao!.presidencia!.nome;

	const daVez = await (await browser.newContext()).newPage();
	await entrar(daVez, C.conta(contaDoTreino(nome)));
	await expect(daVez.getByRole('banner').getByRole('link', { name: /preside a sessão$/ })).toBeVisible();

	const outraNome = DELEGACOES_TREINO.map(([d]) => d).find((d) => d !== nome)!;
	const outra = await (await browser.newContext()).newPage();
	await entrar(outra, C.conta(contaDoTreino(outraNome)));
	await expect(outra.getByRole('banner').locator('.preside-agora')).toContainText(nome);
});

test('a moção de debate por lista, aprovada, põe o debate em lista: a palavra segue a ordem das placas', async ({ page }) => {
	const { mesa, comite } = await comiteEmDebate(MESA, C.sigla, BRASIL);
	ok(await mesa.rpc('baixar_todas_placas', { p_comite: comite }));
	const brasil = await clienteComo(BRASIL);
	ok(await brasil.rpc('enviar_ponto', { p_comite: comite, p_tipo: 'debate_lista' }));
	const ponto = ok(
		await mesa.from('ponto_mocao').select('id').eq('comite_id', comite).eq('tipo', 'debate_lista').eq('status', 'aberto').order('criado_em', { ascending: false }).limit(1).single()
	).id;
	const votacao = ok(await mesa.rpc('abrir_votacao', { p_ponto: ponto }));
	const sessao = ok(await mesa.from('estado_sessao').select('sessao_id').eq('comite_id', comite).single()).sessao_id!;
	for (const p of ok(await mesa.from('presenca').select('delegacao_id').eq('sessao_id', sessao)))
		ok(await mesa.rpc('registrar_voto', { p_votacao: votacao, p_delegacao: p.delegacao_id, p_escolha: 'a_favor' }));
	ok(await mesa.rpc('encerrar_votacao', { p_votacao: votacao }));

	// O Chile levanta a placa antes do Brasil: na lista, o Chile fala primeiro.
	ok(await (await clienteComo(CHILE)).rpc('levantar_placa', { p_comite: comite }));
	ok(await brasil.rpc('levantar_placa', { p_comite: comite }));
	await entrar(page, MESA);
	await page.goto(`/comite/${C.sigla}/sessao/presidencia`);
	const lista = page.getByRole('region', { name: 'Lista de oradores, pela ordem das placas' });
	await expect(lista.getByRole('button', { name: 'Dar a palavra a Chile' })).toBeVisible();
	await expect(lista.getByRole('button', { name: /^Escolher/ })).toHaveCount(0);

	// A presidência pode voltar ao formal-informal quando quiser.
	ok(await mesa.rpc('mudar_forma', { p_comite: comite, p_forma: 'formal_informal' }));
	await expect(page.getByRole('region', { name: 'Placas levantadas' })).toBeVisible();
});

test('o menu lateral se recolhe, abre ao passar o mouse e lembra a escolha', async ({ page }) => {
	await entrar(page, BRASIL);
	const menu = page.getByRole('navigation', { name: 'Principal' });
	const largura = async () => (await menu.boundingBox())!.width;
	await menu.getByRole('button', { name: 'Recolher o menu' }).click();
	await page.mouse.move(900, 500);
	await expect.poll(largura).toBeLessThan(80);
	await menu.hover();
	await expect.poll(largura).toBeGreaterThan(200);

	await page.reload();
	await page.mouse.move(900, 500);
	await expect.poll(largura).toBeLessThan(80);
	await menu.hover();
	await menu.getByRole('button', { name: 'Fixar o menu' }).click();
	await page.mouse.move(900, 500);
	await expect.poll(largura).toBeGreaterThan(200);
});

test('a busca do caderno acha a anotação sem rolar', async ({ page }) => {
	const brasil = await clienteComo(BRASIL);
	const comite = ok(await brasil.from('comite').select('id').eq('sigla', C.sigla).single()).id;
	for (const texto of ['A Argentina quer um fundo', 'O Chile apoia', 'O Uruguai ainda não falou', `Lembrar do Paraguai ${marca}`])
		ok(await brasil.rpc('salvar_anotacao', { p_id: crypto.randomUUID(), p_comite: comite, p_tipo: 'nota', p_texto: texto }));

	await entrar(page, BRASIL);
	await page.goto(`/comite/${C.sigla}/caderno`);
	await page.getByRole('searchbox', { name: 'Buscar no caderno' }).fill(`paraguai ${marca}`);
	const achadas = page.getByRole('tabpanel').getByRole('listitem');
	await expect(achadas).toHaveCount(1);
	await expect(achadas).toContainText(`Lembrar do Paraguai ${marca}`);
});
