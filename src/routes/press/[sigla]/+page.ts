import { error } from '@sveltejs/kit';
import { comImagens } from '#lib/press.ts';
import { comitePorSigla } from '#lib/sessao.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, url, depends }) => {
	depends('app:press');
	const comite = await comitePorSigla(params.sigla);
	const [veiculo, noticias] = await Promise.all([
		supabase.from('veiculo').select('id, nome, linha_editorial').eq('comite_id', comite.id).maybeSingle(),
		supabase
			.from('noticia')
			.select(
				`id, tipo, titulo, linha_fina, texto, imagem_path, imagem_descricao, data_simulacao, status, motivo_ocultacao,
				publicada_em, autor:pessoa(nome), citacoes:citacao(delegacao(id, nome))`
			)
			.eq('comite_id', comite.id)
			.order('publicada_em', { ascending: false })
			.limit(60)
	]);
	if (veiculo.error) throw veiculo.error;
	if (noticias.error) throw noticias.error;
	if (!veiculo.data) error(404, 'Este comitê não tem press.');
	// Só a secretaria (a Diretoria da Press, no piloto) recebe as denúncias; para os outros, vem vazio.
	const denuncias = await supabase
		.from('denuncia')
		.select('id, noticia_id, motivo')
		.in(
			'noticia_id',
			noticias.data.map((n) => n.id)
		);
	if (denuncias.error) throw denuncias.error;
	return {
		comite,
		veiculo: veiculo.data,
		noticias: await comImagens(noticias.data),
		denuncias: denuncias.data,
		aberta: url.searchParams.get('n')
	};
};
