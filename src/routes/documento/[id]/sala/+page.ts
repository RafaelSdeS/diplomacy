import { error, redirect } from '@sveltejs/kit';
import { carregarOrdem } from '#lib/ordem.ts';
import type { Regras } from '#lib/regras.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

// Passo 63: o documento da sala, sem bloco dono. O working paper de um item da agenda (os
// redatores propõem, todas marcam posição, quem preside decide) ou o projeto do tópico (fechado).
export const load: PageLoad = async ({ params, parent, depends }) => {
	depends('app:sala');
	const documento = await supabase
		.from('documento')
		.select('id, tipo, numero, titulo, status, topico, comite_id, bloco_id, clausula_em_foco_id, ponto_pauta(texto, ordem)')
		.eq('id', params.id)
		.maybeSingle();
	if (documento.error) throw documento.error;
	if (!documento.data) error(404, 'Documento não encontrado.');
	const d = documento.data;
	if (d.bloco_id) redirect(307, `/documento/${d.id}`);

	const { participacoes } = await parent();
	const eu = participacoes.find((p) => p.comite_id === d.comite_id && p.papel === 'delegado')?.delegacao_id ?? null;
	const [comite, clausulas, propostas, assinaturas, regras, podePresidir, delegacoes, irmaos, meuBloco, minha, ordem] = await Promise.all([
		supabase.from('comite').select('id, sigla, nome_oficial, idioma, topicos').eq('id', d.comite_id).single(),
		supabase.from('clausula').select('id, tipo, pai_id, ordem, texto, versao').eq('documento_id', d.id).order('ordem'),
		supabase
			.from('proposta_alteracao')
			.select(
				`id, acao, clausula_id, texto_novo, tipo, depois_de, motivo, status, criado_em, decidida_em,
				delegacao(id, nome, bandeira), bloco(nome), posicoes:posicao_proposta(delegacao_id, posicao)`
			)
			.eq('documento_id', d.id)
			.order('criado_em'),
		supabase.from('assinatura').select('delegacao(id, nome, nome_oficial, bandeira, situacao)').eq('documento_id', d.id),
		supabase.rpc('regras', { p_comite: d.comite_id }, { get: true }),
		supabase.rpc('pode_presidir', { p_comite: d.comite_id }, { get: true }),
		supabase.from('delegacao').select('id', { count: 'exact', head: true }).eq('comite_id', d.comite_id),
		// Os outros documentos da sala no tópico: os working papers dos outros itens e o projeto.
		supabase
			.from('documento')
			.select('id, tipo, titulo, status, ponto_pauta(ordem)')
			.eq('comite_id', d.comite_id)
			.eq('topico', d.topico ?? 0)
			.is('bloco_id', null)
			.neq('status', 'rejeitado'),
		eu ? supabase.from('bloco_membro').select('redator, bloco(id, nome)').eq('delegacao_id', eu).maybeSingle() : null,
		eu ? supabase.from('delegacao').select('situacao').eq('id', eu).single() : null,
		// Passo 64: a trilha do tópico no topo da sala.
		carregarOrdem(d.comite_id)
	]);
	for (const r of [comite, clausulas, propostas, assinaturas, regras, podePresidir, delegacoes, irmaos, meuBloco, minha])
		if (r?.error) throw r.error;

	const ordemDoItem = (x: { tipo: string; ponto_pauta: { ordem: number } | null }) =>
		x.tipo === 'projeto' ? Infinity : (x.ponto_pauta?.ordem ?? Infinity - 1);
	return {
		documento: d,
		comite: comite.data!,
		clausulas: clausulas.data!,
		propostas: propostas.data!,
		assinaturas: assinaturas.data!.map((a) => a.delegacao!).filter(Boolean),
		regras: regras.data as Regras,
		podePresidir: podePresidir.data ?? false,
		totalDelegacoes: delegacoes.count ?? 0,
		irmaos: irmaos.data!.sort((a, b) => ordemDoItem(a) - ordemDoItem(b)),
		eu,
		meuBloco: meuBloco?.data ?? null,
		observadora: minha?.data?.situacao === 'observadora',
		ordem
	};
};
