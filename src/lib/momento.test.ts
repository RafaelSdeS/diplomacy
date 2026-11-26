import { describe, expect, it } from 'vitest';
import { momentoDoComite } from './momento.ts';

const plenaria = (etapa: string) => ({ fase: 'plenaria', etapa_plenaria: etapa, topico_atual: null });

describe('momentoDoComite', () => {
	it('na plenária, diz o momento e o que vem depois, por papel', () => {
		expect(momentoDoComite(plenaria('briefing'), 'delegacao').depois).toMatch(/Discursos de abertura/);
		expect(momentoDoComite(plenaria('discursos'), 'delegacao').agora).toMatch(/ordem alfabética/);
		expect(momentoDoComite(plenaria('topico'), 'delegacao').agora).toMatch(/Fazer um ponto ou moção/);
		expect(momentoDoComite(plenaria('topico'), 'mesa').agora).toMatch(/abra a votação/);
		expect(momentoDoComite(null, 'delegacao').passo).toBe('plenaria');
	});
	it('no debate, segue a ordem do tópico; na fase de ação, a mesa conduz', () => {
		const debate = { fase: 'debate', etapa_plenaria: null, topico_atual: 1 };
		expect(momentoDoComite(debate, 'delegacao', { adotada: false, documentos: [] })).toMatchObject({ passo: 'topico', depois: 'Working papers' });
		expect(momentoDoComite(debate, 'delegacao', { adotada: true, documentos: [] }).agora).toMatch(/redator do seu bloco/);
		expect(momentoDoComite(debate, 'presidencia', { adotada: true, documentos: [] }).agora).toMatch(/Conduza o debate/);
		expect(momentoDoComite({ fase: 'acao', etapa_plenaria: null, topico_atual: 1 }, 'mesa').agora).toMatch(/conduza/);
	});
});
