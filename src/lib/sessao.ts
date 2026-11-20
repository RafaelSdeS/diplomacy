import { error } from '@sveltejs/kit';
import { diferencaRelogio } from './cronometro.ts';
import type { Regras } from './regras.ts';
import { supabase } from './supabase.ts';

/** O comitê pela sigla; 404 se não existe ou a pessoa não participa do evento (RLS). */
export async function comitePorSigla(sigla: string) {
	const comite = await supabase
		.from('comite')
		.select('id, sigla, nome, topicos, guia_url, idioma')
		.eq('sigla', sigla)
		.limit(1)
		.maybeSingle();
	if (comite.error) throw comite.error;
	if (!comite.data) error(404, 'Comitê não encontrado.');
	return comite.data;
}

/** Tudo o que as telas da sessão mostram, numa ida ao banco (mais regras e permissão). */
export async function carregarSessao(comiteId: string) {
	const [estado, regras, podePresidir] = await Promise.all([
		supabase
			.from('estado_sessao')
			.select(
				`forma, tempo_fala_seg, cronometro_inicio, cronometro_duracao_seg, cronometro_pausado_restante_seg,
				orador:delegacao(id, nome, bandeira),
				sessao(id, numero, de_votacao,
					presidencia:delegacao!sessao_presidencia_delegacao_id_comite_id_fkey(id, nome, bandeira),
					pedidos:pedido_fala(id, delegacao(id, nome, bandeira)),
					pontos:ponto_mocao(id, tipo, detalhe, status, delegacao(id, nome)))`
			)
			.eq('comite_id', comiteId)
			.eq('sessao.pedidos.situacao', 'aberto')
			.order('criado_em', { referencedTable: 'sessao.pedidos' })
			.order('criado_em', { referencedTable: 'sessao.pontos' })
			.maybeSingle(),
		supabase.rpc('regras', { p_comite: comiteId }),
		supabase.rpc('pode_presidir', { p_comite: comiteId })
	]);
	if (estado.error) throw estado.error;
	if (regras.error) throw regras.error;
	if (podePresidir.error) throw podePresidir.error;

	return {
		estado: estado.data?.sessao ? estado.data : null, // sem sessão aberta
		regras: regras.data as Regras,
		podePresidir: podePresidir.data
	};
}

export type DadosSessao = Awaited<ReturnType<typeof carregarSessao>>;

/** Diferença entre o relógio do servidor e o do aparelho, em ms (0 se falhar). */
export async function medirRelogio(): Promise<number> {
	const antes = Date.now();
	const { data, error } = await supabase.rpc('agora');
	return error ? 0 : diferencaRelogio(antes, data, Date.now());
}

export const FORMAS = {
	formal_formal: 'Debate formal',
	formal_informal: 'Formal-informal (moderado)',
	informal_informal: 'Informal-informal'
} as const;

export const PONTOS = {
	ponto_ordem: 'Ponto de ordem',
	ponto_duvida: 'Ponto de dúvida',
	privilegio_pessoal: 'Ponto de privilégio pessoal',
	formal_informal: 'Moção de formal-informal',
	informal_informal: 'Moção de informal-informal',
	suspensao_sessao: 'Moção de suspensão da sessão',
	adiamento_sessao: 'Moção de adiamento da sessão',
	encerramento_debate: 'Moção de encerramento do debate',
	voto_desconfianca: 'Moção de voto de desconfiança'
} as const;

export const SITUACAO_PONTO = { aberto: 'Aguardando', aceito: 'Aceito', recusado: 'Recusado' } as const;
