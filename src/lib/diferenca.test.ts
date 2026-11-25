import { describe, expect, it } from 'vitest';
import { diferencaPorPalavra } from './diferenca.ts';

describe('diferencaPorPalavra', () => {
	it('marca o que entrou e o que saiu, e junta o resto', () => {
		expect(diferencaPorPalavra('Manhã: tópico 1, depois almoço', 'Manhã: tópico 2, depois almoço longo')).toEqual([
			{ tipo: 'igual', texto: 'Manhã: tópico ' },
			{ tipo: 'saiu', texto: '1,' },
			{ tipo: 'entrou', texto: '2,' },
			{ tipo: 'igual', texto: ' depois almoço' },
			{ tipo: 'entrou', texto: ' longo' }
		]);
	});
	it('textos iguais e vazios', () => {
		expect(diferencaPorPalavra('a b', 'a b')).toEqual([{ tipo: 'igual', texto: 'a b' }]);
		expect(diferencaPorPalavra('', 'novo')).toEqual([{ tipo: 'entrou', texto: 'novo' }]);
	});
	it('reconstrói os dois textos', () => {
		const antes = 'o comitê decide cuidar dos rios e das florestas';
		const depois = 'o comitê recomenda cuidar das florestas e dos mares';
		const d = diferencaPorPalavra(antes, depois);
		expect(d.filter((x) => x.tipo !== 'entrou').map((x) => x.texto).join('')).toBe(antes);
		expect(d.filter((x) => x.tipo !== 'saiu').map((x) => x.texto).join('')).toBe(depois);
	});
});
