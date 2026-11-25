import CalendarDays from '@lucide/svelte/icons/calendar-days';
import FileText from '@lucide/svelte/icons/file-text';
import Gavel from '@lucide/svelte/icons/gavel';
import House from '@lucide/svelte/icons/house';
import Landmark from '@lucide/svelte/icons/landmark';
import Megaphone from '@lucide/svelte/icons/megaphone';
import MessagesSquare from '@lucide/svelte/icons/messages-square';
import Newspaper from '@lucide/svelte/icons/newspaper';
import PenLine from '@lucide/svelte/icons/pen-line';
import Siren from '@lucide/svelte/icons/siren';
import Users from '@lucide/svelte/icons/users';
import { t } from './i18n.svelte.ts';
import { noComite, papelPrincipal } from './papeis.ts';
import type { Papel } from './supabase.ts';

export type Tela = { href: string; rotulo: string; descricao: string; icone: typeof House; mais: boolean; abrange?: string };
type Participacao = { papel: Papel; comite_sigla: string | null };

/** No celular cabem 4 telas na barra de baixo; o resto vai para "Mais". */
export const NA_BARRA = 4;

/**
 * O menu por tarefa (passo 43), na ordem de uso de cada papel: as primeiras ficam na barra
 * do celular, as outras em "Mais". No notebook, a lateral mostra todas.
 */
export function menu(participacoes: Participacao[]): Tela[] {
	const principal = papelPrincipal(participacoes);
	const papeis = new Set(participacoes.map((p) => p.papel));
	// Passo 54: o comitê aparece sempre que a pessoa tem um comitê, qualquer que seja o principal.
	const meu = noComite(participacoes);
	const sigla = meu?.comite_sigla;
	const siglaCrise = participacoes.find((p) => p.papel === 'crise')?.comite_sigla;
	const tela = (href: string, rotulo: string, descricao: string, icone: typeof House): Omit<Tela, 'mais'> => ({ href, rotulo, descricao, icone });

	const sessao = sigla
		? meu?.papel === 'mesa'
			? { ...tela(`/comite/${sigla}/sessao/presidencia`, t('Painel'), t('Conduzir a sessão: palavra, pontos e votações'), Gavel), abrange: `/comite/${sigla}/sessao` }
			: tela(`/comite/${sigla}/sessao`, t('Sessão'), t('A sessão ao vivo: placa, pontos e votos'), Gavel)
		: null;
	const comite = sigla
		? [
				tela(`/comite/${sigla}/documentos`, t('Documentos'), t('DPO, projetos, cartas e caderno'), FileText),
				tela(`/comite/${sigla}/mensagens`, t('Mensagens'), t('Bilhetes e conversa com a mesa'), MessagesSquare),
				tela(`/comite/${sigla}`, t('Comitê'), t('Tópicos, regras, mesa e delegações'), Landmark)
			]
		: [];
	const press = tela('/press', t('Press'), t('As notícias dos veículos'), Newspaper);
	const geral = [
		tela('/cronograma', t('Cronograma'), t('Os horários do evento'), CalendarDays),
		tela('/avisos', t('Avisos'), t('Os avisos da organização'), Megaphone)
	];
	const crise = siglaCrise ? [tela(`/crise/${siglaCrise}`, t('Crise'), t('A fila de notas da crise'), Siren)] : [];
	const secretaria = papeis.has('secretaria')
		? [tela('/secretaria/participantes', t('Participantes'), t('Convites, check-in e dados'), Users)]
		: [];

	const agora = tela('/', t('Agora'), t('O que acontece e o que precisa de você'), House);
	const ordem =
		principal === 'press'
			? [agora, press, tela('/press/escrever', t('Escrever'), t('Escrever uma notícia'), PenLine), ...comite.slice(1, 2), ...(sessao ? [sessao] : []), comite[0], comite[2], ...geral]
			: principal === 'crise'
				? [agora, ...crise, ...(sessao ? [sessao] : []), ...comite.slice(1, 2), comite[0], comite[2], press, ...geral]
				: principal === 'secretaria'
					? [agora, ...(sessao ? [sessao] : []), ...comite, ...secretaria, press, ...geral]
					: [agora, ...(sessao ? [sessao] : []), ...comite, press, ...geral, ...crise, ...secretaria];
	const telas = ordem.filter((x) => !!x);
	// Com até 5 telas, todas cabem na barra e não há "Mais".
	return telas.map((x, i) => ({ ...x, mais: telas.length > NA_BARRA + 1 && i >= NA_BARRA }));
}
