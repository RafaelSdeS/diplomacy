import { eventoDaSecretaria } from '#lib/secretaria.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:certificados');
	const evento = eventoDaSecretaria((await parent()).participacoes);
	const [presentes, certificados] = await Promise.all([
		supabase.from('checkin').select('email').eq('evento_id', evento),
		supabase.from('certificado').select('codigo', { count: 'exact', head: true }).eq('evento_id', evento)
	]);
	if (presentes.error) throw presentes.error;
	if (certificados.error) throw certificados.error;
	return { evento, presentes: new Set(presentes.data.map((p) => p.email)).size, certificados: certificados.count ?? 0 };
};
