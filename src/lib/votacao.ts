// Funções puras da plenária, da votação e da agenda (testadas em votacao.test.ts).
import { bilingue, idioma, t } from './i18n.svelte.ts';

export type Escolha = 'a_favor' | 'contra' | 'abstencao';
export type Fase = 'plenaria' | 'debate' | 'acao' | 'encerrado';

export const ESCOLHAS: Record<Escolha, string> = bilingue({ a_favor: 'A favor', contra: 'Contra', abstencao: 'Abstenção' });

export const FASES: Record<Fase, string> = bilingue({
	plenaria: 'Plenária de abertura',
	debate: 'Debate',
	acao: 'Fase de ação',
	encerrado: 'Encerrado'
});

export const ETAPAS: Record<string, { rotulo: string; proxima?: string }> = {
	briefing: {
		get rotulo() {
			return t('Briefing e diálogo interativo');
		},
		get proxima() {
			return t('Começar os discursos de abertura');
		}
	},
	discursos: {
		get rotulo() {
			return t('Discursos de abertura');
		},
		get proxima() {
			return t('Passar à moção do tópico no topo');
		}
	},
	topico: {
		get rotulo() {
			return t('Moção do tópico no topo da agenda');
		}
	}
};

/** As escolhas que a delegação pode fazer nesta votação (o banco confere de novo). */
export function escolhasPermitidas(
	tipo: string,
	situacao: string | null | undefined,
	presenca: string | null | undefined
): Escolha[] {
	if (!presenca || situacao === 'suspensa') return [];
	if (tipo === 'substantiva' && situacao === 'observadora') return [];
	const podeAbster = tipo === 'substantiva' && presenca !== 'presente_e_votando';
	return podeAbster ? ['a_favor', 'contra', 'abstencao'] : ['a_favor', 'contra'];
}

type Resultado = {
	a_favor: number | null;
	contra: number | null;
	abstencoes: number | null;
	necessario: number | null;
	aprovada: boolean | null;
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** "Aprovada: 4 a favor, 1 contra e 0 abstenções (eram necessários 4)". */
export function textoResultado(r: Resultado): string {
	if (idioma.atual === 'en') {
		const ab = r.abstencoes ?? 0;
		const nec = r.necessario ?? 0;
		return `${r.aprovada ? 'Adopted' : 'Rejected'}: ${r.a_favor ?? 0} in favour, ${r.contra ?? 0} against and ${ab} ${ab === 1 ? 'abstention' : 'abstentions'} (${nec} ${nec === 1 ? 'vote' : 'votes'} required)`;
	}
	const partes = `${r.a_favor ?? 0} a favor, ${r.contra ?? 0} contra e ${plural(r.abstencoes ?? 0, 'abstenção', 'abstenções')}`;
	return `${r.aprovada ? 'Aprovada' : 'Rejeitada'}: ${partes} (${plural(r.necessario ?? 0, 'voto necessário', 'votos necessários')})`;
}

/** Quem preside de fato: na plenária, na fase de ação e quando a mesa assume, é o bureau. */
export function presidenciaEmVigor(
	fase: Fase | null | undefined,
	mesaAssumiu: boolean | null | undefined,
	delegacao: string | null | undefined
): string {
	if (fase !== 'debate' || mesaAssumiu || !delegacao) return t('Mesa');
	return delegacao;
}

type Inscricao = { ponto_mocao_id: string | null; falou: boolean; lado: string | null; ordem: number };

/**
 * A lista de oradores em uso: a de uma moção em discussão (lista especial) ou,
 * na plenária, a dos discursos de abertura.
 */
export function listaAtiva<T extends Inscricao>(
	lista: T[],
	pontoEmDiscussao: string | null | undefined,
	fase: Fase | null | undefined
): T[] {
	if (pontoEmDiscussao) return lista.filter((i) => i.ponto_mocao_id === pontoEmDiscussao);
	if (fase === 'plenaria') return lista.filter((i) => i.ponto_mocao_id === null);
	return [];
}

/** O próximo da lista que ainda não falou. */
export const proximoDaLista = <T extends Inscricao>(lista: T[]) =>
	[...lista].sort((a, b) => a.ordem - b.ordem).find((i) => !i.falou);

export type ItemEsboco = { texto: string; nivel: number };

/**
 * Lê a agenda escrita como esboço: uma linha por item; cada dois espaços (ou um
 * "-") no começo descem um nível, até 2. Linhas vazias são ignoradas.
 */
export function lerEsboco(texto: string): ItemEsboco[] {
	return texto
		.split('\n')
		.map((linha) => {
			const recuo = linha.match(/^[\s-]*/)![0];
			const nivel = Math.min(2, (recuo.match(/-/g)?.length ?? 0) + Math.floor(recuo.replace(/-/g, '').length / 2));
			return { texto: linha.slice(recuo.length).trim(), nivel };
		})
		.filter((item) => item.texto.length > 0);
}

/** O contrário de lerEsboco, para editar uma proposta já salva. */
export const escreverEsboco = (itens: ItemEsboco[]) =>
	itens.map((i) => `${'  '.repeat(i.nivel)}${i.texto}`).join('\n');

export const REGRAS_VOTACAO: Record<string, string> = bilingue({
	maioria_simples: 'maioria simples',
	dois_tercos: 'dois terços',
	csnu: 'regra do CSNU (9 votos, sem voto contra de permanente)',
	unanimidade: 'unanimidade das delegações previstas'
});

/** Assinaturas que a não-confiança pede: a fração das regras, das delegações previstas, para cima. */
export function assinaturasDesconfianca(fracao: [number, number], delegacoes: { situacao: string }[]) {
	return Math.ceil((delegacoes.filter((d) => d.situacao !== 'suspensa').length * fracao[0]) / fracao[1]);
}
