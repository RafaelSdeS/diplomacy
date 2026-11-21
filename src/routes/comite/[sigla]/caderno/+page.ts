import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

// Passo 34: o caderno da delegação. A RLS mostra as anotações da própria delegação e as
// compartilhadas com ela; a mesa não vê nada.
export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:caderno');
	const { comite } = await parent();
	const [anotacoes, delegacoes, estado] = await Promise.all([
		supabase
			.from('anotacao')
			.select(
				'id, tipo, titulo, texto, topico, criado_em, delegacao_id, sobre_delegacao_id, orador:delegacao!anotacao_orador_delegacao_id_comite_id_fkey(nome), compartilhada:anotacao_compartilhada(delegacao_id)'
			)
			.eq('comite_id', comite.id)
			.order('criado_em', { ascending: false }),
		supabase.from('delegacao').select('id, nome, bandeira').eq('comite_id', comite.id).order('nome'),
		supabase.from('estado_sessao').select('tempo_fala_seg').eq('comite_id', comite.id).maybeSingle()
	]);
	for (const r of [anotacoes, delegacoes, estado]) if (r.error) throw r.error;
	return {
		anotacoes: anotacoes.data!,
		delegacoes: delegacoes.data!,
		tempoFalaSeg: estado.data?.tempo_fala_seg ?? 90
	};
};
