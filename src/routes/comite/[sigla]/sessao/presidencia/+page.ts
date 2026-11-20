import { carregarSessao } from '#lib/sessao.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:sessao-ao-vivo');
	const { comite } = await parent();
	const [sessao, projetos] = await Promise.all([
		carregarSessao(comite.id),
		// Os projetos que a mesa aprovou: esperam o consenso ou a votação.
		supabase
			.from('documento')
			.select('id, tipo, numero, titulo, status, aprovacao')
			.eq('comite_id', comite.id)
			.neq('tipo', 'working_paper')
			.in('status', ['aprovado_mesa', 'em_votacao', 'aprovado', 'rejeitado'])
			.order('numero')
	]);
	if (projetos.error) throw projetos.error;
	return { ...sessao, projetos: projetos.data };
};
