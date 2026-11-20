import { error } from '@sveltejs/kit';
import { supabase, todasAsLinhas } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:participantes');
	const { participacoes } = await parent();
	const evento = participacoes.find((p) => p.papel === 'secretaria')?.evento_id;
	if (!evento) error(403, 'Só a secretaria do evento acessa esta página.');

	const [convites, inscritos, comites, delegacoes] = await Promise.all([
		todasAsLinhas((de, ate) =>
			supabase
				.from('convite')
				.select('id, email, papel, comite_id, delegacao_id')
				.eq('evento_id', evento)
				.order('email')
				.order('id')
				.range(de, ate)
		),
		supabase
			.from('participacao')
			.select('id, papel, comite_id, delegacao_id, pessoa(nome)')
			.eq('evento_id', evento),
		supabase.from('comite').select('id, sigla, nome').eq('evento_id', evento).order('sigla'),
		supabase.from('delegacao').select('id, nome, comite_id').order('nome')
	]);
	for (const resposta of [inscritos, comites, delegacoes]) {
		if (resposta.error) throw resposta.error;
	}

	return {
		evento,
		convites,
		inscritos: (inscritos.data ?? []).sort((a, b) => (a.pessoa?.nome ?? '').localeCompare(b.pessoa?.nome ?? '')),
		comites: comites.data ?? [],
		delegacoes: delegacoes.data ?? []
	};
};
