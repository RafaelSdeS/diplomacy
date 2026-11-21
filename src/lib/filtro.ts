// Filtro das listas longas de delegações (passo 38): sem acento e sem diferenciar
// maiúsculas, no nome e no nome oficial ("cote" acha a Costa do Marfim).

export const semAcento = (texto: string) =>
	texto
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();

/** Mostra o campo de filtro só a partir deste tamanho. */
export const LISTA_LONGA = 12;

export function filtrarDelegacoes<T extends { nome: string; nome_oficial?: string | null }>(itens: T[], busca: string): T[] {
	const termo = semAcento(busca.trim());
	if (!termo) return itens;
	return itens.filter((d) => semAcento(`${d.nome} ${d.nome_oficial ?? ''}`).includes(termo));
}
