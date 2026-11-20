// Aviso de palavrão para a press: o texto é comparado, palavra por palavra e sem
// acentos, com uma lista curta em português, inglês e espanhol. Só avisa: a
// publicação não é bloqueada. Palavra por palavra, "computador" não acusa "puta".
// ponytail: lista fixa e curta; ampliar com o que a Diretoria da Press pedir.

const LISTA = [
	// português
	'porra', 'caralho', 'merda', 'merdas', 'puta', 'putas', 'puto', 'putaria', 'foda', 'fodase', 'foder', 'fodido',
	'cacete', 'buceta', 'arrombado', 'otario', 'otaria', 'babaca', 'cuzao', 'viado', 'vagabunda', 'desgracado',
	// inglês
	'fuck', 'fucking', 'fucked', 'fucker', 'motherfucker', 'shit', 'bullshit', 'bitch', 'bastard', 'asshole', 'cunt',
	// espanhol
	'mierda', 'joder', 'jodido', 'gilipollas', 'cabron', 'pendejo', 'carajo', 'maricon', 'hijueputa'
];
const PALAVROES = new Set(LISTA);

export const semAcentos = (texto: string) =>
	texto
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();

/** Os palavrões do texto, sem acentos e sem repetir, na ordem em que aparecem. */
export function palavroes(texto: string): string[] {
	const palavras = semAcentos(texto).split(/[^\p{L}]+/u);
	return [...new Set(palavras.filter((p) => PALAVROES.has(p)))];
}
