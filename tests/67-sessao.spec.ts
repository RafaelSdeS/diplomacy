import { expect, test } from '@playwright/test';
import { contaDoTreino, isolado } from '../scripts/delegacoes.ts';
import { clienteComo, comiteEmDebate, entrar } from './ajuda.ts';

// Passo 67: a aba Sessão aproveita a tela do notebook. "A palavra" fica em cima, na largura
// toda; a última votação recolhe e mostra os votos lado a lado; os blocos aparecem na sessão; o
// ponto ou moção mostra os tipos em cartões. Cópia do TREINO só deste arquivo.
const C = isolado('67');
const MESA = C.conta('mesa-treino@exemplo.test');
const BRASIL = C.conta(contaDoTreino('Brasil'));
const ok = <T>(r: { data: T; error: { message: string } | null }) => {
	expect(r.error?.message ?? null).toBeNull();
	return r.data as NonNullable<T>;
};

test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'o arranjo em colunas é do notebook');
});

test('a sessão no notebook: a palavra em cima, a votação recolhe com os votos lado a lado, os blocos à vista', async ({ page }) => {
	// A sessão aberta, com a moção do tópico votada na plenária (a mesa conduz).
	const { comite } = await comiteEmDebate(MESA, C.sigla, BRASIL);
	const brasil = await clienteComo(BRASIL);
	const brasilId = ok(await brasil.from('delegacao').select('id').eq('comite_id', comite).eq('nome', 'Brasil').single()).id;
	const membro = ok(await brasil.from('bloco_membro').select('bloco(nome)').eq('delegacao_id', brasilId).maybeSingle());
	const nomeDoBloco = membro?.bloco?.nome ?? `Bloco do Sul ${Date.now()}`;
	if (!membro) ok(await brasil.rpc('criar_bloco', { p_comite: comite, p_nome: nomeDoBloco }));

	await entrar(page, BRASIL);
	await page.goto(`/comite/${C.sigla}/sessao`);
	const palavra = page.getByRole('article', { name: 'A palavra' });
	const votacao = page.getByRole('article', { name: 'Última votação' });
	await expect(votacao).toBeVisible();

	// "A palavra" na largura toda, acima das colunas.
	const [caixaPalavra, caixaVotacao] = [await palavra.boundingBox(), await votacao.boundingBox()];
	expect(caixaPalavra!.y, 'a palavra vem antes da votação').toBeLessThan(caixaVotacao!.y);
	expect(caixaPalavra!.width, 'a palavra usa a largura toda').toBeGreaterThan(caixaVotacao!.width * 1.5);

	// Os votos lado a lado: os dois primeiros da lista "A favor" na mesma linha.
	const aFavor = votacao.getByRole('list', { name: /^A favor/ }).getByRole('listitem');
	const [um, dois] = [await aFavor.nth(0).boundingBox(), await aFavor.nth(1).boundingBox()];
	expect(Math.abs(um!.y - dois!.y), 'na mesma linha').toBeLessThan(4);

	// A votação recolhe: fica o resumo, com o resultado.
	await votacao.getByText(/no topo da agenda/).first().click();
	await expect(aFavor.first()).toBeHidden();
	await expect(votacao).toContainText('Aprovada');

	// Os blocos à vista, com o da delegação.
	await expect(page.getByRole('list', { name: 'Blocos do comitê' })).toContainText(nomeDoBloco);
	// Passo 68: o nome do bloco em cima e os membros embaixo, na mesma margem esquerda.
	const bloco = page.getByRole('list', { name: 'Blocos do comitê' }).getByRole('listitem').filter({ hasText: nomeDoBloco });
	const [caixaNome, caixaMembro] = [await bloco.locator('strong').first().boundingBox(), await bloco.locator('.bloco-membro').first().boundingBox()];
	expect(Math.abs(caixaNome!.x - caixaMembro!.x), 'mesma margem').toBeLessThan(4);
	expect(caixaMembro!.y, 'os membros embaixo do nome').toBeGreaterThan(caixaNome!.y);

	// O ponto ou moção mostra os tipos em cartões, em grupos.
	await page.getByRole('button', { name: 'Fazer um ponto ou moção' }).click();
	const modal = page.getByRole('dialog');
	await expect(modal.getByRole('group', { name: 'Pontos' })).toBeVisible();
	await expect(modal.getByRole('group', { name: 'Moções' }).getByRole('radio', { name: /^Moção de debate por lista/ })).toBeVisible();
});
