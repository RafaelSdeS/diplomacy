import { error } from '@sveltejs/kit';
import { comitePorSigla } from '#lib/sessao.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

// Passo 65: a ata de uma sessão, só para a mesa (e a secretaria). ?sessao=N; sem ele, a última.
// Traz o que o banco registra com hora: presença, pontos e moções, votações e as propostas
// decididas nos working papers. As falas não são registradas (decisão de 27/11/2026).
export const load: PageLoad = async ({ params, url, parent }) => {
	const comite = await comitePorSigla(params.sigla);
	const { participacoes } = await parent();
	if (!participacoes.some((p) => p.papel === 'secretaria' || (p.papel === 'mesa' && p.comite_id === comite.id)))
		error(403, 'A ata da sessão é da mesa.');

	const sessoes = await supabase.from('sessao').select('id, numero, inicio, fim, presidencia_delegacao_id').eq('comite_id', comite.id).order('numero');
	if (sessoes.error) throw sessoes.error;
	const numero = Number(url.searchParams.get('sessao'));
	const sessao = sessoes.data.find((s) => s.numero === numero) ?? sessoes.data.at(-1);
	const base = { sigla: comite.sigla, nome: comite.nome, sessoes: sessoes.data.map((s) => s.numero) };
	if (!sessao) return { ...base, ata: null };

	const [delegacoes, presenca, pontos, votacoes, propostas] = await Promise.all([
		supabase.from('delegacao').select('id, nome, bandeira, situacao').eq('comite_id', comite.id).order('nome'),
		supabase.from('presenca').select('delegacao_id, situacao, marcada_em').eq('sessao_id', sessao.id),
		supabase
			.from('ponto_mocao')
			.select('id, tipo, topico, minutos, status, motivo, aprovado_bureau, criado_em, delegacao(nome)')
			.eq('sessao_id', sessao.id)
			.order('criado_em'),
		supabase
			.from('votacao')
			.select('id, objeto, tipo, nominal, aprovada, a_favor, contra, abstencoes, necessario, encerrada_em, votos:voto(delegacao_id, escolha)')
			.eq('sessao_id', sessao.id)
			.not('encerrada_em', 'is', null)
			.order('encerrada_em'),
		supabase
			.from('proposta_alteracao')
			.select('id, acao, texto_novo, status, decidida_em, documento(titulo), delegacao(nome), clausula!clausula_id(texto)')
			.eq('comite_id', comite.id)
			.gte('decidida_em', sessao.inicio)
			.lte('decidida_em', sessao.fim ?? new Date().toISOString())
			.order('decidida_em')
	]);
	for (const r of [delegacoes, presenca, pontos, votacoes, propostas]) if (r.error) throw r.error;

	return {
		...base,
		ata: {
			sessao,
			delegacoes: delegacoes.data!,
			presenca: presenca.data!,
			pontos: pontos.data!,
			votacoes: votacoes.data!,
			propostas: propostas.data!
		}
	};
};
