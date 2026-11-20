import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

// Pública: qualquer pessoa confere um certificado pelo código impresso nele.
export const load: PageLoad = async ({ params }) => {
	const { data, error } = await supabase.rpc('verificar_certificado', { p_codigo: params.codigo }, { get: true });
	if (error) throw error;
	return { codigo: params.codigo, certificado: data[0] ?? null };
};
