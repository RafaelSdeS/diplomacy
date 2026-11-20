import { describe, expect, it } from 'vitest';
import { diferencaRelogio, fase, formatarTempo, restanteSeg, type Cronometro } from './cronometro.ts';

const INICIO = '2026-11-10T13:00:00.000Z';
const t = (seg: number) => Date.parse(INICIO) + seg * 1000;
const correndo = (duracao: number): Cronometro => ({
	cronometro_inicio: INICIO,
	cronometro_duracao_seg: duracao,
	cronometro_pausado_restante_seg: null
});

describe('restanteSeg', () => {
	it('conta para baixo a partir do início, arredondando para cima', () => {
		expect(restanteSeg(correndo(90), t(0))).toBe(90);
		expect(restanteSeg(correndo(90), t(0.2))).toBe(90);
		expect(restanteSeg(correndo(90), t(30))).toBe(60);
		expect(restanteSeg(correndo(90), t(89.5))).toBe(1);
	});

	it('não fica negativo', () => {
		expect(restanteSeg(correndo(90), t(200))).toBe(0);
	});

	it('pausado, mostra o que restava, sem andar', () => {
		const pausado = { ...correndo(90), cronometro_pausado_restante_seg: 42 };
		expect(restanteSeg(pausado, t(0))).toBe(42);
		expect(restanteSeg(pausado, t(500))).toBe(42);
	});

	it('retomado (novo início com o que restava), segue de onde parou', () => {
		const retomado = { ...correndo(42), cronometro_inicio: new Date(t(100)).toISOString() };
		expect(restanteSeg(retomado, t(110))).toBe(32);
	});

	it('segundos somados aumentam a duração', () => {
		expect(restanteSeg(correndo(90 + 30), t(30))).toBe(90);
	});

	it('sem cronômetro, devolve null', () => {
		expect(
			restanteSeg({ cronometro_inicio: null, cronometro_duracao_seg: null, cronometro_pausado_restante_seg: null }, t(0))
		).toBeNull();
	});

	it('com o relógio do aparelho atrasado, a diferença corrige', () => {
		// O aparelho está 5 s atrás do servidor; a ida e volta levou 200 ms.
		const diferenca = diferencaRelogio(t(-5), new Date(t(0.1)).toISOString(), t(-4.8));
		expect(diferenca).toBe(5000);
		const relogioDoAparelho = t(25);
		expect(restanteSeg(correndo(90), relogioDoAparelho)).toBe(65);
		expect(restanteSeg(correndo(90), relogioDoAparelho + diferenca)).toBe(60);
	});
});

describe('fase', () => {
	it('o aviso começa quando faltam 10 segundos', () => {
		const c = correndo(90);
		expect(fase(c, 11, 10)).toBe('correndo');
		expect(fase(c, 10, 10)).toBe('aviso');
		expect(fase(c, 1, 10)).toBe('aviso');
		expect(fase(c, 0, 10)).toBe('esgotado');
	});

	it('pausado e parado', () => {
		expect(fase({ ...correndo(90), cronometro_pausado_restante_seg: 5 }, 5, 10)).toBe('pausado');
		expect(fase(correndo(90), null, 10)).toBe('parado');
	});
});

it('formatarTempo', () => {
	expect(formatarTempo(90)).toBe('1:30');
	expect(formatarTempo(9)).toBe('0:09');
	expect(formatarTempo(600)).toBe('10:00');
});
