import { describe, expect, it } from 'vitest';
import { bureauPreside, momentoDoDebate, pausaRestanteSeg, situacaoDoPonto } from './sessao.ts';

const AGORA = Date.parse('2026-11-10T13:00:00.000Z');
const depois = (seg: number) => new Date(AGORA + seg * 1000).toISOString();

describe('momentoDoDebate (passo 30)', () => {
	it('com orador é fala; com a pausa correndo, pausa; depois, placas', () => {
		expect(momentoDoDebate({ orador: { id: 'x' }, pausa_ate: depois(5) }, AGORA)).toBe('fala');
		expect(momentoDoDebate({ orador: null, pausa_ate: depois(5) }, AGORA)).toBe('pausa');
		expect(momentoDoDebate({ orador: null, pausa_ate: depois(-1) }, AGORA)).toBe('placas');
		expect(momentoDoDebate({ orador: null, pausa_ate: null }, AGORA)).toBe('placas');
	});
	it('conta os segundos que faltam na pausa', () => {
		expect(pausaRestanteSeg(depois(9.2), AGORA)).toBe(10);
		expect(pausaRestanteSeg(depois(-3), AGORA)).toBe(0);
		expect(pausaRestanteSeg(null, AGORA)).toBe(0);
	});
});

describe('passo 29', () => {
	it('o bureau preside fora do debate, com a mesa assumindo ou sem delegação', () => {
		expect(bureauPreside('plenaria', false, 'd1')).toBe(true);
		expect(bureauPreside('debate', true, 'd1')).toBe(true);
		expect(bureauPreside('debate', false, null)).toBe(true);
		expect(bureauPreside('debate', false, 'd1')).toBe(false);
	});
	it('a etapa do pedido', () => {
		expect(situacaoDoPonto({ status: 'aberto', aprovado_bureau: null })).toBe('Aguardando o bureau');
		expect(situacaoDoPonto({ status: 'aberto', aprovado_bureau: true })).toBe('Aprovado pelo bureau · aguardando a presidência');
		expect(situacaoDoPonto({ status: 'recusado', motivo: 'Fora de hora' })).toBe('Recusado: Fora de hora');
	});
});
