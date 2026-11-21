// Manda as notificações Web Push de um aviso ou da resposta a notas de crise (passo 15,
// bônus). O banco decide quem recebe e o texto (push_a_enviar), e cada item sai uma vez
// só: o app chama depois de publicar, e chamar de novo não repete nada.
// GET devolve a chave pública VAPID, que o app usa para ativar as notificações.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.119.2';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
	auth: { persistSession: false, autoRefreshToken: false }
});
const PUBLICA = Deno.env.get('PUSH_CHAVE_PUBLICA') ?? '';
const PRIVADA = Deno.env.get('PUSH_CHAVE_PRIVADA') ?? '';
// O contato que os serviços de push pedem: o repositório público do app.
if (PUBLICA && PRIVADA) webpush.setVapidDetails('https://github.com/RafaelSdeS/diplomacy', PUBLICA, PRIVADA);

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
const responder = (status: number, corpo: Record<string, unknown>) =>
	new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Destino = { endpoint: string; p256dh: string; auth: string; titulo: string; corpo: string; url: string };

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
	// Só quem está logado no app (a função confere a sessão; verify_jwt fica desligado
	// porque depende do tipo de chave de assinatura do projeto).
	const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
	if (!token || (await admin.auth.getUser(token)).error) return responder(401, { erro: 'Entre no app.' });
	if (!PUBLICA || !PRIVADA) return responder(503, { erro: 'As notificações não estão configuradas.' });
	if (req.method === 'GET') return responder(200, { chave: PUBLICA });
	if (req.method !== 'POST') return responder(405, { erro: 'Use GET ou POST.' });

	let tipo = '';
	let ids: string[] = [];
	try {
		const corpo = await req.json();
		tipo = String(corpo?.tipo ?? '');
		ids = Array.isArray(corpo?.ids) ? corpo.ids.map(String).slice(0, 100) : [];
	} catch {
		// corpo inválido: cai no pedido inválido abaixo
	}
	ids = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
	if (!['aviso', 'nota', 'crise'].includes(tipo) || !ids.length) return responder(400, { erro: 'Pedido inválido.' });

	let enviadas = 0;
	let falhas = 0;
	const esquecer: string[] = [];
	for (const id of ids) {
		const { data, error } = await admin.rpc('push_a_enviar', { p_tipo: tipo, p_id: id });
		if (error) {
			console.error('push_a_enviar', error.message);
			falhas++;
			continue;
		}
		await Promise.all(
			((data ?? []) as Destino[]).map(async (d) => {
				try {
					await webpush.sendNotification(
						{ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
						JSON.stringify({ titulo: d.titulo, corpo: d.corpo, url: d.url }),
						{ TTL: 3600, urgency: 'high', timeout: 10_000 }
					);
					enviadas++;
				} catch (e) {
					const status = (e as { statusCode?: number }).statusCode;
					// 404 e 410: o aparelho desativou ou o navegador trocou o endereço.
					if (status === 404 || status === 410) esquecer.push(d.endpoint);
					else {
						falhas++;
						console.error('sendNotification', status ?? String(e));
					}
				}
			})
		);
	}
	if (esquecer.length) await admin.rpc('esquecer_assinaturas_push', { p_endpoints: esquecer });
	return responder(200, { enviadas, falhas, esquecidas: esquecer.length });
});
