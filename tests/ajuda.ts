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
