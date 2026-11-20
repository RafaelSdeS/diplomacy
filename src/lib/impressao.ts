// Modelos de impressão no formato dos documentos do UNOCT 2026 (funções puras,
// testadas em impressao.test.ts). O HTML e o CSS de impressão ficam nas rotas
// /imprimir/*.

const EN = (idioma: string) => idioma === 'en';

/** Parágrafos separados por linha em branco. */
export const paragrafos = (texto: string) =>
	texto
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean);

const lista = (nomes: string[], idioma: string) =>
	new Intl.ListFormat(EN(idioma) ? 'en' : 'pt-BR', { type: 'conjunction' }).format(nomes);

type Comite = { nome_oficial: string; idioma: string; topicos: string[] };

/**
 * DPO: nome oficial do país no topo, comitê, faixa com o tópico, texto em duas
 * colunas, referências numeradas e a assinatura da delegação.
 */
export function modeloDpo(
	dpo: { topico: number; texto: string; referencias: string[] },
	delegacao: { nome_oficial: string; bandeira: string | null },
	comite: Comite
) {
	return {
		pais: delegacao.nome_oficial,
		bandeira: delegacao.bandeira,
		titulo: EN(comite.idioma) ? 'Position Paper' : 'Documento de Posição Oficial',
		comite: comite.nome_oficial,
		topico: `${EN(comite.idioma) ? 'Topic' : 'Tópico'} ${dpo.topico}: ${comite.topicos[dpo.topico - 1] ?? ''}`.trim(),
		paragrafos: paragrafos(dpo.texto),
		referencias: dpo.referencias.map((texto, i) => ({ numero: i + 1, texto })),
		rotuloReferencias: EN(comite.idioma) ? 'References' : 'Referências',
		assinatura: EN(comite.idioma) ? `Delegation of ${delegacao.nome_oficial}` : `Delegação de ${delegacao.nome_oficial}`
	};
}

/** Carta: cabeçalho do remetente, destinatários, corpo e assinatura. */
export function modeloCarta(
	carta: { titulo: string; corpo: string; publica: boolean },
	remetente: string,
	destinatarios: string[],
	comite: Comite
) {
	const en = EN(comite.idioma);
	return {
		remetente,
		comite: comite.nome_oficial,
		para: carta.publica
			? en
				? `To: all delegations of ${comite.nome_oficial}`
				: `Para: todas as delegações de ${comite.nome_oficial}`
			: `${en ? 'To' : 'Para'}: ${lista(destinatarios, comite.idioma)}`,
		titulo: carta.titulo,
		paragrafos: paragrafos(carta.corpo),
		assinatura: remetente
	};
}

export const STATUS_DPO: Record<string, { rotulo: string; selo: string }> = {
	rascunho: { rotulo: 'Rascunho', selo: '' },
	enviado: { rotulo: 'Enviado à mesa', selo: 'selo--info' },
	aprovado: { rotulo: 'Aprovado', selo: 'selo--ok' },
	pede_ajustes: { rotulo: 'A mesa pede ajustes', selo: 'selo--alerta' }
};
