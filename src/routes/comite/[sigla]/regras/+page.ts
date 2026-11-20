import { supabase } from '#lib/supabase.ts';
import type { Regras } from '#lib/regras.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { comite } = await parent();
	const [regras, quorum, previstas] = await Promise.all([
		supabase.rpc('regras', { p_comite: comite.id }),
		supabase.rpc('quorum', { p_comite: comite.id }),
		supabase
			.from('delegacao')
			.select('id', { count: 'exact', head: true })
			.eq('comite_id', comite.id)
			.neq('situacao', 'suspensa')
	]);
	if (regras.error) throw regras.error;
	if (quorum.error) throw quorum.error;
	if (previstas.error) throw previstas.error;

	// O banco valida as regras gravadas e completa as que faltam com as do guia.
	return { regras: regras.data as Regras, quorum: quorum.data, previstas: previstas.count ?? 0 };
};
