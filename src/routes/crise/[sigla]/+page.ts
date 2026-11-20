import { comitePorSigla } from '#lib/sessao.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, depends }) => {
	depends('app:crise');
	const comite = await comitePorSigla(params.sigla);
	// A RLS só entrega as notas à equipe de crise do comitê (e à secretaria).
	const [notas, atualizacoes] = await Promise.all([
		supabase
			.from('nota_crise')
			.select('id, tipo, titulo, texto, status, resposta, criado_em, responsavel_id, delegacao(id, nome, bandeira)')
			.eq('comite_id', comite.id)
			.order('criado_em'),
		supabase.from('atualizacao_comite').select('atualizacao:atualizacao_crise(id, texto, publicada_em)').eq('comite_id', comite.id)
	]);
	if (notas.error) throw notas.error;
	if (atualizacoes.error) throw atualizacoes.error;
	return {
		comite,
		notas: notas.data,
		atualizacoes: atualizacoes.data
			.map((a) => a.atualizacao)
			.filter((a) => a !== null)
			.sort((a, b) => b.publicada_em.localeCompare(a.publicada_em))
	};
};
