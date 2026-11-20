import { carregarSessao, comitePorSigla } from '#lib/sessao.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, depends }) => {
	depends('app:sessao-ao-vivo');
	const comite = await comitePorSigla(params.sigla);
	return { comite, ...(await carregarSessao(comite.id)) };
};
