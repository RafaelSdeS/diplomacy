import { carregarIncidentes } from '#lib/crise.ts';
import { carregarSessao, comitePorSigla } from '#lib/sessao.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, depends }) => {
	depends('app:sessao-ao-vivo');
	const comite = await comitePorSigla(params.sigla);
	const [sessao, plantoes, urgentes, incidentes] = await Promise.all([
		carregarSessao(comite.id),
		supabase.from('atualizacao_comite').select('atualizacao:atualizacao_crise(id, texto, publicada_em)').eq('comite_id', comite.id),
		supabase
			.from('noticia')
			.select('id, titulo, publicada_em, veiculo(nome)')
			.eq('comite_id', comite.id)
			.eq('tipo', 'nota_urgente')
			.eq('status', 'publicada')
			.order('publicada_em', { ascending: false })
			.limit(1),
		carregarIncidentes(comite.id)
	]);
	if (plantoes.error) throw plantoes.error;
	if (urgentes.error) throw urgentes.error;
	// A atualização de crise ou a nota urgente da press mais recente vira plantão no telão.
	const plantao =
		[
			...plantoes.data
				.map((p) => p.atualizacao)
				.filter((a) => a !== null)
				.map((a) => ({ id: a.id, rotulo: 'Plantão de crise', texto: a.texto, publicada_em: a.publicada_em })),
			...urgentes.data.map((n) => ({
				id: n.id,
				rotulo: `Plantão da press · ${n.veiculo?.nome ?? ''}`,
				texto: n.titulo,
				publicada_em: n.publicada_em
			}))
		].sort((a, b) => b.publicada_em.localeCompare(a.publicada_em))[0] ?? null;
	return { comite, ...sessao, plantao, incidentes };
};
