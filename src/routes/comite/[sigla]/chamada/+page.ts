import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:sessao-ao-vivo');
	const { comite } = await parent();

	const [delegacoes, estado, rodizio, quorum] = await Promise.all([
		supabase.from('delegacao').select('id, nome, bandeira, situacao').eq('comite_id', comite.id).order('nome'),
		supabase
			.from('estado_sessao')
			.select(
				'sessao(id, numero, de_votacao, presenca(delegacao_id, situacao), presidencia:delegacao!sessao_presidencia_delegacao_id_comite_id_fkey(nome))'
			)
			.eq('comite_id', comite.id)
			.maybeSingle(),
		supabase
			.from('rodizio_presidencia')
			.select('ordem, vez_usada, delegacao(id, nome, bandeira)')
			.eq('comite_id', comite.id)
			.order('ordem'),
		supabase.rpc('quorum', { p_comite: comite.id })
	]);
	if (delegacoes.error) throw delegacoes.error;
	if (estado.error) throw estado.error;
	if (rodizio.error) throw rodizio.error;
	if (quorum.error) throw quorum.error;

	return {
		delegacoes: delegacoes.data,
		sessao: estado.data?.sessao ?? null,
		rodizio: rodizio.data,
		quorum: quorum.data
	};
};
