import { t } from './i18n.svelte.ts';
import { supabase } from './supabase.ts';
import { lerAoVivo } from './tempo-real.ts';

// Passo 56: a ordem do tópico. Agenda → working papers → projeto → resolução. A etapa atual
// sai do que as telas já carregam: a agenda adotada e os documentos do tópico (a RLS decide
// quais a pessoa vê).
export const ETAPAS = ['agenda', 'working_papers', 'projeto', 'resolucao'] as const;
export type Etapa = (typeof ETAPAS)[number];
export type Doc = { tipo: string; status: string; topico: number | null };
export type Resumo = { adotada: boolean; documentos: Doc[] };

/** A etapa em que o tópico está; 'encerrado' depois da resolução aprovada (uma por tópico). */
export function etapaAtual({ adotada, documentos }: Resumo): Etapa | 'encerrado' {
	if (!adotada) return 'agenda';
	const projetos = documentos.filter((d) => d.tipo === 'projeto');
	if (projetos.some((p) => p.status === 'aprovado')) return 'encerrado';
	// Aprovado pela mesa, o projeto vai a consenso ou a voto: é a etapa da resolução.
	if (projetos.some((p) => p.status === 'aprovado_mesa' || p.status === 'em_votacao')) return 'resolucao';
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
	resolucao: t('Resolução')
});

/** O que fazer agora, por papel: uma linha sob a etapa atual. */
export function oQueFazer(atual: Etapa | 'encerrado', mesa: boolean): string {
	if (atual === 'encerrado') return t('Resolução aprovada: o comitê passa ao próximo tópico.');
	if (mesa)
		return {
			agenda: t('Adote uma agenda quando o comitê decidir.'),
			working_papers: t('Avalie os working papers que os blocos enviarem.'),
			projeto: t('Avalie o projeto e leve-o a consenso ou a voto.'),
			resolucao: t('Conduza o consenso ou a votação do projeto.')
		}[atual];
	return {
		agenda: t('Proponha ou apoie uma agenda.'),
		working_papers: t('Escreva um working paper com o seu bloco.'),
		projeto: t('Junte os working papers num projeto e reúna as assinaturas.'),
		resolucao: t('Acompanhe o consenso ou a votação do projeto.')
	}[atual];
}

/** As agendas (propostas e adotadas) e os documentos do comitê, para a trilha de cada tópico. */
export async function carregarOrdem(comite: string) {
	const [agenda, documentos] = await Promise.all([
		lerAoVivo(`ordem-agenda:${comite}`, ['proposta_agenda'], () => supabase.from('proposta_agenda').select('topico, adotada').eq('comite_id', comite)),
		lerAoVivo(`ordem-documentos:${comite}`, ['documento'], () => supabase.from('documento').select('tipo, status, topico, ponto_pauta_id').eq('comite_id', comite))
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
