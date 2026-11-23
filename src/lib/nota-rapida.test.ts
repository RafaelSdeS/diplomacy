import { describe, expect, it } from 'vitest';
import { argsDaNota, contextoAgora } from './nota-rapida.ts';

describe('nota rápida da sessão (passo 46)', () => {
	const estado = { topico_atual: 2, orador: { id: 'fr', nome: 'França', bandeira: 'fr' } };
	const agora = new Date('2027-07-10T14:32:00Z');

	it('captura o tópico, quem falava e a hora', () => {
		expect(contextoAgora(estado, agora)).toEqual({ topico: 2, orador: { id: 'fr', nome: 'França' }, hora: '2027-07-10T14:32:00.000Z' });
		expect(contextoAgora(null, agora)).toEqual({ topico: null, orador: null, hora: '2027-07-10T14:32:00.000Z' });
	});

	it('"sobre esta delegação" vale para quem estava com a palavra quando a nota começou', () => {
		const contexto = contextoAgora(estado, agora);
		expect(argsDaNota('n1', 'c1', 'sobre', '  Prometeu apoio ao bloco.  ', contexto)).toEqual({
			p_id: 'n1',
			p_comite: 'c1',
			p_tipo: 'sobre',
			p_texto: 'Prometeu apoio ao bloco.',
			p_topico: 2,
			p_orador: 'fr',
			p_sobre: 'fr'
		});
		expect(argsDaNota('n2', 'c1', 'nota', 'x', contexto).p_sobre).toBeUndefined();
		expect(argsDaNota('n3', 'c1', 'fala', 'x', contextoAgora(null, agora))).toMatchObject({ p_topico: undefined, p_orador: undefined });
	});
});
