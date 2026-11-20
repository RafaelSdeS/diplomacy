import { error } from '@sveltejs/kit';
import { comitePorSigla } from '#lib/sessao.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

// A edição do dia de um veículo: as matérias publicadas no dia (horário de Brasília).
// ?dia=AAAA-MM-DD (hoje, sem ele); ?especial=1 para a edição especial do último dia.
export const load: PageLoad = async ({ params, url }) => {
	const comite = await comitePorSigla(params.sigla);
	const dia = url.searchParams.get('dia') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
	const [veiculo, noticias] = await Promise.all([
		supabase.from('veiculo').select('nome, linha_editorial').eq('comite_id', comite.id).maybeSingle(),
		supabase
			.from('noticia')
			.select('id, tipo, titulo, linha_fina, texto, publicada_em')
			.eq('comite_id', comite.id)
			.eq('status', 'publicada')
			.gte('publicada_em', `${dia}T00:00:00-03:00`)
			.lt('publicada_em', `${dia}T24:00:00-03:00`)
			.order('publicada_em')
	]);
	if (veiculo.error) throw veiculo.error;
	if (noticias.error) throw noticias.error;
	if (!veiculo.data) error(404, 'Este comitê não tem press.');
	return { sigla: comite.sigla, veiculo: veiculo.data, noticias: noticias.data, dia, especial: url.searchParams.has('especial') };
};
