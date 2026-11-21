import { carregarIncidentes } from '#lib/crise.ts';
import { carregarSessao } from '#lib/sessao.ts';
import { supabase } from '#lib/supabase.ts';
import { lerAoVivo } from '#lib/tempo-real.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:sessao-ao-vivo');
	const { comite } = await parent();
	const [dados, incidentes] = await Promise.all([carregarSessao(comite.id), carregarIncidentes(comite.id)]);
	// As votações encerradas desta sessão, com os votos de cada delegação (passo 23).
	const sessao = dados.estado?.sessao?.id;
	const votacoes = sessao
		? await lerAoVivo(`votacoes-encerradas:${sessao}`, ['votacao', 'voto'], () =>
				supabase
					.from('votacao')
					.select('id, objeto, tipo, regra, aprovada, a_favor, contra, abstencoes, necessario, votos:voto(delegacao_id, escolha)')
					.eq('sessao_id', sessao)
					.not('encerrada_em', 'is', null)
					.order('encerrada_em', { ascending: false })
			)
		: { data: [], error: null };
	if (votacoes.error) throw votacoes.error;
	return { ...dados, votacoes: votacoes.data, incidentes };
};
