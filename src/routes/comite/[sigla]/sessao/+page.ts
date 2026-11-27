import { carregarIncidentes } from '#lib/crise.ts';
import { carregarOrdem } from '#lib/ordem.ts';
import { carregarSessao } from '#lib/sessao.ts';
import { supabase } from '#lib/supabase.ts';
import { lerAoVivo } from '#lib/tempo-real.ts';
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:sessao-ao-vivo');
	const { comite, participacoes } = await parent();
	const [dados, incidentes, ordem, blocos] = await Promise.all([
		carregarSessao(comite.id),
		carregarIncidentes(comite.id),
		carregarOrdem(comite.id),
		// Passo 67: os blocos do comitê, à vista na sessão (a mesma consulta da aba Blocos).
		lerAoVivo(`blocos-da-sessao:${comite.id}`, ['bloco', 'bloco_membro'], () =>
			supabase.from('bloco').select('id, nome, membros:bloco_membro(redator, delegacao(id, nome, bandeira))').eq('comite_id', comite.id).order('criado_em')
		)
	]);
	if (blocos.error) throw blocos.error;
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
	// Passo 59: para a delegação que preside, a sessão é o painel (ela conduz, vota e fala dali).
	const ehMesa = participacoes.some((p) => (p.papel === 'mesa' && p.comite_id === comite.id) || p.papel === 'secretaria');
	if (dados.podePresidir && !ehMesa) redirect(307, `/comite/${comite.sigla}/sessao/presidencia`);
	return { ...dados, votacoes: votacoes.data, incidentes, ordem, blocos: blocos.data };
};
