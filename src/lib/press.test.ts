import { describe, expect, it } from 'vitest';
import { legendaDaNoticia, linkWhatsApp, linkX, textoParaX } from './press.ts';

describe('press nas redes (passo 36)', () => {
	it('a legenda junta título, linha fina e hashtags', () => {
		expect(legendaDaNoticia({ titulo: 'Trégua', linha_fina: 'Acordo no Sahel' }, '#UFRGSMUN')).toBe('Trégua\n\nAcordo no Sahel\n\n#UFRGSMUN');
		expect(legendaDaNoticia({ titulo: 'Trégua', linha_fina: null }, '#UFRGSMUN')).toBe('Trégua\n\n#UFRGSMUN');
	});
	it('os links codificam acentos e #', () => {
		expect(linkWhatsApp('Ação #UFRGSMUN')).toBe('https://wa.me/?text=A%C3%A7%C3%A3o%20%23UFRGSMUN');
		expect(linkX('Ação #UFRGSMUN')).toBe('https://x.com/intent/post?text=A%C3%A7%C3%A3o%20%23UFRGSMUN');
	});
	it('o texto do X não passa de 280 caracteres nem parte palavra', () => {
		const longo = Array(80).fill('palavra').join(' ');
		const x = textoParaX(longo);
		expect(x.length).toBeLessThanOrEqual(280);
		expect(x.endsWith('palavra…')).toBe(true);
	});
});
