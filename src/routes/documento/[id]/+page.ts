import { error } from '@sveltejs/kit';
import type { Regras } from '#lib/regras.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, depends }) => {
	depends('app:documento');
	// A RLS só entrega o documento a quem pode vê-lo: o bloco (rascunho), a mesa
	// (depois do envio) e o comitê (depois da aprovação da mesa).
	const documento = await supabase
		.from('documento')
		.select(
			`id, tipo, numero, titulo, status, aprovacao, clausula_em_foco_id, max_rodadas, topico, comite_id,
			ponto_pauta(texto),
			bloco(id, nome, comite(id, sigla, nome_oficial, idioma, topicos),
				membros:bloco_membro(redator, delegacao(id, nome, nome_oficial, bandeira)))`
		)
		.eq('id', params.id)
		.maybeSingle();
	if (documento.error) throw documento.error;
	if (!documento.data) error(404, 'Documento não encontrado.');
	const d = documento.data;

	const [clausulas, propostas, comentarios, rodadas, assinaturas, reaberturas, redator, regras, outros] = await Promise.all([
		supabase.from('clausula').select('id, tipo, pai_id, ordem, texto, status, versao, origem_id').eq('documento_id', d.id).order('ordem'),
		supabase
			.from('proposta_alteracao')
			.select('id, clausula_id, texto_novo, status, delegacao(nome)')
			.eq('documento_id', d.id)
			.order('criado_em'),
		supabase
			.from('comentario')
			.select('id, clausula_id, texto, estacionado, delegacao_id')
			.eq('documento_id', d.id)
			.order('criado_em'),
		supabase.from('rodada').select('numero, inicio, fim').eq('documento_id', d.id).order('numero'),
		supabase.from('assinatura').select('delegacao(id, nome, nome_oficial)').eq('documento_id', d.id),
		supabase.from('pedido_reabertura').select('clausula_id, delegacao_id'),
		supabase.rpc('sou_redator', { p_bloco: d.bloco!.id }),
		supabase.rpc('regras', { p_comite: d.comite_id }),
		// Para a fusão: os outros documentos do comitê que a pessoa vê, com as cláusulas.
		supabase
			.from('documento')
			.select('id, tipo, numero, titulo, clausulas:clausula!clausula_documento_id_comite_id_fkey(id, tipo, ordem, texto)')
			.eq('comite_id', d.comite_id)
			.neq('id', d.id)
			.in('tipo', ['working_paper'])
			.order('ordem', { referencedTable: 'clausulas' })
	]);
	for (const r of [clausulas, propostas, comentarios, rodadas, assinaturas, reaberturas, redator, regras, outros])
		if (r.error) throw r.error;

	return {
		documento: d,
		comite: d.bloco!.comite!,
		clausulas: clausulas.data!,
		propostas: propostas.data!,
		comentarios: comentarios.data!,
		rodadas: rodadas.data!,
		assinaturas: assinaturas.data!.map((a) => a.delegacao!).filter(Boolean),
		reaberturas: reaberturas.data!,
		souRedator: redator.data ?? false,
		regras: regras.data as Regras,
		workingPapers: outros.data!
	};
};
