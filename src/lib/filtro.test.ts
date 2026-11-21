import { describe, expect, it } from 'vitest';
import { filtrarDelegacoes } from './filtro.ts';

const DELEGACOES = [
	{ nome: 'Costa do Marfim', nome_oficial: "République de Côte d'Ivoire" },
	{ nome: 'Irã', nome_oficial: 'Islamic Republic of Iran' },
	{ nome: 'Iraque', nome_oficial: 'Republic of Iraq' }
];

describe('filtro de delegações', () => {
	it('ignora acento e maiúsculas, no nome e no nome oficial', () => {
		expect(filtrarDelegacoes(DELEGACOES, 'cote').map((d) => d.nome)).toEqual(['Costa do Marfim']);
		expect(filtrarDelegacoes(DELEGACOES, 'COSTA').map((d) => d.nome)).toEqual(['Costa do Marfim']);
		expect(filtrarDelegacoes(DELEGACOES, 'ira').map((d) => d.nome)).toEqual(['Irã', 'Iraque']);
	});
	it('busca vazia mostra tudo', () => {
		expect(filtrarDelegacoes(DELEGACOES, '  ')).toHaveLength(3);
	});
});
