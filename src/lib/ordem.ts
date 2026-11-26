import { t } from './i18n.svelte.ts';
import { supabase } from './supabase.ts';
import { lerAoVivo } from './tempo-real.ts';

// Passo 56: a ordem do tópico. Passo 62 (lote 5): Agenda → Working papers → Projeto → Fase de ação
// → Resolução, com nomes em toda parte. A etapa atual
// sai do que as telas já carregam: a agenda adotada e os documentos do tópico (a RLS decide
// quais a pessoa vê).
export const ETAPAS = ['agenda', 'working_papers', 'projeto', 'acao', 'resolucao'] as const;
export type Etapa = (typeof ETAPAS)[number];
export type Doc = { tipo: string; status: string; topico: number | null; id?: string; bloco_id?: string | null };
export type Resumo = { adotada: boolean; documentos: Doc[] };

/** A etapa em que o tópico está; 'encerrado' depois da resolução aprovada (uma por tópico). */
export function etapaAtual({ adotada, documentos }: Resumo): Etapa | 'encerrado' {
	if (!adotada) return 'agenda';
	// Passo 63: o projeto rejeitado fica no histórico; o tópico volta aos working papers.
	const projetos = documentos.filter((d) => d.tipo === 'projeto' && d.status !== 'rejeitado');
	if (projetos.some((p) => p.status === 'aprovado')) return 'encerrado';
	// Na fase de ação, o projeto vai a consenso ou a voto. A resolução aprovada fecha o tópico.
	if (projetos.some((p) => p.status === 'aprovado_mesa' || p.status === 'em_votacao')) return 'acao';
	if (projetos.length) return 'projeto';
	return 'working_papers';
}

/** feita, atual ou ainda não, para cada etapa. */
export function estadoDaEtapa(etapa: Etapa, atual: Etapa | 'encerrado'): 'feita' | 'atual' | 'depois' {
	if (atual === 'encerrado') return 'feita';
	const i = ETAPAS.indexOf(etapa);
	const j = ETAPAS.indexOf(atual);
	return i < j ? 'feita' : i === j ? 'atual' : 'depois';
}

export const ROTULO_ETAPA = (): Record<Etapa, string> => ({
	agenda: t('Agenda'),
	working_papers: t('Working papers'),
	projeto: t('Projeto'),
	acao: t('Fase de ação'),
	resolucao: t('Resolução')
});

/** O que fazer agora, por papel: uma linha sob a etapa atual. */
export function oQueFazer(atual: Etapa | 'encerrado', mesa: boolean): string {
	if (atual === 'encerrado') return t('Resolução aprovada: o comitê passa ao próximo tópico.');
	if (mesa)
		return {
			agenda: t('Adote uma agenda quando o comitê decidir.'),
			working_papers: t('Ouça a sala e transforme os working papers em projeto.'),
			projeto: t('Reúna as assinaturas e leve o projeto à fase de ação.'),
			acao: t('Pergunte se alguma delegação se opõe; com objeção, abra a votação.'),
			resolucao: t('Resolução aprovada: o comitê passa ao próximo tópico.')
		}[atual];
	return {
		agenda: t('Proponha ou apoie uma agenda.'),
		working_papers: t('Proponha pelo redator do seu bloco e marque a sua posição.'),
		projeto: t('Assine o projeto do tópico, se concordar com ele.'),
		acao: t('Acompanhe o consenso ou a votação do projeto.'),
		resolucao: t('Resolução aprovada: o comitê passa ao próximo tópico.')
	}[atual];
}

/** As agendas (propostas e adotadas) e os documentos do comitê, para a trilha de cada tópico. */
export async function carregarOrdem(comite: string) {
	const [agenda, documentos] = await Promise.all([
		lerAoVivo(`ordem-agenda:${comite}`, ['proposta_agenda'], () => supabase.from('proposta_agenda').select('topico, adotada').eq('comite_id', comite)),
		lerAoVivo(`ordem-documentos:${comite}`, ['documento'], () => supabase.from('documento').select('id, tipo, status, topico, bloco_id, ponto_pauta_id').eq('comite_id', comite))
	]);
	if (agenda.error) throw agenda.error;
	if (documentos.error) throw documentos.error;
	return { agenda: agenda.data, documentos: documentos.data };
}
export type Ordem = Awaited<ReturnType<typeof carregarOrdem>>;

/** O que a TrilhaDoTopico pede de um tópico. */
export const doTopico = (ordem: Ordem, topico: number) => ({
	topico,
	adotada: ordem.agenda.some((a) => a.topico === topico && a.adotada),
	propostas: ordem.agenda.filter((a) => a.topico === topico).length,
	documentos: ordem.documentos
});
