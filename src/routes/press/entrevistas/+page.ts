import { error } from '@sveltejs/kit';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:entrevistas');
	const { participacoes } = await parent();
	const comites = participacoes.filter((p) => p.papel === 'press' && p.comite_id).map((p) => p.comite_id!);
	if (!comites.length) error(403, 'Só a press pede entrevistas.');
	const [delegacoes, entrevistas] = await Promise.all([
		supabase.from('delegacao').select('id, nome, comite_id').in('comite_id', comites).neq('situacao', 'suspensa').order('nome'),
		supabase
			.from('entrevista')
			.select('id, tema, status, horario, comite_id, delegacao(nome)')
			.in('comite_id', comites)
			.order('criada_em', { ascending: false })
	]);
	if (delegacoes.error) throw delegacoes.error;
	if (entrevistas.error) throw entrevistas.error;
	return { comites, delegacoes: delegacoes.data, entrevistas: entrevistas.data };
};
