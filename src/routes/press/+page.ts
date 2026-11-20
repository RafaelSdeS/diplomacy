import { comImagens } from '#lib/press.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:press');
	const { participacoes } = await parent();
	const [noticias, veiculos] = await Promise.all([
		supabase
			.from('noticia')
			.select('id, tipo, titulo, linha_fina, imagem_path, imagem_descricao, publicada_em, veiculo(nome, comite(sigla))')
			.eq('status', 'publicada')
			.order('publicada_em', { ascending: false })
			.limit(40),
		supabase.from('veiculo').select('id, nome, comite(sigla)').order('nome')
	]);
	if (noticias.error) throw noticias.error;
	if (veiculos.error) throw veiculos.error;
	return {
		noticias: await comImagens(noticias.data),
		veiculos: veiculos.data,
		minhaPress: participacoes.filter((p) => p.papel === 'press').map((p) => p.comite_sigla)
	};
};
