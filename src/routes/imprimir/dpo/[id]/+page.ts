import { error } from '@sveltejs/kit';
import { modeloDpo } from '#lib/impressao.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const dpo = await supabase
		.from('dpo')
		.select('topico, texto, referencias, delegacao(nome_oficial, bandeira, comite(sigla, nome_oficial, idioma, topicos))')
		.eq('id', params.id)
		.maybeSingle();
	if (dpo.error) throw dpo.error;
	if (!dpo.data?.delegacao?.comite) error(404, 'DPO não encontrado.');
	const { delegacao } = dpo.data;
	return { sigla: delegacao.comite!.sigla, modelo: modeloDpo(dpo.data, delegacao, delegacao.comite!) };
};
