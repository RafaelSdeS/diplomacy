import { describe, expect, it } from 'vitest';
import { dimensoesReduzidas } from './imagem.ts';

describe('dimensoesReduzidas', () => {
	it('reduz o lado maior para 512 px, mantendo a proporção', () => {
		expect(dimensoesReduzidas(1024, 768)).toEqual({ largura: 512, altura: 384 });
		expect(dimensoesReduzidas(768, 1024)).toEqual({ largura: 384, altura: 512 });
	});

	it('não aumenta imagens pequenas', () => {
		expect(dimensoesReduzidas(300, 200)).toEqual({ largura: 300, altura: 200 });
	});

	it('nunca passa do máximo', () => {
		const { largura, altura } = dimensoesReduzidas(4032, 3024);
		expect(Math.max(largura, altura)).toBeLessThanOrEqual(512);
	});

	it('aceita outro máximo', () => {
		expect(dimensoesReduzidas(1000, 500, 100)).toEqual({ largura: 100, altura: 50 });
	});
});
