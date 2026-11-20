import { error } from '@sveltejs/kit';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { participacoes } = await parent();
	const comites = participacoes.filter((p) => p.papel === 'press' && p.comite_id).map((p) => p.comite_id!);
	if (!comites.length) error(403, 'Só a press escreve matérias.');
	const [veiculos, delegacoes] = await Promise.all([
		supabase.from('veiculo').select('id, nome, comite_id, comite(sigla)').in('comite_id', comites).order('nome'),
		supabase.from('delegacao').select('id, nome, comite_id').in('comite_id', comites).order('nome')
	]);
	if (veiculos.error) throw veiculos.error;
	if (delegacoes.error) throw delegacoes.error;
	if (!veiculos.data.length) error(404, 'O seu comitê ainda não tem veículo.');
	return { veiculos: veiculos.data, delegacoes: delegacoes.data };
};
