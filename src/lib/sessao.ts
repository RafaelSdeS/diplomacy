import { error } from '@sveltejs/kit';
import { diferencaRelogio } from './cronometro.ts';
import type { Regras } from './regras.ts';
import { supabase } from './supabase.ts';
import { bilingue, t, traduzirMensagem } from './i18n.svelte.ts';

/** O comitê pela sigla; 404 se não existe ou a pessoa não participa do evento (RLS). */
export async function comitePorSigla(sigla: string) {
	const comite = await supabase
		.from('comite')
		.select('id, sigla, nome, topicos, guia_url, idioma, crise_ligada, tecnologia_restrita')
		.eq('sigla', sigla)
		.limit(1)
		.maybeSingle();
	if (comite.error) throw comite.error;
	if (!comite.data) error(404, 'Comitê não encontrado.');
	return comite.data;
}

/** Tudo o que as telas da sessão mostram: estado, listas, última votação, regras e permissão. */
export async function carregarSessao(comiteId: string) {
	const [estado, lista, delegacoes, regras, podePresidir, emVotacao] = await Promise.all([
		supabase
			.from('estado_sessao')
			.select(
				`forma, fase, etapa_plenaria, topico_atual, ordem_topicos, mesa_assumiu, tempo_fala_seg,
				cronometro_inicio, cronometro_duracao_seg, cronometro_pausado_restante_seg,
				orador:delegacao(id, nome, bandeira),
				sessao(id, numero, informal_min_usados,
					presidencia:delegacao!sessao_presidencia_delegacao_id_comite_id_fkey(id, nome, bandeira),
					presenca(delegacao_id, situacao),
					avisos:aviso_chegada(delegacao(id, nome, bandeira)),
					pedidos:pedido_fala(id, delegacao(id, nome, bandeira)),
					pontos:ponto_mocao(id, tipo, detalhe, status, topico, minutos, delegacao(id, nome), assinaturas:assinatura_mocao(delegacao_id)),
					votacoes:votacao(id, objeto, tipo, regra, aberta, a_favor, contra, abstencoes, necessario,
						aprovada, encerrada_em, nominal, partes, votos:voto(delegacao_id, escolha, registrado_pela_mesa),
						passes:passe(delegacao_id)))`
			)
			.eq('comite_id', comiteId)
			.eq('sessao.pedidos.situacao', 'aberto')
			.order('criado_em', { referencedTable: 'sessao.pedidos' })
			.order('criado_em', { referencedTable: 'sessao.pontos' })
			.order('criado_em', { referencedTable: 'sessao.votacoes', ascending: false })
			.limit(1, { referencedTable: 'sessao.votacoes' })
			.maybeSingle(),
		supabase
			.from('lista_oradores')
			.select('id, lado, ordem, falou, ponto_mocao_id, delegacao(id, nome, bandeira)')
			.eq('comite_id', comiteId)
			.order('ordem'),
		supabase.from('delegacao').select('id, nome, bandeira, situacao').eq('comite_id', comiteId).order('nome'),
		supabase.rpc('regras', { p_comite: comiteId }, { get: true }),
		supabase.rpc('pode_presidir', { p_comite: comiteId }, { get: true }),
		// Um projeto em votação fecha a sala (só divisão da questão e votação nominal).
		supabase.from('documento').select('id').eq('comite_id', comiteId).eq('status', 'em_votacao').limit(1)
	]);
	for (const r of [estado, lista, delegacoes, regras, podePresidir, emVotacao]) if (r.error) throw r.error;

	const sessao = estado.data?.sessao ?? null;
	return {
		estado: sessao ? estado.data : null, // sem sessão aberta
		// A fase vale para o comitê, com ou sem sessão aberta.
		fase: estado.data?.fase ?? 'plenaria',
		lista: lista.data ?? [],
		delegacoes: delegacoes.data ?? [],
		votacao: sessao?.votacoes[0] ?? null, // a mais recente da sessão
		regras: regras.data as Regras,
		podePresidir: podePresidir.data ?? false,
		salaFechada: (emVotacao.data?.length ?? 0) > 0
	};
}

export type DadosSessao = Awaited<ReturnType<typeof carregarSessao>>;

/** O resumo de uma sessão encerrada, como `resumo_sessao` devolve. */
export type ResumoSessao = {
	numero: number;
	inicio: string;
	fim: string;
	presentes: number;
	pontos: Record<string, number>;
	votacoes: { objeto: string; aprovada: boolean | null }[];
};

