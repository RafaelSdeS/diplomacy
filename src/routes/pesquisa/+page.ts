import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { participacoes } = await parent();
	const evento = participacoes[0]?.evento_id ?? null;
	const respondida = evento
		? await supabase.from('pesquisa_respondida').select('evento_id').eq('evento_id', evento).maybeSingle()
		: { data: null, error: null };
	if (respondida.error) throw respondida.error;
	return { evento, jaRespondeu: !!respondida.data };
};
