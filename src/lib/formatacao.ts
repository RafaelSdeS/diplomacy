// Formatação de working papers, projetos e resoluções no formato dos documentos do
// UNOCT (funções puras, testadas em formatacao.test.ts).

export type ClausulaParaFormatar = { id: string; tipo: string; pai_id: string | null; ordem: number; texto: string };
export type Idioma = 'pt' | 'en';

export type DocumentoFormatado = {
	textos: { id: string; texto: string }[]; // blocos livres do working paper
	preambulares: { id: string; texto: string }[];
	linhaDoComite: string;
	operativas: { id: string; numero: number; texto: string; subitens: { id: string; letra: string; texto: string }[] }[];
	signatarios: string;
};

/** Troca a pontuação final do texto pela pedida. */
export const pontuar = (texto: string, final: string) => texto.trim().replace(/[\s.,;:]+$/, '') + final;

/**
 * Preambulares terminam com ponto e vírgula; operativas também, e a última com ponto.
 * Uma operativa com subitens termina com dois-pontos, e os subitens seguem a regra
 * (o último subitem da última operativa termina com ponto). Operativas numeradas
 * (1, 2...), subitens com letras (a, b...).
 */
export function formatarDocumento(
	clausulas: ClausulaParaFormatar[],
	comite: { nome_oficial: string; idioma: string },
	signatarios: string[]
): DocumentoFormatado {
	const ordenadas = [...clausulas].sort((a, b) => a.ordem - b.ordem);
	const de = (tipo: string) => ordenadas.filter((c) => c.tipo === tipo);
	const operativas = de('operativa');

	return {
		textos: de('texto').map((c) => ({ id: c.id, texto: c.texto.trim() })),
		preambulares: de('preambular').map((c) => ({ id: c.id, texto: pontuar(c.texto, ';') })),
		linhaDoComite: pontuar(comite.nome_oficial, ':'),
		operativas: operativas.map((c, i) => {
			const ultima = i === operativas.length - 1;
			const subitens = ordenadas.filter((s) => s.tipo === 'subitem' && s.pai_id === c.id);
			return {
				id: c.id,
				numero: i + 1,
				texto: pontuar(c.texto, subitens.length ? ':' : ultima ? '.' : ';'),
				subitens: subitens.map((s, j) => ({
					id: s.id,
					letra: String.fromCharCode(97 + j),
					texto: pontuar(s.texto, ultima && j === subitens.length - 1 ? '.' : ';')
				}))
			};
		}),
		signatarios: linhaDeSignatarios(signatarios, comite.idioma === 'en' ? 'en' : 'pt')
	};
}

/** "Signatários: A, B e C." ou "Signatories: A, B and C.", com os nomes oficiais. */
export function linhaDeSignatarios(nomes: string[], idioma: Idioma) {
	if (!nomes.length) return '';
	const lista = new Intl.ListFormat(idioma === 'en' ? 'en' : 'pt-BR', { type: 'conjunction' }).format(
		[...nomes].sort((a, b) => a.localeCompare(b, idioma === 'en' ? 'en' : 'pt-BR'))
	);
	return `${idioma === 'en' ? 'Signatories' : 'Signatários'}: ${lista}.`;
}

export const TIPOS_DOCUMENTO: Record<string, string> = {
	working_paper: 'Working paper',
	projeto: 'Projeto de resolução',
	resolucao_crise: 'Resolução de crise'
};

export const STATUS_DOCUMENTO: Record<string, { rotulo: string; selo: string }> = {
	rascunho: { rotulo: 'Rascunho', selo: '' },
	enviado: { rotulo: 'Enviado à mesa', selo: 'selo--info' },
	aprovado_mesa: { rotulo: 'Aprovado pela mesa', selo: 'selo--ok' },
	em_votacao: { rotulo: 'Em votação', selo: 'selo--alerta' },
	aprovado: { rotulo: 'Aprovado', selo: 'selo--ok' },
	rejeitado: { rotulo: 'Rejeitado', selo: 'selo--erro' }
};

/** "Projeto de resolução 2: Financiamento" (o número vem no envio à mesa). */
export const nomeDoDocumento = (d: { tipo: string; numero: number | null; titulo: string }) =>
	`${TIPOS_DOCUMENTO[d.tipo] ?? d.tipo}${d.numero ? ` ${d.numero}` : ''}: ${d.titulo}`;