/** O resumo da última sessão encerrada do comitê (null se não houve nenhuma). */
export async function ultimaSessao(comiteId: string) {
	const ultima = await supabase
		.from('sessao')
		.select('id')
		.eq('comite_id', comiteId)
		.not('fim', 'is', null)
		.order('numero', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (ultima.error) throw ultima.error;
	if (!ultima.data) return null;
	const resumo = await supabase.rpc('resumo_sessao', { p_sessao: ultima.data.id }, { get: true });
	if (resumo.error) throw resumo.error;
	return resumo.data as ResumoSessao | null;
}

/** Diferença entre o relógio do servidor e o do aparelho, em ms (0 se falhar). */
export async function medirRelogio(): Promise<number> {
	const antes = Date.now();
	const { data, error } = await supabase.rpc('agora');
	return error ? 0 : diferencaRelogio(antes, data, Date.now());
}

/**
 * Mensagem para mostrar quando uma ação falha. As regras do banco já explicam o
 * motivo em português (exceções com código P0001, 42501, 22023, 23505, 23514, P0002);
 * o resto vira uma mensagem genérica.
 */
export function mensagemDeErro(erro: { code?: string; message?: string } | null, padrao = 'Não foi possível. Tente de novo.') {
	if (!erro) return '';
	return ['P0001', 'P0002', '42501', '22023', '23505', '23514'].includes(erro.code ?? '') && erro.message
		? traduzirMensagem(erro.message)
		: t(padrao);
}

export const FORMAS = bilingue({
	formal_formal: 'Formal-formal (lista de oradores)',
	formal_informal: 'Formal-informal',
	informal_informal: 'Informal-informal'
} as const);

export const PONTOS = bilingue({
	ponto_ordem: 'Ponto de ordem',
	ponto_duvida: 'Ponto de dúvida',
	privilegio_pessoal: 'Ponto de privilégio pessoal',
	topico_no_topo: 'Moção de introdução do tópico no topo da agenda',
	adiamento_debate: 'Moção de adiamento do debate',
	adiamento_sessao: 'Moção de adiamento da sessão',
	informal_informal: 'Moção de informal-informal',
	voto_desconfianca: 'Moção de não-confiança',
	divisao_questao: 'Moção de divisão da questão',
	votacao_nominal: 'Moção de votação nominal'
} as const);
export type TipoPonto = keyof typeof PONTOS;

/** Os pontos e moções em ordem em cada fase (o banco confere de novo). */
export function pontosEmOrdem(fase: string, etapa: string | null | undefined, salaFechada = false): TipoPonto[] {
	const pontos: TipoPonto[] = ['ponto_duvida', 'ponto_ordem', 'privilegio_pessoal'];
	// Durante a votação de um projeto, só a divisão da questão e a votação nominal.
	if (salaFechada) return [...pontos, 'divisao_questao', 'votacao_nominal'];
	if (fase === 'plenaria') return [...pontos, ...(etapa === 'topico' ? ['topico_no_topo' as const] : []), 'adiamento_sessao'];
	if (fase === 'debate') return [...pontos, 'informal_informal', 'adiamento_debate', 'adiamento_sessao', 'voto_desconfianca'];
	return pontos;
}

export const MOCOES_COM_LISTA: TipoPonto[] = ['topico_no_topo', 'adiamento_debate', 'divisao_questao'];
export const ehPonto = (tipo: string) => tipo.startsWith('ponto_') || tipo === 'privilegio_pessoal';

export const SITUACAO_PONTO = bilingue({
	aberto: 'Aguardando',
	em_discussao: 'Lista especial aberta',
	em_votacao: 'Em votação',
	aceito: 'Aceito',
	recusado: 'Recusado'
} as const);

/** O nome de uma moção com o detalhe que ela carrega (tópico ou minutos). */
export function descreverPonto(p: { tipo: string; topico?: number | null; minutos?: number | null }) {
	const nome = PONTOS[p.tipo as TipoPonto] ?? p.tipo;
	if (p.tipo === 'topico_no_topo' && p.topico) return `${nome}: ${t('tópico')} ${p.topico}`;
	if (p.tipo === 'informal_informal' && p.minutos) return `${nome}: ${p.minutos} ${t('minutos')}`;
	return nome;
}
