import { describe, expect, it } from 'vitest';
import { modeloCarta, paragrafos } from './impressao.ts';

const pt = { nome_oficial: 'O Conselho de Segurança', idioma: 'pt', topicos: ['Crime organizado', 'Iêmen'] };
const en = { nome_oficial: 'The United Nations Office of Counter-Terrorism', idioma: 'en', topicos: ['Financing', 'Prevention'] };

it('paragrafos separa por linha em branco e ignora espaços', () => {
	expect(paragrafos('Um.\n\n  Dois.\nainda dois.\n\n\n')).toEqual(['Um.', 'Dois.\nainda dois.']);
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
