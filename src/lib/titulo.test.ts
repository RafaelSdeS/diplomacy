import { describe, expect, it } from 'vitest';
import { marca, tituloDaAba } from './titulo.svelte.ts';

describe('tituloDaAba', () => {
	it('sem evento, termina com o nome do app', () => {
		marca.evento = null;
		expect(tituloDaAba('Chamada', 'CSNU')).toBe('Chamada · CSNU · Diplomacy');
	});
	it('com evento, termina com o nome dele e pula partes vazias', () => {
		marca.evento = 'UFRGSMUN';
		expect(tituloDaAba('Sessão', null, 'UNOCT')).toBe('Sessão · UNOCT · UFRGSMUN');
		marca.evento = null;
	});
});
