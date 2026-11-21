import { t } from './i18n.svelte.ts';

export type Elo = { href: string; rotulo: string };

// As subtelas de cada tela do menu (passo 25). A trilha mostra só os níveis acima da
// tela atual; o título da página já diz onde a pessoa está.
const DO_COMITE = ['regras', 'crise', 'votacoes', 'delegacao/[id]'];
// Passo 43: o que se escreve fica sob Documentos (Mensagens e Documentos são telas do menu).
const DOS_DOCUMENTOS = ['blocos', 'dpo', 'cartas', 'caderno'];
const DA_SESSAO = ['presidencia', 'chamada', 'agenda'];
const DA_PRESS = ['/press/[sigla]', '/press/escrever', '/press/entrevistas', '/press/coletiva'];

/**
 * Os níveis acima da rota. A sigla vem da URL ou, no documento, do comitê carregado.
 * Para a mesa (passo 43), as telas da sessão ficam sob o Painel, que é onde ela trabalha.
 */
export function trilha(rota: string | null, params: Record<string, string>, data: { comite?: { sigla: string } }, mesa = false): Elo[] {
	if (!rota) return [];
	const sigla = params.sigla ?? data.comite?.sigla;
	const comite = sigla ? { href: `/comite/${sigla}`, rotulo: sigla } : null;
	const sub = rota.replace('/comite/[sigla]/', '');
	if (comite && DO_COMITE.includes(sub)) return [comite];
	const documentos = { href: `/comite/${sigla}/documentos`, rotulo: t('Documentos') };
	if (comite && DOS_DOCUMENTOS.includes(sub)) return [comite, documentos];
	if (comite && DA_SESSAO.map((s) => `sessao/${s}`).includes(sub)) {
		if (!mesa) return [comite, { href: `/comite/${sigla}/sessao`, rotulo: t('Sessão') }];
		return sub === 'sessao/presidencia' ? [comite] : [comite, { href: `/comite/${sigla}/sessao/presidencia`, rotulo: t('Painel') }];
	}
	if (rota === '/documento/[id]' && comite) return [comite, documentos];
	if (DA_PRESS.includes(rota)) return [{ href: '/press', rotulo: t('Press') }];
	if (rota.startsWith('/secretaria/') && rota !== '/secretaria/participantes')
		return [{ href: '/secretaria/participantes', rotulo: t('Participantes') }];
	if (rota === '/perfil/meus-dados') return [{ href: '/perfil', rotulo: t('Perfil') }];
	return [];
}
