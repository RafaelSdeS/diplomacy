import { eventoDaSecretaria } from '#lib/secretaria.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const evento = eventoDaSecretaria((await parent()).participacoes);
	const [comites, delegacoes, convites] = await Promise.all([
		supabase.from('comite').select('id, sigla, nome').eq('evento_id', evento).order('sigla'),
		supabase.from('delegacao').select('id, nome, comite_id, comite!inner(evento_id)').eq('comite.evento_id', evento),
		supabase.from('convite').select('email, papel, comite_id').eq('evento_id', evento)
	]);
	for (const r of [comites, delegacoes, convites]) if (r.error) throw r.error;
	return {
		evento,
		comites: comites.data!,
		delegacoes: delegacoes.data!.map(({ id, nome, comite_id }) => ({ id, nome, comite_id })),
		existentes: new Set(convites.data!.map((c) => `${c.email.toLowerCase()}|${c.papel}|${c.comite_id ?? ''}`))
	};
};
