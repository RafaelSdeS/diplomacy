import { describe, expect, it } from 'vitest';
import { modeloCarta, modeloDpo, paragrafos } from './impressao.ts';

const pt = { nome_oficial: 'O Conselho de Segurança', idioma: 'pt', topicos: ['Crime organizado', 'Iêmen'] };
const en = { nome_oficial: 'The United Nations Office of Counter-Terrorism', idioma: 'en', topicos: ['Financing', 'Prevention'] };

it('paragrafos separa por linha em branco e ignora espaços', () => {
	expect(paragrafos('Um.\n\n  Dois.\nainda dois.\n\n\n')).toEqual(['Um.', 'Dois.\nainda dois.']);
});

describe('modeloDpo', () => {
	const dpo = { topico: 2, texto: 'Primeiro.\n\nSegundo.', referencias: ['Carta da ONU', 'Resolução 2216 (2015)'] };
	it('monta o cabeçalho, a faixa do tópico, as referências numeradas e a assinatura', () => {
		const m = modeloDpo(dpo, { nome_oficial: 'Federative Republic of Brazil', bandeira: 'br' }, pt);
		expect(m.pais).toBe('Federative Republic of Brazil');
		expect(m.titulo).toBe('Documento de Posição Oficial');
		expect(m.comite).toBe('O Conselho de Segurança');
		expect(m.topico).toBe('Tópico 2: Iêmen');
		expect(m.paragrafos).toEqual(['Primeiro.', 'Segundo.']);
		expect(m.referencias).toEqual([
			{ numero: 1, texto: 'Carta da ONU' },
			{ numero: 2, texto: 'Resolução 2216 (2015)' }
		]);
		expect(m.assinatura).toBe('Delegação de Federative Republic of Brazil');
	});
	it('em inglês nos comitês em inglês', () => {
		const m = modeloDpo({ ...dpo, topico: 1 }, { nome_oficial: 'French Republic', bandeira: 'fr' }, en);
		expect([m.titulo, m.topico, m.rotuloReferencias, m.assinatura]).toEqual([
			'Position Paper',
			'Topic 1: Financing',
			'References',
			'Delegation of French Republic'
		]);
	});
});

describe('modeloCarta', () => {
	it('privada: os destinatários por extenso', () => {
		const m = modeloCarta({ titulo: 'Aliança', corpo: 'Caros.\n\nAbraços.', publica: false }, 'República do Chile', ['Japão', 'Bloco do Sul'], pt);
		expect(m.para).toBe('Para: Japão e Bloco do Sul');
		expect(m.paragrafos).toHaveLength(2);
		expect(m.assinatura).toBe('República do Chile');
	});
	it('pública: todas as delegações do comitê', () => {
		expect(modeloCarta({ titulo: 'T', corpo: 'C', publica: true }, 'Bloco', [], en).para).toBe(
			'To: all delegations of The United Nations Office of Counter-Terrorism'
		);
	});
});
