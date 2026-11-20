import { eventoDaSecretaria } from '#lib/secretaria.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:dados');
	const evento = eventoDaSecretaria((await parent()).participacoes);
	const [dados, pedidos, pesquisa] = await Promise.all([
		supabase.from('evento').select('nome, ano').eq('id', evento).single(),
		supabase.from('pedido_exclusao').select('id, pessoa_id, nome, criado_em').is('atendido_em', null).order('criado_em'),
		supabase.from('pesquisa_resposta').select('papel, nota, respostas').eq('evento_id', evento)
	]);
	for (const r of [dados, pedidos, pesquisa]) if (r.error) throw r.error;
	return { evento, nomeEvento: `${dados.data!.nome} ${dados.data!.ano}`, pedidos: pedidos.data!, pesquisa: pesquisa.data! };
};
