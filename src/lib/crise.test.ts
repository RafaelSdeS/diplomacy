import { describe, expect, it } from 'vitest';
import { formatarEspera, minutosDesde, ordenarFila, resumoDaFila, segundosAtePrazo, semVoz, type Incidente } from './crise.ts';

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

describe('crise com prazo (passo 35)', () => {
	const AGORA = Date.parse('2026-11-10T13:00:00.000Z');
	const em = (seg: number) => new Date(AGORA + seg * 1000).toISOString();
	const incidente = (extra: Partial<Incidente> = {}): Incidente => ({
		id: 'i1',
		titulo: 'Rebeldes do Sahel',
		texto: 'O delegado russo foi assassinado.',
		prazo: em(600),
		desfecho: null,
		desfecho_texto: null,
		encerrado_em: null,
		efeitos: [{ delegacao_id: 'ru', texto: 'Delegado assassinado', ate: null, delegacao: { nome: 'Rússia' } }],
		...extra
	});

	it('conta os segundos até o prazo', () => {
		expect(segundosAtePrazo(em(600), AGORA)).toBe(600);
		expect(segundosAtePrazo(em(-5), AGORA)).toBe(0);
	});
	it('a delegação atingida fica sem voz até o fim, ou até o prazo do efeito', () => {
		expect(semVoz([incidente()], 'ru', AGORA)).toBe('Delegado assassinado');
		expect(semVoz([incidente()], 'fr', AGORA)).toBeNull();
		expect(semVoz([incidente({ encerrado_em: em(-1) })], 'ru', AGORA)).toBeNull();
		const comPrazo = incidente({ efeitos: [{ delegacao_id: 'ru', texto: 'Sequestrado', ate: em(-1), delegacao: null }] });
		expect(semVoz([comPrazo], 'ru', AGORA)).toBeNull();
	});
});
