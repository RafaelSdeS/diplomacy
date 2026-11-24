import { readFileSync } from 'node:fs';
import { expect, type Locator, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/database.types.ts';

// Contas do seed (scripts/seed.ts). Os testes de ponta a ponta precisam do
// Supabase local com o seed: npm run db:iniciar && npm run seed.
export const SENHA = 'senha-de-teste';

export const CONTAS = {
	delegado: 'delegado01@exemplo.test',
	mesa: 'mesa01@exemplo.test',
	crise: 'crise01@exemplo.test',
	press: 'press01@exemplo.test',
	secretaria: 'secretaria01@exemplo.test',
	semConvite: 'semconvite@exemplo.test'
} as const;

/**
 * Vai a uma tela do menu como a pessoa faria (passo 43): no notebook pela lateral; no
 * celular, o que não cabe na barra fica em "Mais".
 */
/** Passo 51: abre o modal de uma ação de criar ("Novo bilhete", "Escrever carta"). */
export const abrirAcao = (escopo: Page | Locator, nome: string) => escopo.getByRole('button', { name: nome, exact: true }).click();

/** Passo 47: escolhe uma opção no `Escolha` ("Escolher: rótulo" abre a lista num modal, que fecha ao escolher). */
export async function escolher(escopo: Page | Locator, rotulo: string, nome: string) {
	await escopo.getByRole('button', { name: `Escolher: ${rotulo}`, exact: true }).click();
	// Pelo nome: o Escolha pode abrir por cima de outro modal (o "Anotar", por exemplo).
	const modal = ('page' in escopo ? escopo.page() : escopo).getByRole('dialog', { name: rotulo, exact: true });
	await modal.getByRole('radio', { name: new RegExp(`^${nome}`) }).check();
	await expect(modal).toBeHidden();
}

export async function irPeloMenu(page: Page, nome: string) {
	const menu = page.getByRole('navigation', { name: 'Principal' });
	const link = menu.getByRole('link', { name: nome, exact: true });
	if (await link.isVisible()) return link.click();
	await menu.getByRole('link', { name: 'Mais', exact: true }).click();
	await page.getByRole('main').getByRole('link', { name: new RegExp(`^${nome}`) }).click();
}

// Passo 47: Sair pede confirmação, no modal.
/** Abre a confirmação de saída: no cabeçalho ou, no celular, em "Mais" (passo 47). */
export async function pedirSaida(page: Page) {
	const noCabecalho = page.getByRole('banner').getByRole('button', { name: 'Sair', exact: true });
	if (await noCabecalho.isVisible()) return noCabecalho.click();
	await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Mais', exact: true }).click();
	await page.getByRole('main').getByRole('button', { name: /^Sair/ }).click();
}

export async function sair(page: Page) {
	await pedirSaida(page);
	await page.getByRole('dialog').getByRole('button', { name: 'Sair', exact: true }).click();
}

export async function entrar(page: Page, email: string) {
	await page.goto('/entrar');
	await page.getByLabel('E-mail', { exact: true }).fill(email);
	await page.getByLabel('Senha').fill(SENHA);
	await page.getByRole('button', { name: 'Entrar', exact: true }).click();
	// Passo 52: com 10 processos no mesmo Supabase, o login às vezes passa de 5 s.
	await expect(page).not.toHaveURL(/\/entrar$/, { timeout: 15_000 });
}

/** Passo 52: o desfazer espera 1 s nos testes, em vez de 5 s (chamar antes de abrir a tela). */
export const desfazerRapido = (page: Page) => page.addInitScript(() => Object.assign(window, { __esperaDesfazer: 1000 }));

/**
 * Um cliente do Supabase logado como a conta, para preparar dados pela API (como o
 * app faria) sem passar pela tela. Usa a URL e a chave pública do .env.
 */
export async function clienteComo(email: string) {
	const env = Object.fromEntries(
		readFileSync('.env', 'utf8')
			.split('\n')
			.filter((linha) => /^[A-Z_]+=/.test(linha))
			.map((linha) => [linha.slice(0, linha.indexOf('=')), linha.slice(linha.indexOf('=') + 1).trim()])
	);
	const cliente = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_CHAVE, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await cliente.auth.signInWithPassword({ email, password: SENHA });
	if (error) throw error;
	return cliente;
}

/**
 * Garante a agenda adotada do tópico (passo 22: projeto de resolução só depois dela),
 * com uma sugestão da mesa quando ainda não há nenhuma adotada.
 */
export async function adotarAgenda(contaMesa: string, sigla: string, topico: number) {
	const mesa = await clienteComo(contaMesa);
	const comite = (await mesa.from('comite').select('id').eq('sigla', sigla).single()).data!.id;
	const adotada = await mesa.rpc('agenda_adotada', { p_comite: comite, p_topico: topico });
	if (adotada.error) throw adotada.error;
	if (adotada.data) return;
	const proposta = await mesa.rpc('salvar_proposta_agenda', {
		p_comite: comite,
		p_topico: topico,
		p_itens: [{ texto: 'A. Contexto', nivel: 0 }]
	});
	if (proposta.error) throw proposta.error;
	const { error } = await mesa.rpc('adotar_proposta', { p_proposta: proposta.data });
	if (error) throw error;
}

/**
 * Deixa o comitê com sessão aberta, todas as delegações presentes e na fase de debate
 * (passa pela plenária de abertura pela API, se preciso). Devolve a mesa e o comitê.
 */
export async function comiteEmDebate(contaMesa: string, sigla: string, contaDelegado: string) {
	const ok = <T>(r: { data: T; error: { message: string } | null }) => {
		if (r.error) throw new Error(r.error.message);
		return r.data as NonNullable<T>;
	};
	const mesa = await clienteComo(contaMesa);
	const comite = ok(await mesa.from('comite').select('id').eq('sigla', sigla).single()).id;
	const estado = () => mesa.from('estado_sessao').select('sessao_id, fase, etapa_plenaria').eq('comite_id', comite).maybeSingle();
	if (!(await estado()).data?.sessao_id) ok(await mesa.rpc('abrir_sessao', { p_comite: comite }));
	ok(await mesa.rpc('marcar_todas_presentes', { p_comite: comite }));
	const agora = ok(await estado());
	if (agora.fase === 'plenaria') {
		if (agora.etapa_plenaria === 'briefing') ok(await mesa.rpc('avancar_plenaria', { p_comite: comite }));
		if (agora.etapa_plenaria !== 'topico') ok(await mesa.rpc('avancar_plenaria', { p_comite: comite }));
		const delegado = await clienteComo(contaDelegado);
		ok(await delegado.rpc('enviar_ponto', { p_comite: comite, p_tipo: 'topico_no_topo', p_topico: 1 }));
		const sessao = ok(await estado()).sessao_id!;
		const ponto = ok(
			await mesa.from('ponto_mocao').select('id').eq('sessao_id', sessao).eq('tipo', 'topico_no_topo').eq('status', 'aberto').limit(1).single()
		).id;
		const votacao = ok(await mesa.rpc('abrir_votacao', { p_ponto: ponto }));
		const presentes = ok(await mesa.from('presenca').select('delegacao_id').eq('sessao_id', sessao));
		for (const p of presentes) ok(await mesa.rpc('registrar_voto', { p_votacao: votacao, p_delegacao: p.delegacao_id, p_escolha: 'a_favor' }));
		ok(await mesa.rpc('encerrar_votacao', { p_votacao: votacao }));
	}
	return { mesa, comite };
}
