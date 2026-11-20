import { eventoDaSecretaria } from '#lib/secretaria.ts';
import { supabase, todasAsLinhas } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const evento = eventoDaSecretaria((await parent()).participacoes);
	const [certificados, dados] = await Promise.all([
		todasAsLinhas((de, ate) =>
			supabase.from('certificado').select('codigo, nome, funcao').eq('evento_id', evento).order('nome').order('codigo').range(de, ate)
		),
		supabase.from('evento').select('nome, ano').eq('id', evento).single()
	]);
	if (dados.error) throw dados.error;
	return { certificados, evento: `${dados.data.nome} ${dados.data.ano}` };
};
