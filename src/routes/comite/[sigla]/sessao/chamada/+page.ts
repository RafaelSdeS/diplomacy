import type { Regras } from '#lib/regras.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:sessao-ao-vivo');
	const { comite } = await parent();

	const [delegacoes, estado, rodizio, quorum, regras] = await Promise.all([
		supabase.from('delegacao').select('id, nome, bandeira, situacao').eq('comite_id', comite.id).order('nome'),
		supabase
			.from('estado_sessao')
			.select(
				'fase, sessao(id, numero, presenca(delegacao_id, situacao), presidencia:delegacao!sessao_presidencia_delegacao_id_comite_id_fkey(nome))'
			)
			.eq('comite_id', comite.id)
			.maybeSingle(),
		supabase
			.from('rodizio_presidencia')
			.select('ordem, vezes, delegacao(id, nome, bandeira)')
			.eq('comite_id', comite.id)
			.order('ordem'),
		supabase.rpc('quorum', { p_comite: comite.id }),
		supabase.rpc('regras', { p_comite: comite.id })
	]);
	if (regras.error) throw regras.error;
	if (delegacoes.error) throw delegacoes.error;
	if (estado.error) throw estado.error;
	if (rodizio.error) throw rodizio.error;
	if (quorum.error) throw quorum.error;

	return {
		delegacoes: delegacoes.data,
		sessao: estado.data?.sessao ?? null,
		fase: estado.data?.fase ?? 'plenaria',
		rodizio: rodizio.data,
		quorum: quorum.data,
		regras: regras.data as Regras
	};
};
