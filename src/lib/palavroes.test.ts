import { describe, expect, it } from 'vitest';
import { palavroes } from './palavroes.ts';

describe('palavroes', () => {
	it('acha palavrões com e sem acento, nas três línguas, em qualquer caixa', () => {
		expect(palavroes('Que MERDA de acordo, seu otário!')).toEqual(['merda', 'otario']);
		expect(palavroes('This is bullshit.')).toEqual(['bullshit']);
		expect(palavroes('¡Qué cabrón! Joder.')).toEqual(['cabron', 'joder']);
		expect(palavroes('Foda-se o tratado; foda-se.')).toEqual(['foda']);
	});

	it('não acusa palavras comuns parecidas', () => {
		const comuns =
			'O computador da delegação disputa a reputação; o direito putativo. ' +
			'The assessment of the class; Scunthorpe. Shitake não; o carajillo é um café. Cabronazo? Dispute.';
		expect(palavroes(comuns)).toEqual([]);
	});
});
