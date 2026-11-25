import { carregarOrdem } from '#lib/ordem.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:agenda');
	const { comite } = await parent();
	const [estado, propostas, podePresidir, ordem, alteracoes, delegacoes] = await Promise.all([
		supabase.from('estado_sessao').select('fase, topico_atual, ordem_topicos').eq('comite_id', comite.id).maybeSingle(),
		supabase
			.from('proposta_agenda')
			.select('id, topico, adotada, liberada, delegacao(id, nome, bandeira), pontos:ponto_pauta(id, pai_id, texto, ordem, status)')
			.eq('comite_id', comite.id)
			.order('adotada', { ascending: false })
			.order('criado_em')
			.order('ordem', { referencedTable: 'pontos' }),
		supabase.rpc('pode_presidir', { p_comite: comite.id }, { get: true }),
		carregarOrdem(comite.id),
		// Passo 60: as alterações propostas na agenda do bureau, com as posições de cada delegação.
		supabase
			.from('alteracao_agenda')
			.select('id, proposta_id, acao, ponto_id, depois_de, dentro, texto, motivo, status, delegacao(id, nome, bandeira), posicoes:posicao_alteracao(delegacao_id, posicao)')
			.eq('comite_id', comite.id)
			.order('criado_em'),
		supabase.from('delegacao').select('id', { count: 'exact', head: true }).eq('comite_id', comite.id)
	]);
	if (alteracoes.error) throw alteracoes.error;
	if (estado.error) throw estado.error;
	if (propostas.error) throw propostas.error;
	if (podePresidir.error) throw podePresidir.error;

	// Os tópicos na ordem decidida pela moção do tópico no topo (ou na ordem do guia).
	const sequencia = estado.data?.ordem_topicos ?? comite.topicos.map((_, i) => i + 1);
	return {
		topicos: sequencia.map((n) => ({ numero: n, titulo: comite.topicos[n - 1] })),
		topicoAtual: estado.data?.topico_atual ?? null,
		propostas: propostas.data,
		podePresidir: podePresidir.data ?? false,
		ordem,
		alteracoes: alteracoes.data,
		totalDelegacoes: delegacoes.count ?? 0
	};
};
