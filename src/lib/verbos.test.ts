import { describe, expect, it } from 'vitest';
import { separarVerbo } from './verbos.ts';

describe('separarVerbo', () => {
	it('acha o verbo da lista, mesmo com mais de uma palavra, e senão a primeira palavra', () => {
		expect(separarVerbo('Tendo em mente a Carta', 'preambular', 'pt')).toEqual(['Tendo em mente', ' a Carta']);
		expect(separarVerbo('Decide criar um fundo;', 'operativa', 'pt')).toEqual(['Decide', ' criar um fundo;']);
		expect(separarVerbo('Strongly condemns the attacks', 'operativa', 'en')).toEqual(['Strongly condemns', ' the attacks']);
		expect(separarVerbo('Lembra o acordo', 'operativa', 'pt')).toEqual(['Lembra', ' o acordo']);
		expect(separarVerbo('Recordando', 'preambular', 'pt')).toEqual(['Recordando', '']);
	});
});
