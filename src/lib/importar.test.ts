import { describe, expect, it } from 'vitest';
import { adivinharColunas, lerCsv, montarConvites, type Contexto } from './importar.ts';

const CSV = `Carimbo de data/hora,Nome completo,Endereço de e-mail,Comitê,País representado
2027-05-01 10:00,"Silva, Ana",ana@exemplo.test,CSNU-T,Brasil

2027-05-01 10:05,Beto,BETO@exemplo.test,conselho de segurança (teste),eua
2027-05-01 10:06,Caio,caio@exemplo,CSNU-T,Brasil
2027-05-01 10:07,Ana de novo,ana@exemplo.test,CSNU-T,Brasil
2027-05-01 10:08,Duda,duda@exemplo.test,XYZ,Brasil
2027-05-01 10:09,Eva,eva@exemplo.test,CSNU-T,Atlântida
2027-05-01 10:10,Fábio,fabio@exemplo.test,CSNU-T,Brasil
`;

const ctx: Contexto = {
	evento: 'e1',
	comites: [{ id: 'c1', sigla: 'CSNU-T', nome: 'Conselho de Segurança (teste)' }],
	delegacoes: [
		{ id: 'd1', nome: 'Brasil', comite_id: 'c1' },
		{ id: 'd2', nome: 'EUA', comite_id: 'c1' }
	],
	existentes: new Set(['fabio@exemplo.test|delegado|c1'])
};

describe('importação do CSV', () => {
	it('lê aspas, vírgulas dentro de campos e ignora linhas vazias', () => {
		const linhas = lerCsv(CSV);
		expect(linhas).toHaveLength(8);
		expect(linhas[1][1]).toBe('Silva, Ana');
		expect(lerCsv('a;b\r\n"x;y";"dito ""assim"""\r\n')).toEqual([
			['a', 'b'],
			['x;y', 'dito "assim"']
		]);
	});

	it('adivinha as colunas pelo cabeçalho do Google Forms', () => {
		expect(adivinharColunas(lerCsv(CSV)[0])).toEqual({ nome: 1, email: 2, papel: -1, comite: 3, delegacao: 4 });
	});

	it('monta os convites e aponta e-mails inválidos, repetidos e nomes desconhecidos', () => {
		const [cabecalho, ...linhas] = lerCsv(CSV);
		const { convites, problemas } = montarConvites(linhas, adivinharColunas(cabecalho), ctx);
		expect(convites).toEqual([
			{ email: 'ana@exemplo.test', nome: 'Silva, Ana', papel: 'delegado', evento_id: 'e1', comite_id: 'c1', delegacao_id: 'd1' },
			{ email: 'beto@exemplo.test', nome: 'Beto', papel: 'delegado', evento_id: 'e1', comite_id: 'c1', delegacao_id: 'd2' }
		]);
		expect(problemas.map((p) => p.mensagem)).toEqual([
			'e-mail inválido: "caio@exemplo"',
			'repetida no arquivo: ana@exemplo.test',
			'comitê desconhecido: "XYZ"',
			'delegação desconhecida em CSNU-T: "Atlântida"',
			'já convidado: fabio@exemplo.test'
		]);
	});
});
