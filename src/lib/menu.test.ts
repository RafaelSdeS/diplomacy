import { describe, expect, it } from 'vitest';
import { menu } from './menu.ts';

const hrefs = (ps: Parameters<typeof menu>[0]) => menu(ps).map((m) => m.href);

describe('menu', () => {
	it('secretaria e mesa recebem o comitê e os participantes (passo 54)', () => {
		const m = hrefs([
			{ papel: 'secretaria', comite_sigla: null },
			{ papel: 'mesa', comite_sigla: 'CSNU' }
		]);
		expect(m.slice(0, 6)).toEqual([
			'/',
			'/comite/CSNU/sessao/presidencia',
			'/comite/CSNU/documentos',
			'/comite/CSNU/mensagens',
			'/comite/CSNU',
			'/secretaria/participantes'
		]);
	});
	it('só secretaria continua sem o comitê', () => {
		const m = hrefs([{ papel: 'secretaria', comite_sigla: null }]);
		expect(m).toContain('/secretaria/participantes');
		expect(m.some((h) => h.startsWith('/comite/'))).toBe(false);
	});
});
