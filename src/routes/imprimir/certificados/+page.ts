import { eventoDaSecretaria } from '#lib/secretaria.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const evento = eventoDaSecretaria((await parent()).participacoes);
	const [certificados, dados] = await Promise.all([
		supabase.from('certificado').select('codigo, nome, funcao').eq('evento_id', evento).order('nome'),
		supabase.from('evento').select('nome, ano').eq('id', evento).single()
	]);
	if (certificados.error) throw certificados.error;
	if (dados.error) throw dados.error;
	return { certificados: certificados.data, evento: `${dados.data.nome} ${dados.data.ano}` };
};
