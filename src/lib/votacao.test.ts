import { describe, expect, it } from 'vitest';
import { agruparVotos, assinaturasDesconfianca, escolhasPermitidas, escreverEsboco, lerEsboco, listaAtiva, presidenciaEmVigor, proximoDaLista, textoResultado } from './votacao.ts';

describe('escolhasPermitidas', () => {
	it('questão procedimental: só a favor ou contra, e observadora vota', () => {
		expect(escolhasPermitidas('procedimental', 'membro', 'presente')).toEqual(['a_favor', 'contra']);
		expect(escolhasPermitidas('procedimental', 'observadora', 'presente')).toEqual(['a_favor', 'contra']);
	});
	it('questão substantiva: com abstenção para quem está presente', () => {
		expect(escolhasPermitidas('substantiva', 'membro', 'presente')).toEqual(['a_favor', 'contra', 'abstencao']);
	});
	it('observadora na substantiva, suspensa e ausente não votam', () => {
		expect(escolhasPermitidas('substantiva', 'observadora', 'presente')).toEqual([]);
		expect(escolhasPermitidas('procedimental', 'suspensa', 'presente')).toEqual([]);
		expect(escolhasPermitidas('procedimental', 'membro', null)).toEqual([]);
	});
});

it('textoResultado diz o resultado por extenso, sem depender de cor', () => {
	expect(textoResultado({ a_favor: 4, contra: 1, abstencoes: 0, necessario: 4, aprovada: true })).toBe(
		'Aprovada: 4 a favor, 1 contra e 0 abstenções (4 votos necessários)'
	);
	expect(textoResultado({ a_favor: 1, contra: 1, abstencoes: 1, necessario: 2, aprovada: false })).toBe(
		'Rejeitada: 1 a favor, 1 contra e 1 abstenção (2 votos necessários)'
	);
});

it('presidenciaEmVigor: o bureau preside fora do debate e quando assume', () => {
	expect(presidenciaEmVigor('debate', false, 'EUA')).toBe('EUA');
	expect(presidenciaEmVigor('plenaria', false, 'EUA')).toBe('Mesa');
	expect(presidenciaEmVigor('acao', false, 'EUA')).toBe('Mesa');
	expect(presidenciaEmVigor('debate', true, 'EUA')).toBe('Mesa');
	expect(presidenciaEmVigor('debate', false, null)).toBe('Mesa');
});

describe('listas de oradores', () => {
	const lista = [
		{ ponto_mocao_id: null, falou: true, lado: null, ordem: 1 },
		{ ponto_mocao_id: null, falou: false, lado: null, ordem: 2 },
		{ ponto_mocao_id: 'm1', falou: false, lado: 'contra', ordem: 2 },
		{ ponto_mocao_id: 'm1', falou: false, lado: 'a_favor', ordem: 1 }
	];
	it('a lista especial da moção em discussão vem primeiro; na plenária, a dos discursos', () => {
		expect(listaAtiva(lista, 'm1', 'plenaria')).toHaveLength(2);
		expect(listaAtiva(lista, null, 'plenaria').map((i) => i.ordem)).toEqual([1, 2]);
		expect(listaAtiva(lista, null, 'debate')).toEqual([]);
	});
	it('o próximo é o primeiro que ainda não falou', () => {
		expect(proximoDaLista(listaAtiva(lista, null, 'plenaria'))?.ordem).toBe(2);
		expect(proximoDaLista(listaAtiva(lista, 'm1', 'debate'))?.lado).toBe('a_favor');
	});
});

describe('esboço da agenda', () => {
	it('cada dois espaços ou um traço descem um nível, até 2', () => {
		expect(lerEsboco('A. Causas\n  A.1 Financiamento\n- A.2 Fronteiras\n      fundo\n\nB. Respostas')).toEqual([
			{ texto: 'A. Causas', nivel: 0 },
			{ texto: 'A.1 Financiamento', nivel: 1 },
			{ texto: 'A.2 Fronteiras', nivel: 1 },
			{ texto: 'fundo', nivel: 2 },
			{ texto: 'B. Respostas', nivel: 0 }
		]);
	});
	it('escreverEsboco volta ao texto', () => {
		const itens = lerEsboco('A\n  A.1\n    A.1.a');
		expect(lerEsboco(escreverEsboco(itens))).toEqual(itens);
	});
});

describe('assinaturas da não-confiança', () => {
	it('pede 1/5 das delegações previstas, arredondado para cima, sem as suspensas', () => {
		const comite = (n: number, suspensas = 0) =>
			Array.from({ length: n }, (_, i) => ({ situacao: i < suspensas ? 'suspensa' : 'membro' }));
		expect(assinaturasDesconfianca([1, 5], comite(15))).toBe(3);
		expect(assinaturasDesconfianca([1, 5], comite(16))).toBe(4);
		expect(assinaturasDesconfianca([1, 5], comite(16, 1))).toBe(3);
	});
});

describe('agruparVotos', () => {
	const d = (id: string, nome: string, situacao = 'membro') => ({ id, nome, bandeira: null, situacao });
	const delegacoes = [d('1', 'Uruguai'), d('2', 'Argentina'), d('3', 'Chile'), d('4', 'Espanha', 'observadora'), d('5', 'Cuba', 'suspensa'), d('6', 'Peru')];
	const presentes = new Set(['1', '2', '3', '4', '5']);
	const votos = [
		{ delegacao_id: '1', escolha: 'a_favor' as const },
		{ delegacao_id: '2', escolha: 'a_favor' as const },
		{ delegacao_id: '3', escolha: 'contra' as const }
	];
	const nomes = (g: { nome: string }[]) => g.map((x) => x.nome);

	it('separa os votos em ordem alfabética', () => {
		const g = agruparVotos(delegacoes, votos, 'procedimental', presentes);
		expect(nomes(g.a_favor)).toEqual(['Argentina', 'Uruguai']);
		expect(nomes(g.contra)).toEqual(['Chile']);
		expect(g.abstencao).toEqual([]);
	});
	it('"sem voto" só tem quem podia votar: presente, não suspensa e, na substantiva, membro', () => {
		expect(nomes(agruparVotos(delegacoes, votos, 'procedimental', presentes).sem_voto)).toEqual(['Espanha']);
		expect(agruparVotos(delegacoes, votos, 'substantiva', presentes).sem_voto).toEqual([]);
	});
});
