import { carregarSessao } from '#lib/sessao.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:sessao-ao-vivo');
	const { comite } = await parent();
	return carregarSessao(comite.id);
};
