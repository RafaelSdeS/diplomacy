import { describe, expect, it } from 'vitest';
import { formatarEspera, minutosDesde, ordenarFila, resumoDaFila } from './crise.ts';

const t = (min: number) => new Date(Date.UTC(2026, 10, 10, 13, min)).toISOString();
const agora = Date.parse(t(30));

describe('fila da crise', () => {
	const notas = [
		{ id: 'c', status: 'aprovada', criado_em: t(2) },
		{ id: 'b', status: 'pendente', criado_em: t(10) },
		{ id: 'a', status: 'em_analise', criado_em: t(5) },
		{ id: 'd', status: 'rejeitada', criado_em: t(20) },
		{ id: 'e', status: 'pendente', criado_em: t(25) }
	];

	it('as que esperam vêm primeiro, da mais antiga; depois as respondidas, da mais nova', () => {
		expect(ordenarFila(notas).map((n) => n.id)).toEqual(['a', 'b', 'e', 'd', 'c']);
	});

	it('o contador conta as pendentes e a espera da mais antiga, com alerta a partir de 10 minutos', () => {
		expect(resumoDaFila(notas, agora)).toEqual({ pendentes: 2, esperaMin: 20, alerta: true });
		expect(resumoDaFila(notas, Date.parse(t(15)))).toEqual({ pendentes: 2, esperaMin: 5, alerta: false });
		expect(resumoDaFila([], agora)).toEqual({ pendentes: 0, esperaMin: 0, alerta: false });
	});
});

it('o tempo de espera por extenso', () => {
	expect(minutosDesde(t(29), agora)).toBe(1);
	expect(minutosDesde(t(31), agora)).toBe(0);
	expect(formatarEspera(0)).toBe('agora');
	expect(formatarEspera(7)).toBe('há 7 min');
	expect(formatarEspera(75)).toBe('há 1 h 15 min');
});
