import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:cartas');
	const { comite } = await parent();
	// A RLS mostra as cartas públicas e as privadas de que a pessoa é remetente ou destinatária.
	const [cartas, blocos, delegacoes] = await Promise.all([
		supabase
			.from('carta')
			.select(
				`id, titulo, corpo, publica, enviada_em,
				remetente:delegacao(nome), bloco_remetente:bloco(nome),
				destinatarios:carta_destinatario(delegacao(nome), bloco(nome))`
			)
			.eq('comite_id', comite.id)
			.order('enviada_em', { ascending: false }),
		supabase.from('bloco').select('id, nome, membros:bloco_membro(delegacao_id)').eq('comite_id', comite.id).order('nome'),
		supabase.from('delegacao').select('id, nome').eq('comite_id', comite.id).order('nome')
	]);
	for (const r of [cartas, blocos, delegacoes]) if (r.error) throw r.error;
	return { cartas: cartas.data!, blocos: blocos.data!, delegacoes: delegacoes.data! };
};
