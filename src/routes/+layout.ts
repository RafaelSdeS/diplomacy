import { redirect } from '@sveltejs/kit';
import { carregarConta } from '#lib/conta.ts';
import { definirIdioma } from '#lib/i18n.svelte.ts';
import { supabase } from '#lib/supabase.ts';
import type { LayoutLoad } from './$types';

// SPA: o app é privado, atrás de login, e não precisa de renderização no servidor.
export const ssr = false;

// Telas que abrem sem login.
const PUBLICAS = new Set(['/entrar', '/entrar/cracha', '/estilo', '/privacidade']);
const ehPublica = (caminho: string) => PUBLICAS.has(caminho) || caminho.startsWith('/verificar/');

export const load: LayoutLoad = async ({ url, depends }) => {
	depends('app:sessao');
	const publica = ehPublica(url.pathname);

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		if (!publica) redirect(307, '/entrar');
		return { usuario: null, nome: null, participacoes: [] };
	}
	if (url.pathname === '/entrar') redirect(307, '/');

	const { participacoes, nome, idioma } = await carregarConta(session.user);
	definirIdioma(idioma);

	// Conta sem convite não entra no app; quem tem convite não fica preso em /sem-acesso.
	if (participacoes.length === 0 && !publica && url.pathname !== '/sem-acesso') redirect(307, '/sem-acesso');
	if (participacoes.length > 0 && url.pathname === '/sem-acesso') redirect(307, '/');

	return { usuario: session.user, nome, participacoes };
};
