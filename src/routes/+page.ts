import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:avisos');
	const { usuario } = await parent();

	const [cronograma, avisos, pessoa] = await Promise.all([
		supabase.from('cronograma_item').select('id, titulo, local, inicio, fim, comite_id').order('inicio'),
		supabase.from('aviso').select('id, texto, criado_em').order('criado_em', { ascending: false }).limit(20),
		supabase.from('pessoa').select('avisos_vistos_em').eq('id', usuario!.id).single()
	]);
	if (cronograma.error) throw cronograma.error;
	if (avisos.error) throw avisos.error;
	if (pessoa.error) throw pessoa.error;

	return { cronograma: cronograma.data, avisos: avisos.data, avisosVistosEm: pessoa.data.avisos_vistos_em };
};
