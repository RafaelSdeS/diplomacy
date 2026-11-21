import { carregarIncidentes } from '#lib/crise.ts';
import { comitePorSigla } from '#lib/sessao.ts';
import { supabase } from '#lib/supabase.ts';
import { lerAoVivo } from '#lib/tempo-real.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, depends }) => {
	depends('app:crise');
	const comite = await lerAoVivo(`comite:${params.sigla}`, ['comite'], () => comitePorSigla(params.sigla));
	// A RLS só entrega as notas à equipe de crise do comitê (e à secretaria).
	const [notas, atualizacoes, incidentes, delegacoes] = await Promise.all([
		supabase
			.from('nota_crise')
			.select('id, tipo, titulo, texto, status, resposta, criado_em, responsavel_id, delegacao(id, nome, bandeira)')
			.eq('comite_id', comite.id)
			.order('criado_em'),
		// Passo 40: o que não é nota só se relê quando muda.
		lerAoVivo(`atualizacoes:${comite.id}`, ['atualizacao_comite'], () =>
			supabase.from('atualizacao_comite').select('atualizacao:atualizacao_crise(id, texto, publicada_em)').eq('comite_id', comite.id)
		),
		carregarIncidentes(comite.id),
		lerAoVivo(`delegacoes-crise:${comite.id}`, ['delegacao'], () => supabase.from('delegacao').select('id, nome').eq('comite_id', comite.id).order('nome'))
	]);
	if (delegacoes.error) throw delegacoes.error;
	if (notas.error) throw notas.error;
	if (atualizacoes.error) throw atualizacoes.error;
	return {
		comite,
		notas: notas.data,
		incidentes,
		delegacoes: delegacoes.data,
		atualizacoes: atualizacoes.data
			.map((a) => a.atualizacao)
			.filter((a) => a !== null)
			.sort((a, b) => b.publicada_em.localeCompare(a.publicada_em))
	};
};
