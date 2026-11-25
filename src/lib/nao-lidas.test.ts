import { describe, expect, it } from 'vitest';
import { conversa, naoLidas } from './nao-lidas.ts';

const m = (id: string, tipo: string, de: string | null, para: string | null, quando = '2026-11-25T12:00:00Z') => ({
	id,
	tipo,
	criado_em: quando,
	de_delegacao_id: de,
	para_delegacao_id: para
});

describe('não lidas', () => {
	const msgs = [
		m('1', 'bilhete', 'br', 'fr'), // o Brasil escreve à França
		m('2', 'bilhete', 'fr', 'br'), // a França responde
		m('3', 'mesa', null, 'fr'), // a mesa escreve à França
		m('4', 'mesa', 'br', null) // o Brasil escreve à mesa
	];
	it('para a delegação, contam o bilhete recebido e a mensagem da mesa', () => {
		expect(naoLidas(msgs, 'fr', {}).map((x) => x.id)).toEqual(['1', '3']);
		expect(conversa(msgs[0], 'fr')).toBe('b:br');
		expect(conversa(msgs[1], 'fr')).toBe('b:br');
	});
	it('para a mesa, conta a mensagem da delegação; o lido zera a conversa', () => {
		expect(naoLidas(msgs, null, {}).map((x) => x.id)).toEqual(['4']);
		expect(naoLidas(msgs, 'fr', { 'b:br': Date.parse('2026-11-25T13:00:00Z') }).map((x) => x.id)).toEqual(['3']);
	});
});
