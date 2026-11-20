import { carregarSessao, comitePorSigla } from '#lib/sessao.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, depends }) => {
	depends('app:sessao-ao-vivo');
	const comite = await comitePorSigla(params.sigla);
	const [sessao, plantoes] = await Promise.all([
		carregarSessao(comite.id),
		supabase.from('atualizacao_comite').select('atualizacao:atualizacao_crise(id, texto, publicada_em)').eq('comite_id', comite.id)
	]);
	if (plantoes.error) throw plantoes.error;
	// A atualização de crise mais recente vira plantão no telão.
	const plantao = plantoes.data
		.map((p) => p.atualizacao)
		.filter((a) => a !== null)
		.sort((a, b) => b.publicada_em.localeCompare(a.publicada_em))[0] ?? null;
	return { comite, ...sessao, plantao };
};
