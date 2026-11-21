import { describe, expect, it } from 'vitest';
import { estimarDuracao } from './caderno.ts';

describe('estimarDuracao', () => {
	it('130 palavras levam um minuto', () => {
		expect(estimarDuracao('')).toBe(0);
		expect(estimarDuracao(Array(130).fill('palavra').join(' '))).toBe(60);
		expect(estimarDuracao(Array(260).fill('palavra').join('  \n '))).toBe(120);
	});
});
