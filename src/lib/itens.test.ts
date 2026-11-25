import { describe, expect, it } from 'vitest';
import { inserir, mover, preenchidos, recuar, remover } from './itens.ts';
import { escreverEsboco, lerEsboco } from './votacao.ts';

const base = [
	{ texto: 'A. Causas', nivel: 0 },
	{ texto: 'A.1 Atores', nivel: 1 },
	{ texto: 'B. Respostas', nivel: 0 }
];

describe('editor de itens', () => {
	it('gera a mesma árvore que a sintaxe de espaços', () => {
		expect(lerEsboco('A. Causas\n  A.1 Atores\nB. Respostas')).toEqual(base);
		expect(lerEsboco(escreverEsboco(base))).toEqual(base);
	});
	it('"Colar uma lista" monta os itens, com traços ou espaços', () => {
		expect(lerEsboco('A. Causas\n- A.1 Atores\n\nB. Respostas')).toEqual(base);
	});
	it('desce e sobe de nível sem pular nível', () => {
		expect(recuar(base, 2, 1)[2].nivel).toBe(1);
		expect(recuar(base, 1, 1)[1].nivel).toBe(1); // não passa de um abaixo do de cima
		expect(recuar(base, 0, 1)[0].nivel).toBe(0); // o primeiro fica no 0
		expect(recuar(base, 1, -1)[1].nivel).toBe(0);
		expect(recuar(recuar(base, 2, 1), 2, 1)[2].nivel).toBe(2);
	});
	it('muda a ordem, insere e remove, e só os preenchidos vão ao banco', () => {
		expect(mover(base, 2, -1).map((i) => i.texto)).toEqual(['A. Causas', 'B. Respostas', 'A.1 Atores']);
		expect(mover(base, 1, -1)[0]).toEqual({ texto: 'A.1 Atores', nivel: 0 });
		const com = inserir(base, 1);
		expect(com[2]).toEqual({ texto: '', nivel: 1 });
		expect(preenchidos(com)).toEqual(base);
		expect(remover(base, 0)[0].nivel).toBe(0);
	});
});
