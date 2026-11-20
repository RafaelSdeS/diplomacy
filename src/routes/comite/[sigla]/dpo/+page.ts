import type { Regras } from '#lib/regras.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:dpo');
	const { comite } = await parent();
	// A RLS mostra o DPO da própria delegação, todos para a mesa e os aprovados quando
	// a mesa abriu os DPOs do comitê.
	const [dpos, regras] = await Promise.all([
		supabase
			.from('dpo')
			.select('id, topico, texto, referencias, status, comentario_mesa, enviado_em, delegacao(id, nome, bandeira)')
			.eq('comite_id', comite.id)
			.order('topico'),
		supabase.rpc('regras', { p_comite: comite.id }, { get: true })
	]);
	if (dpos.error) throw dpos.error;
	if (regras.error) throw regras.error;
	return { dpos: dpos.data, regras: regras.data as Regras };
};
