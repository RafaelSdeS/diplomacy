import { error } from '@sveltejs/kit';
import { supabase } from '#lib/supabase.ts';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ params }) => {
	// A RLS só devolve comitês dos eventos de que a pessoa participa.
	const comite = await supabase
		.from('comite')
		.select('id, sigla, nome, topicos, guia_url, idioma')
		.eq('sigla', params.sigla)
		.limit(1)
		.maybeSingle();
	if (comite.error) throw comite.error;
	if (!comite.data) error(404, 'Comitê não encontrado.');
	return { comite: comite.data };
};
