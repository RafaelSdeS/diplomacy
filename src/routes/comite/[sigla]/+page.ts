import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { comite } = await parent();
	const [delegacoes, mesa] = await Promise.all([
		supabase
			.from('delegacao')
			.select('id, nome, nome_oficial, bandeira, situacao')
			.eq('comite_id', comite.id)
			.order('nome'),
		supabase.from('participacao').select('id, pessoa(nome)').eq('comite_id', comite.id).eq('papel', 'mesa')
	]);
	if (delegacoes.error) throw delegacoes.error;
	if (mesa.error) throw mesa.error;

	return { delegacoes: delegacoes.data, mesa: mesa.data };
};
