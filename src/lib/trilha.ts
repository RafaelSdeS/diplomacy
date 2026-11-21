import { t } from './i18n.svelte.ts';

export type Elo = { href: string; rotulo: string };

// As subtelas de cada tela do menu (passo 25). A trilha mostra só os níveis acima da
// tela atual; o título da página já diz onde a pessoa está.
const DO_COMITE = ['regras', 'blocos', 'dpo', 'cartas', 'mensagens', 'crise', 'votacoes', 'caderno', 'delegacao/[id]'];
const DA_SESSAO = ['presidencia', 'chamada', 'agenda'];
const DA_PRESS = ['/press/[sigla]', '/press/escrever', '/press/entrevistas', '/press/coletiva'];

/** Os níveis acima da rota. A sigla vem da URL ou, no documento, do comitê carregado. */
export function trilha(rota: string | null, params: Record<string, string>, data: { comite?: { sigla: string } }): Elo[] {
	if (!rota) return [];
	const sigla = params.sigla ?? data.comite?.sigla;
	const comite = sigla ? { href: `/comite/${sigla}`, rotulo: sigla } : null;
	const sub = rota.replace('/comite/[sigla]/', '');
	if (comite && DO_COMITE.includes(sub)) return [comite];
	if (comite && DA_SESSAO.map((s) => `sessao/${s}`).includes(sub))
		return [comite, { href: `/comite/${sigla}/sessao`, rotulo: t('Sessão') }];
	if (rota === '/documento/[id]' && comite) return [comite, { href: `/comite/${sigla}/blocos`, rotulo: t('Blocos e documentos') }];
	if (DA_PRESS.includes(rota)) return [{ href: '/press', rotulo: t('Press') }];
	if (rota.startsWith('/secretaria/') && rota !== '/secretaria/participantes')
		return [{ href: '/secretaria/participantes', rotulo: t('Participantes') }];
	if (rota === '/perfil/meus-dados') return [{ href: '/perfil', rotulo: t('Perfil') }];
	return [];
}
