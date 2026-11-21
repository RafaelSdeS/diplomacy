import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COMITES, nomeFicticio } from './dados.ts';

describe('dados da demonstração', () => {
	it('tem os 6 comitês do UFRGSMUN 2026, com 147 delegações', () => {
		expect(COMITES.map((c) => [c.sigla, c.delegacoes.length])).toEqual([
			['CSNU', 15],
			['ARF', 24],
			['OEA', 26],
			['CEUE', 27],
			['ACEG-UA', 27],
			['UNOCT', 28]
		]);
		expect(COMITES.reduce((n, c) => n + c.delegacoes.length, 0)).toBe(147);
	});

	it('não repete delegação dentro de um comitê', () => {
		for (const c of COMITES) expect(new Set(c.delegacoes.map(([nome]) => nome)).size).toBe(c.delegacoes.length);
	});

	it('usa só bandeiras que existem no flag-icons', () => {
		const faltando = COMITES.flatMap((c) => c.delegacoes)
			.map(([, , bandeira]) => bandeira)
			.filter((b) => b !== null && !existsSync(`node_modules/flag-icons/flags/4x3/${b}.svg`));
		expect(faltando).toEqual([]);
	});

	it('os membros permanentes do CSNU são delegações do comitê', () => {
		const csnu = COMITES.find((c) => c.sigla === 'CSNU')!;
		const nomes = new Set(csnu.delegacoes.map(([nome]) => nome));
		for (const p of csnu.regras.membros_permanentes as string[]) expect(nomes.has(p)).toBe(true);
	});

	it('gera sempre os mesmos nomes fictícios', () => {
		expect(nomeFicticio(0)).toBe(nomeFicticio(0));
		expect(new Set(Array.from({ length: 200 }, (_, i) => nomeFicticio(i))).size).toBeGreaterThan(150);
	});
});
