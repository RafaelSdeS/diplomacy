import { describe, expect, it } from 'vitest';
import { agruparPorDia, formatarHora, formatarQuando, itensAtuais, proximoItem, type ItemCronograma } from './cronograma.ts';

const item = (titulo: string, inicio: string, fim: string): ItemCronograma => ({
	id: titulo,
	titulo,
	local: null,
	inicio,
	fim,
	comite_id: null
});

const CRONOGRAMA = [
	item('Sessão 2', '2027-11-10T14:00:00-03:00', '2027-11-10T17:30:00-03:00'),
	item('Sessão 1', '2027-11-10T10:30:00-03:00', '2027-11-10T12:30:00-03:00'),
	item('Almoço', '2027-11-10T12:30:00-03:00', '2027-11-10T14:00:00-03:00'),
	item('Festa', '2027-11-10T23:00:00-03:00', '2027-11-11T02:00:00-03:00'),
	item('Sessão 3', '2027-11-11T09:00:00-03:00', '2027-11-11T12:00:00-03:00')
];

const em = (iso: string) => new Date(iso);

describe('itensAtuais', () => {
	it('acha o que está acontecendo', () => {
		expect(itensAtuais(CRONOGRAMA, em('2027-11-10T10:45:00-03:00')).map((i) => i.titulo)).toEqual(['Sessão 1']);
	});

	it('inclui o começo e exclui o fim', () => {
		expect(itensAtuais(CRONOGRAMA, em('2027-11-10T12:30:00-03:00')).map((i) => i.titulo)).toEqual(['Almoço']);
	});

	it('fica vazio quando nada acontece', () => {
		expect(itensAtuais(CRONOGRAMA, em('2027-11-10T08:00:00-03:00'))).toEqual([]);
	});
});

describe('proximoItem', () => {
	it('acha o próximo a começar, mesmo fora de ordem', () => {
		expect(proximoItem(CRONOGRAMA, em('2027-11-10T10:45:00-03:00'))?.titulo).toBe('Almoço');
	});

	it('não acha nada depois do último', () => {
		expect(proximoItem(CRONOGRAMA, em('2027-11-12T00:00:00-03:00'))).toBeUndefined();
	});
});

describe('agruparPorDia', () => {
	it('agrupa pelo dia no fuso do evento, em ordem', () => {
		const grupos = agruparPorDia(CRONOGRAMA);
		expect(grupos.map((g) => g.rotulo)).toEqual(['quarta-feira, 10 de novembro', 'quinta-feira, 11 de novembro']);
		// A festa das 23h é do dia 10, mesmo já sendo dia 11 em UTC.
		expect(grupos[0].itens.map((i) => i.titulo)).toEqual(['Sessão 1', 'Almoço', 'Sessão 2', 'Festa']);
	});
});

describe('formatação', () => {
	it('mostra a hora no fuso do evento', () => {
		expect(formatarHora('2027-11-10T13:30:00Z')).toBe('10:30');
	});

	it('diz só a hora no mesmo dia e o dia quando é outro', () => {
		const agora = em('2027-11-10T10:45:00-03:00');
		expect(formatarQuando('2027-11-10T12:30:00-03:00', agora)).toBe('às 12:30');
		expect(formatarQuando('2027-11-11T09:00:00-03:00', agora)).toBe('quinta-feira, 11 de novembro, às 09:00');
	});
});
