// Troca o código do crachá (ou o código curto da secretaria) por um link de login, que
// o app troca por uma sessão com verifyOtp. Na primeira vez, cria a conta a partir do
// convite: com o cadastro livre desligado, ninguém precisa criar as contas à mão.
// A resposta nunca diz se o código existe.
import { createClient } from 'npm:@supabase/supabase-js@2.119.2';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
	auth: { persistSession: false, autoRefreshToken: false }
});

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const RECUSA = 'Código inválido ou vencido. Peça um novo à secretaria.';
const FALHA = 'Não foi possível entrar agora. Tente de novo em instantes.';

const responder = (status: number, corpo: Record<string, string>) =>
	new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function sha256(texto: string) {
	const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)));
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
	if (req.method !== 'POST') return responder(405, { erro: 'Use POST.' });

	let codigo = '';
	try {
		codigo = String((await req.json())?.codigo ?? '').trim();
	} catch {
		// corpo inválido: tratado como código vazio
	}
	if (!codigo || codigo.length > 100) return responder(401, { erro: RECUSA });

	// A origem (o IP, em hash) só serve para frear quem tenta adivinhar códigos.
	const origem = await sha256(req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'desconhecida');
	const { data, error } = await admin.rpc('entrar_com_codigo', { p_codigo: codigo, p_origem: origem });
	if (error) {
		if (error.code === 'P0429') return responder(429, { erro: error.message });
		console.error('entrar_com_codigo', error.message);
		return responder(500, { erro: FALHA });
	}
	const pessoa = (data as { email: string; nome: string }[] | null)?.[0];
	if (!pessoa) return responder(401, { erro: RECUSA });

	// Primeira vez: cria a conta (o gatilho nova_conta transforma os convites em participações).
	const criada = await admin.auth.admin.createUser({
		email: pessoa.email,
		email_confirm: true,
		user_metadata: { nome: pessoa.nome }
	});
	if (criada.error && criada.error.code !== 'email_exists') {
		console.error('createUser', criada.error.message);
		return responder(500, { erro: FALHA });
	}

	const link = await admin.auth.admin.generateLink({ type: 'magiclink', email: pessoa.email });
	if (link.error) {
		console.error('generateLink', link.error.message);
		return responder(500, { erro: FALHA });
	}
	return responder(200, { token_hash: link.data.properties.hashed_token });
});
