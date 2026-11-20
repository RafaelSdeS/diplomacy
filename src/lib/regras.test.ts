import { describe, expect, it } from 'vitest';
import { regrasLegiveis, type Regras } from './regras.ts';

// Os padrões do Guia de Regras (como em regras_do_guia() no banco).
const GUIA: Regras = {
	quorum_fracao: [1, 3],
	informal_informal_max_min: 45,
	aviso_fala_seg: 10,
	limite_notas_pendentes: 2,
	votacao_substantiva: 'maioria_simples',
	membros_permanentes: [],
	max_sessoes_presidencia: 2,
	assinaturas_projeto_min: 5,
	assinaturas_emenda: 3,
	assinaturas_desconfianca_fracao: [1, 5],
	reabrir_clausula_min_delegacoes: 3,
	dpos_publicos: false,
	mesa_le_bilhetes: false,
	press_revisao: false
};

const texto = (r: Regras, rotulo: string) => regrasLegiveis(r).find((x) => x.rotulo === rotulo)?.texto;

describe('regrasLegiveis', () => {
	it('escreve as regras do guia por extenso', () => {
		expect(texto(GUIA, 'Informal-informal')).toBe('até 45 minutos por sessão');
		expect(texto(GUIA, 'Quórum')).toBe('1/3 das delegações previstas');
		expect(texto(GUIA, 'Aviso de tempo')).toBe('10 segundos antes do fim da fala');
		expect(texto(GUIA, 'Projeto de resolução')).toBe('no mínimo 5 signatários; uma resolução por tópico');
		expect(texto(GUIA, 'Não-confiança')).toBe('pedido assinado por 1/5 das delegações previstas e maioria simples');
		expect(texto(GUIA, 'Presidência da sessão')).toMatch(/^delegação sorteada, no máximo 2 sessões/);
		expect(texto(GUIA, 'Emenda')).toBe('assinada por 3 delegações');
		expect(texto(GUIA, 'Votação substantiva')).toMatch(/^maioria simples/);
		expect(texto(GUIA, 'Press')).toBe('publica sem revisão prévia');
	});

	it('usa o singular quando é um só', () => {
		const r = { ...GUIA, informal_informal_max_min: 1, assinaturas_emenda: 1, limite_notas_pendentes: 1 };
		expect(texto(r, 'Informal-informal')).toBe('até 1 minuto por sessão');
		expect(texto(r, 'Emenda')).toBe('assinada por 1 delegação');
		expect(texto(r, 'Notas de crise pendentes')).toBe('até 1 nota por delegação');
	});

	it('no CSNU, lista os membros permanentes em ordem alfabética', () => {
		const csnu: Regras = {
			...GUIA,
			votacao_substantiva: 'csnu',
			membros_permanentes: ['Rússia', 'China', 'Reino Unido', 'EUA', 'França']
		};
		expect(texto(csnu, 'Votação substantiva')).toBe(
			'9 votos a favor, sem voto contra de membro permanente (China, EUA, França, Reino Unido e Rússia)'
		);
	});

	it('mostra a unanimidade e as opções ligadas', () => {
		const r: Regras = { ...GUIA, votacao_substantiva: 'unanimidade', dpos_publicos: true, press_revisao: true };
		expect(texto(r, 'Votação substantiva')).toBe('unanimidade');
		expect(texto(r, 'DPOs')).toBe('públicos para o comitê');
		expect(texto(r, 'Press')).toBe('notícias revisadas pela Diretoria da Press');
	});

	it('tem uma linha para cada regra', () => {
		expect(regrasLegiveis(GUIA)).toHaveLength(15);
	});
});
