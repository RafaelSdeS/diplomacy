import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { usuario, participacoes } = await parent();
	const pessoa = await supabase.from('pessoa').select('nome, bio, foto_path').eq('id', usuario!.id).single();
	if (pessoa.error) throw pessoa.error;

	let fotoUrl: string | null = null;
	if (pessoa.data.foto_path) {
		const assinada = await supabase.storage.from('fotos').createSignedUrl(pessoa.data.foto_path, 3600);
		fotoUrl = assinada.data?.signedUrl ?? null;
	}
	// Recortes: as matérias publicadas que citam a delegação da pessoa.
	const delegacoes = participacoes.filter((p) => p.papel === 'delegado' && p.delegacao_id).map((p) => p.delegacao_id!);
	const recortes = await supabase
		.from('citacao')
		.select('noticia!inner(id, titulo, linha_fina, publicada_em, status, veiculo(nome, comite(sigla)))')
		.in('delegacao_id', delegacoes)
		.eq('noticia.status', 'publicada')
		.order('noticia(publicada_em)', { ascending: false });
	if (recortes.error) throw recortes.error;
	return { pessoa: pessoa.data, fotoUrl, recortes: recortes.data.map((r) => r.noticia) };
};
