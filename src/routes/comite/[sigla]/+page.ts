import { error } from '@sveltejs/kit';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	// A RLS só devolve comitês dos eventos de que a pessoa participa.
	const comite = await supabase
		.from('comite')
		.select('id, sigla, nome, topicos, guia_url, idioma')
		.eq('sigla', params.sigla)
		.limit(1)
		.maybeSingle();
	if (comite.error) throw comite.error;
	if (!comite.data) error(404, 'Comitê não encontrado.');

	const [delegacoes, mesa] = await Promise.all([
		supabase
			.from('delegacao')
			.select('id, nome, nome_oficial, bandeira, situacao')
			.eq('comite_id', comite.data.id)
			.order('nome'),
		supabase.from('participacao').select('id, pessoa(nome)').eq('comite_id', comite.data.id).eq('papel', 'mesa')
	]);
	if (delegacoes.error) throw delegacoes.error;
	if (mesa.error) throw mesa.error;

	return { comite: comite.data, delegacoes: delegacoes.data, mesa: mesa.data };
};
