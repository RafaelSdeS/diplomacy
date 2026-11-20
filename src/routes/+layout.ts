import { redirect } from '@sveltejs/kit';
import { supabase } from '#lib/supabase.ts';
import type { LayoutLoad } from './$types';

// SPA: o app é privado, atrás de login, e não precisa de renderização no servidor.
export const ssr = false;

// Telas que abrem sem login.
const PUBLICAS = new Set(['/entrar', '/estilo']);

export const load: LayoutLoad = async ({ url, depends }) => {
	depends('app:sessao');
	const publica = PUBLICAS.has(url.pathname);

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		if (!publica) redirect(307, '/entrar');
		return { usuario: null, participacoes: [] };
	}
	if (url.pathname === '/entrar') redirect(307, '/');

	const { data: participacoes, error } = await supabase.from('minhas_participacoes').select('*');
	if (error) throw error;

	// Conta sem convite não entra no app; quem tem convite não fica preso em /sem-acesso.
	if (participacoes.length === 0 && !publica && url.pathname !== '/sem-acesso') redirect(307, '/sem-acesso');
	if (participacoes.length > 0 && url.pathname === '/sem-acesso') redirect(307, '/');

	return { usuario: session.user, participacoes };
};
