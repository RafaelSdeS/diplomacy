// Modelos de impressão no formato dos documentos do UNOCT 2026 (funções puras,
// testadas em impressao.test.ts). O HTML e o CSS de impressão ficam nas rotas
// /imprimir/*.
import { t } from './i18n.svelte.ts';

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

const situacao = (rotulo: string, selo: string) => ({
	get rotulo() {
		return t(rotulo);
	},
	selo
});
export const STATUS_DPO: Record<string, { rotulo: string; selo: string }> = {
	enviado: situacao('Enviado', 'selo--ok'),
	retirado: situacao('Retirado pela mesa', 'selo--alerta'),
	// Os de antes do passo 53, quando a mesa aprovava um texto escrito no app.
	rascunho: situacao('Rascunho', ''),
	aprovado: situacao('Enviado', 'selo--ok'),
	pede_ajustes: situacao('A mesa pede ajustes', 'selo--alerta')
};
