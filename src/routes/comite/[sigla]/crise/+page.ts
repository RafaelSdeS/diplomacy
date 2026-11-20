import { esperando } from '#lib/crise.ts';
import type { Regras } from '#lib/regras.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:crise');
	const { comite } = await parent();
	// A RLS mostra ao delegado só as notas da própria delegação.
	const [notas, atualizacoes, regras] = await Promise.all([
		supabase
			.from('nota_crise')
			.select('id, tipo, titulo, texto, status, resposta, criado_em, respondida_em')
			.eq('comite_id', comite.id)
			.order('criado_em', { ascending: false }),
		supabase.from('atualizacao_comite').select('atualizacao:atualizacao_crise(id, texto, publicada_em)').eq('comite_id', comite.id),
		supabase.rpc('regras', { p_comite: comite.id }, { get: true })
	]);
	if (notas.error) throw notas.error;
	if (atualizacoes.error) throw atualizacoes.error;
	if (regras.error) throw regras.error;

	// A posição na fila de cada nota que ainda espera (no máximo o limite de pendentes).
	const posicoes = new Map<string, number | null>();
	await Promise.all(
		notas.data
			.filter((n) => esperando(n.status))
			.map(async (n) => posicoes.set(n.id, (await supabase.rpc('posicao_na_fila', { p_id: n.id }, { get: true })).data ?? null))
	);

	return {
		regras: regras.data as Regras,
		notas: notas.data.map((n) => ({ ...n, posicao: posicoes.get(n.id) ?? null })),
		atualizacoes: atualizacoes.data
			.map((a) => a.atualizacao)
			.filter((a) => a !== null)
			.sort((a, b) => b.publicada_em.localeCompare(a.publicada_em))
	};
};
