import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { comite } = await parent();
	const [delegacoes, mesa, daMesa] = await Promise.all([
		supabase
			.from('delegacao')
			.select('id, nome, nome_oficial, bandeira, situacao')
			.eq('comite_id', comite.id)
			.order('nome'),
		supabase.from('participacao').select('id, pessoa(nome)').eq('comite_id', comite.id).eq('papel', 'mesa'),
		// Passo 58: os documentos publicados pela mesa, fixados primeiro (os rascunhos ficam em Documentos).
		supabase
			.from('documento_mesa')
			.select('id, titulo, versao, fixado, publicado_em')
			.eq('comite_id', comite.id)
			.gt('versao', 0)
			.order('fixado', { ascending: false })
			.order('publicado_em', { ascending: false })
			.limit(4)
	]);
	for (const r of [delegacoes, mesa, daMesa]) if (r.error) throw r.error;

	return { delegacoes: delegacoes.data!, mesa: mesa.data!, daMesa: daMesa.data! };
};
