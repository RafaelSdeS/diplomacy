import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

// Passo 23: todas as votações encerradas do comitê, com o voto de cada delegação.
export const load: PageLoad = async ({ parent }) => {
	const { comite } = await parent();
	const [votacoes, delegacoes] = await Promise.all([
		supabase
			.from('votacao')
			.select(
				'id, objeto, tipo, regra, aprovada, a_favor, contra, abstencoes, necessario, encerrada_em, sessao(numero, presenca(delegacao_id)), votos:voto(delegacao_id, escolha)'
			)
			.eq('comite_id', comite.id)
			.not('encerrada_em', 'is', null)
			.order('encerrada_em', { ascending: false }),
		supabase.from('delegacao').select('id, nome, bandeira, situacao').eq('comite_id', comite.id)
	]);
	if (votacoes.error) throw votacoes.error;
	if (delegacoes.error) throw delegacoes.error;

	// Agrupadas por sessão, a mais recente primeiro.
	const porSessao = new Map<number, typeof votacoes.data>();
	for (const v of votacoes.data) {
		const n = v.sessao?.numero ?? 0;
		porSessao.set(n, [...(porSessao.get(n) ?? []), v]);
	}
	return { sessoes: [...porSessao], delegacoes: delegacoes.data };
};
