import { describe, expect, it } from 'vitest';
import { ETAPAS, estadoDaEtapa, etapaAtual, ROTULO_ETAPA } from './ordem.ts';

const wp = (status = 'rascunho') => ({ tipo: 'working_paper', status, topico: 1 });
const projeto = (status = 'rascunho') => ({ tipo: 'projeto', status, topico: 1 });

describe('etapaAtual', () => {
	it('segue agenda → working papers → projeto → fase de ação → resolução', () => {
		expect(etapaAtual({ adotada: false, documentos: [] })).toBe('agenda');
		expect(etapaAtual({ adotada: true, documentos: [] })).toBe('working_papers');
		expect(etapaAtual({ adotada: true, documentos: [wp('aprovado_mesa')] })).toBe('working_papers');
		expect(etapaAtual({ adotada: true, documentos: [wp(), projeto('enviado')] })).toBe('projeto');
		expect(etapaAtual({ adotada: true, documentos: [projeto('em_votacao')] })).toBe('acao');
		expect(etapaAtual({ adotada: true, documentos: [projeto('rejeitado'), projeto('aprovado')] })).toBe('encerrado');
		// Passo 63: rejeitado, o tópico volta aos working papers.
		expect(etapaAtual({ adotada: true, documentos: [wp(), projeto('rejeitado')] })).toBe('working_papers');
	});
	it('marca as etapas antes da atual como feitas', () => {
		expect(estadoDaEtapa('agenda', 'projeto')).toBe('feita');
		expect(estadoDaEtapa('projeto', 'projeto')).toBe('atual');
		expect(estadoDaEtapa('resolucao', 'projeto')).toBe('depois');
		expect(estadoDaEtapa('resolucao', 'encerrado')).toBe('feita');
	});
	it('tem as cinco etapas com nome (passo 62, lote 5)', () => {
		expect(ETAPAS.map((e) => ROTULO_ETAPA()[e])).toEqual(['Agenda', 'Working papers', 'Projeto', 'Fase de ação', 'Resolução']);
	});
});
