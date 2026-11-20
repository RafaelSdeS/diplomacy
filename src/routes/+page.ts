import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:avisos');
	const { usuario, participacoes } = await parent();
	const comites = [...new Set(participacoes.map((p) => p.comite_id).filter((id) => id !== null))];

	const delegacoes = participacoes.filter((p) => p.papel === 'delegado' && p.delegacao_id).map((p) => p.delegacao_id!);

	const [cronograma, avisos, pessoa, comitesAoVivo, respostasCrise] = await Promise.all([
		supabase.from('cronograma_item').select('id, titulo, local, inicio, fim, comite_id').order('inicio'),
		supabase.from('aviso').select('id, texto, criado_em').order('criado_em', { ascending: false }).limit(20),
		supabase.from('pessoa').select('avisos_vistos_em').eq('id', usuario!.id).single(),
		// O andamento de cada comitê da pessoa: plenária, tópico em debate ou fase de ação.
		supabase.from('estado_sessao').select('fase, topico_atual, comite(sigla, topicos)').in('comite_id', comites),
		// As últimas respostas da crise às notas da delegação da pessoa.
		supabase
			.from('nota_crise')
			.select('id, titulo, status, resposta, comite_id')
			.in('delegacao_id', delegacoes)
			.not('resposta', 'is', null)
			.order('respondida_em', { ascending: false })
			.limit(3)
	]);
	if (comitesAoVivo.error) throw comitesAoVivo.error;
	if (respostasCrise.error) throw respostasCrise.error;
	if (cronograma.error) throw cronograma.error;
	if (avisos.error) throw avisos.error;
	if (pessoa.error) throw pessoa.error;

	return {
		cronograma: cronograma.data,
		avisos: avisos.data,
		avisosVistosEm: pessoa.data.avisos_vistos_em,
		comitesAoVivo: comitesAoVivo.data,
		respostasCrise: respostasCrise.data
	};
};
