import { error } from '@sveltejs/kit';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

// Passo 58: um documento da mesa. O comitê lê a última publicação (e a anterior, para "Ver
// alterações"); a mesa também carrega o rascunho, que a RLS esconde das delegações.
export const load: PageLoad = async ({ params, parent, depends }) => {
	depends('app:documento-mesa');
	const { comite, participacoes } = await parent();
	const ehMesa = participacoes.some((p) => p.papel === 'mesa' && p.comite_id === comite.id);
	const [documento, versoes, rascunho] = await Promise.all([
		supabase.from('documento_mesa').select('id, titulo, corpo, arquivo, fixado, versao, publicado_em').eq('id', params.id).maybeSingle(),
		supabase.from('documento_mesa_versao').select('numero, titulo, corpo').eq('documento_id', params.id).order('numero', { ascending: false }).limit(2),
		ehMesa
			? supabase.from('documento_mesa_rascunho').select('titulo, corpo, versao, atualizado_em, autor:pessoa(nome)').eq('documento_id', params.id).maybeSingle()
			: Promise.resolve({ data: null, error: null })
	]);
	for (const r of [documento, versoes, rascunho]) if (r.error) throw r.error;
	if (!documento.data) error(404, 'Documento não encontrado.');
	return { ehMesa, documento: documento.data, anterior: versoes.data![1] ?? null, rascunho: rascunho.data };
};
