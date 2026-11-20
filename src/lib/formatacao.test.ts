import { describe, expect, it } from 'vitest';
import { formatarDocumento, linhaDeSignatarios, pontuar } from './formatacao.ts';
import { sugerirVerbos } from './verbos.ts';

const c = (id: string, tipo: string, ordem: number, texto: string, pai_id: string | null = null) => ({
	id,
	tipo,
	ordem,
	texto,
	pai_id
});

describe('formatarDocumento', () => {
	const doc = formatarDocumento(
		[
			c('o2', 'operativa', 4, 'Decide criar um fundo'),
			c('p1', 'preambular', 1, 'Recordando a resolução 2178,'),
			c('o1', 'operativa', 2, 'Pede aos Estados-membros'),
			c('s1', 'subitem', 3, 'que cooperem', 'o1'),
			c('s2', 'subitem', 3.5, 'que informem.', 'o1'),
			c('s3', 'subitem', 5, 'com recursos próprios', 'o2'),
			c('s4', 'subitem', 6, 'e doações', 'o2')
		],
		{ nome_oficial: 'The United Nations Office of Counter-Terrorism', idioma: 'en' },
		['French Republic', 'Federative Republic of Brazil']
	);

	it('preambulares com ponto e vírgula e a linha do comitê com dois-pontos', () => {
		expect(doc.preambulares).toEqual([{ id: 'p1', texto: 'Recordando a resolução 2178;' }]);
		expect(doc.linhaDoComite).toBe('The United Nations Office of Counter-Terrorism:');
	});

	it('operativas numeradas pela ordem; subitens com letras; a última termina com ponto', () => {
		expect(doc.operativas.map((o) => `${o.numero}. ${o.texto}`)).toEqual([
			'1. Pede aos Estados-membros:',
			'2. Decide criar um fundo:'
		]);
		expect(doc.operativas[0].subitens.map((s) => `${s.letra}) ${s.texto}`)).toEqual(['a) que cooperem;', 'b) que informem;']);
		expect(doc.operativas[1].subitens.map((s) => `${s.letra}) ${s.texto}`)).toEqual([
			'a) com recursos próprios;',
			'b) e doações.'
		]);
	});

	it('sem subitens, a última operativa termina com ponto e as outras com ponto e vírgula', () => {
		const simples = formatarDocumento(
			[c('a', 'operativa', 1, 'Pede'), c('b', 'operativa', 2, 'Decide;')],
			{ nome_oficial: 'O Conselho de Segurança', idioma: 'pt' },
			[]
		);
		expect(simples.operativas.map((o) => o.texto)).toEqual(['Pede;', 'Decide.']);
		expect(simples.linhaDoComite).toBe('O Conselho de Segurança:');
		expect(simples.signatarios).toBe('');
	});

	it('signatários com o nome oficial, em ordem alfabética, em português e em inglês', () => {
		expect(doc.signatarios).toBe('Signatories: Federative Republic of Brazil and French Republic.');
		expect(linhaDeSignatarios(['República Francesa', 'Japão', 'Estado da Palestina'], 'pt')).toBe(
			'Signatários: Estado da Palestina, Japão e República Francesa.'
		);
	});

	it('pontuar troca a pontuação final', () => {
		expect(pontuar('Texto,  ', ';')).toBe('Texto;');
		expect(pontuar('Texto.;', '.')).toBe('Texto.');
	});
});

describe('sugerirVerbos', () => {
	it('sugere a partir das primeiras letras, sem acento nem maiúscula', () => {
		expect(sugerirVerbos('rec', 'preambular', 'pt')).toEqual(['Reconhecendo', 'Recordando']);
		expect(sugerirVerbos('urg', 'operativa', 'en')).toEqual(['Urges']);
		expect(sugerirVerbos('ACO', 'operativa', 'pt')).toEqual(['Acolhe']);
	});
	it('não sugere sem texto, para texto livre ou quando o verbo já está completo', () => {
		expect(sugerirVerbos('', 'operativa', 'pt')).toEqual([]);
		expect(sugerirVerbos('rec', 'texto', 'pt')).toEqual([]);
		expect(sugerirVerbos('Decide', 'operativa', 'pt')).toEqual([]);
	});
});
