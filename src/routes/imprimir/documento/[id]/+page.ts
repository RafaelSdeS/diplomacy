import { error } from '@sveltejs/kit';
import { formatarDocumento } from '#lib/formatacao.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const documento = await supabase
		.from('documento')
		.select('id, tipo, numero, titulo, comite_id')
		.eq('id', params.id)
		.maybeSingle();
	if (documento.error) throw documento.error;
	if (!documento.data) error(404, 'Documento não encontrado.');
	// Passo 63: o comitê pelo documento (o da sala não tem bloco).
	const [comiteLido, clausulas, assinaturas] = await Promise.all([
		supabase.from('comite').select('sigla, nome_oficial, idioma').eq('id', documento.data.comite_id).single(),
		supabase.from('clausula').select('id, tipo, pai_id, ordem, texto').eq('documento_id', params.id),
		supabase.from('assinatura').select('delegacao(nome_oficial)').eq('documento_id', params.id)
	]);
	if (comiteLido.error) throw comiteLido.error;
	if (clausulas.error) throw clausulas.error;
	if (assinaturas.error) throw assinaturas.error;
	const comite = comiteLido.data;
	return {
		documento: documento.data,
		sigla: comite.sigla,
		idioma: comite.idioma === 'en' ? ('en' as const) : ('pt' as const),
		formatado: formatarDocumento(
			clausulas.data,
			comite,
			assinaturas.data.map((a) => a.delegacao?.nome_oficial ?? '').filter(Boolean)
		)
	};
};
