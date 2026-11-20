import { eventoDaSecretaria } from '#lib/secretaria.ts';
import { supabase, todasAsLinhas } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const evento = eventoDaSecretaria((await parent()).participacoes);
	const [convites, comites] = await Promise.all([
		todasAsLinhas((de, ate) =>
			supabase
				.from('convite')
				.select('email, nome, papel, comite_id, comite(sigla), delegacao(nome, bandeira)')
				.eq('evento_id', evento)
				.order('id')
				.range(de, ate)
		),
		supabase.from('comite').select('id, sigla').eq('evento_id', evento).order('sigla')
	]);
	if (comites.error) throw comites.error;
	return { evento, convites, comites: comites.data };
};
