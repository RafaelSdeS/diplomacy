import { describe, expect, it } from 'vitest';
import { trilha } from './trilha.ts';

const hrefs = (rota: string, params: Record<string, string> = { sigla: 'UNOCT' }, data = {}) =>
	trilha(rota, params, data).map((e) => e.href);

describe('trilha', () => {
	it('subtelas do comitê voltam ao comitê, com a sigla como rótulo', () => {
		expect(hrefs('/comite/[sigla]/regras')).toEqual(['/comite/UNOCT']);
		expect(hrefs('/comite/[sigla]/delegacao/[id]')).toEqual(['/comite/UNOCT']);
		expect(trilha('/comite/[sigla]/votacoes', { sigla: 'UNOCT' }, {})[0].rotulo).toBe('UNOCT');
	});
	it('telas da sessão passam pela sessão', () => {
		expect(hrefs('/comite/[sigla]/sessao/presidencia')).toEqual(['/comite/UNOCT', '/comite/UNOCT/sessao']);
		expect(hrefs('/comite/[sigla]/sessao/agenda')).toEqual(['/comite/UNOCT', '/comite/UNOCT/sessao']);
	});
	it('para a mesa, as telas da sessão ficam sob o Painel (passo 43)', () => {
		const mesa = (rota: string) => trilha(rota, { sigla: 'UNOCT' }, {}, true).map((e) => e.href);
		expect(mesa('/comite/[sigla]/sessao/chamada')).toEqual(['/comite/UNOCT', '/comite/UNOCT/sessao/presidencia']);
		expect(mesa('/comite/[sigla]/sessao/agenda')).toEqual(['/comite/UNOCT', '/comite/UNOCT/sessao/presidencia']);
		expect(mesa('/comite/[sigla]/sessao/presidencia')).toEqual(['/comite/UNOCT']);
	});
	it('o documento usa o comitê carregado', () => {
		expect(hrefs('/documento/[id]', { id: 'x' }, { comite: { sigla: 'CSNU' } })).toEqual(['/comite/CSNU', '/comite/CSNU/blocos']);
	});
	it('press, secretaria e perfil voltam à tela do menu', () => {
		expect(hrefs('/press/escrever', {})).toEqual(['/press']);
		expect(hrefs('/secretaria/checkin', {})).toEqual(['/secretaria/participantes']);
		expect(hrefs('/perfil/meus-dados', {})).toEqual(['/perfil']);
	});
	it('telas do menu não têm trilha', () => {
		for (const rota of ['/', '/comite/[sigla]', '/comite/[sigla]/sessao', '/press', '/cronograma', '/secretaria/participantes', '/crise/[sigla]'])
			expect(hrefs(rota)).toEqual([]);
	});
});
