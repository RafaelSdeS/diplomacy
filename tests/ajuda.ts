import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
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

export async function entrar(page: Page, email: string) {
	await page.goto('/entrar');
	await page.getByLabel('E-mail', { exact: true }).fill(email);
	await page.getByLabel('Senha').fill(SENHA);
	await page.getByRole('button', { name: 'Entrar', exact: true }).click();
	await expect(page).not.toHaveURL(/\/entrar$/);
}

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
		return r.data;
	};
	const mesa = await clienteComo(contaMesa);
	const comite = ok(await mesa.from('comite').select('id').eq('sigla', sigla).single()).id;
	const estado = () => mesa.from('estado_sessao').select('sessao_id, fase, etapa_plenaria').eq('comite_id', comite).maybeSingle();
	if (!ok(await estado())?.sessao_id) ok(await mesa.rpc('abrir_sessao', { p_comite: comite }));
	ok(await mesa.rpc('marcar_todas_presentes', { p_comite: comite }));
	const agora = ok(await estado())!;
	if (agora.fase === 'plenaria') {
		if (agora.etapa_plenaria === 'briefing') ok(await mesa.rpc('avancar_plenaria', { p_comite: comite }));
		if (agora.etapa_plenaria !== 'topico') ok(await mesa.rpc('avancar_plenaria', { p_comite: comite }));
		const delegado = await clienteComo(contaDelegado);
		ok(await delegado.rpc('enviar_ponto', { p_comite: comite, p_tipo: 'topico_no_topo', p_topico: 1 }));
		const sessao = ok(await estado())!.sessao_id!;
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
