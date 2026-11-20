import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:cronograma');
	const { participacoes } = await parent();

	const [itens, comites] = await Promise.all([
		supabase.from('cronograma_item').select('id, titulo, local, inicio, fim, comite_id').order('inicio'),
		supabase.from('comite').select('id, sigla').order('sigla')
	]);
	if (itens.error) throw itens.error;
	if (comites.error) throw comites.error;

	const secretaria = participacoes.find((p) => p.papel === 'secretaria');
	return { itens: itens.data, comites: comites.data, eventoDaSecretaria: secretaria?.evento_id ?? null };
};
