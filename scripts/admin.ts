// Acesso de administrador ao Supabase para os scripts de dados (seed e demonstração).
// Só roda no Supabase local, a menos que a variável de liberação seja 1 (para um
// projeto de teste, nunca o de produção).
import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SENHA = 'senha-de-teste';

type Credenciais = { url: string; chave: string; chavePublica: string };

function credenciais(): Credenciais {
	if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
		return {
			url: process.env.SUPABASE_URL,
			chave: process.env.SUPABASE_SERVICE_ROLE_KEY,
			chavePublica: process.env.SUPABASE_ANON_KEY ?? ''
		};
	}
	const saida = execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'ignore']
	});
	const status = JSON.parse(saida);
	return { url: status.API_URL, chave: status.SERVICE_ROLE_KEY, chavePublica: status.ANON_KEY };
}

/**
 * Passo 44: um projeto remoto só com a flag ligada **e** o ref dele liberado na variável
 * irmã (DEMO_PERMITIR_REMOTO=1 + DEMO_PROJETO_REF=<ref>). Só a flag não distingue o
 * projeto de teste do de produção. Devolve o motivo da recusa, ou null.
 */
export function recusaDoAlvo(url: string, variavelDeLiberacao: string, env: Record<string, string | undefined>) {
	const host = new URL(url).hostname;
	if (['127.0.0.1', 'localhost'].includes(host)) return null;
	const variavelDoRef = variavelDeLiberacao.replace('PERMITIR_REMOTO', 'PROJETO_REF');
	if (env[variavelDeLiberacao] !== '1' || !env[variavelDoRef] || host.split('.')[0] !== env[variavelDoRef]) {
		return `Recusado: ${url} não é o Supabase local. Para um projeto de teste (nunca o de produção), use ${variavelDeLiberacao}=1 e ${variavelDoRef}=<ref do projeto>.`;
	}
	return null;
}

/** O cliente com o service role, depois de conferir que o alvo é local (ou liberado). */
export async function conectarAdmin(variavelDeLiberacao: string) {
	const { url, chave, chavePublica } = credenciais();
	const recusa = recusaDoAlvo(url, variavelDeLiberacao, process.env);
	if (recusa) throw new Error(recusa);
	const db = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
	// Logo depois de `db reset`, a API ainda se reconecta ao banco por alguns segundos.
	for (let tentativa = 1; ; tentativa++) {
		const { error } = await db.from('evento').select('id').limit(1);
		if (!error) break;
		if (tentativa === 120) throw new Error(`A API do Supabase não respondeu: ${error.message}`);
		await new Promise((pronto) => setTimeout(pronto, 500));
	}
	return { db, url, chavePublica };
}

export function verificar<T>(resposta: { data: T; error: { message: string } | null }, onde: string) {
	if (resposta.error) throw new Error(`${onde}: ${resposta.error.message}`);
	return resposta.data as NonNullable<T>;
}

/** O id de cada conta, pelo e-mail. */
export async function usuariosPorEmail(db: SupabaseClient) {
	const ids = new Map<string, string>();
	for (let pagina = 1; ; pagina++) {
		const lista = await db.auth.admin.listUsers({ page: pagina, perPage: 1000 });
		if (lista.error) throw new Error(`usuários: ${lista.error.message}`);
		for (const u of lista.data.users) if (u.email) ids.set(u.email, u.id);
		if (lista.data.users.length < 1000) break;
	}
	return ids;
}

/** Cria as contas que ainda não existem (o gatilho nova_conta liga cada uma aos convites). */
export async function criarContas(db: SupabaseClient, contas: { email: string; nome: string }[]) {
	const existentes = await usuariosPorEmail(db);
	for (const conta of contas) {
		if (existentes.has(conta.email)) continue;
		const { error } = await db.auth.admin.createUser({
			email: conta.email,
			password: SENHA,
			email_confirm: true,
			user_metadata: { nome: conta.nome }
		});
		if (error) throw new Error(`conta ${conta.email}: ${error.message}`);
	}
}

/** O tipo do item do cronograma pelo título (passo 41), a mesma regra da migração. */
export const tipoDoItem = (titulo: string) =>
	/^sess(ão|ao|ion)/i.test(titulo)
		? 'sessao'
		: /^(almoço|almoco|intervalo|café|cafe|coffee|lunch|break)/i.test(titulo)
			? 'intervalo'
			: /^(cerimônia|cerimonia|ceremony)/i.test(titulo)
				? 'cerimonia'
				: 'outro';
