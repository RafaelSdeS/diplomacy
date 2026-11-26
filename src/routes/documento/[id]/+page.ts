import { error, redirect } from '@sveltejs/kit';
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
	// Passo 63: o documento da sala (sem bloco dono) tem a tela dele.
	if (!d.bloco) redirect(307, `/documento/${d.id}/sala`);

	const [clausulas, propostas, comentarios, assinaturas, reaberturas, redator, regras, posicoes] = await Promise.all([
		supabase.from('clausula').select('id, tipo, pai_id, ordem, texto, status, versao, origem_id').eq('documento_id', d.id).order('ordem'),
		supabase
			.from('proposta_alteracao')
			.select('id, clausula_id, texto_novo, status, delegacao(nome)')
			.eq('documento_id', d.id)
			.order('criado_em'),
		supabase
			.from('comentario')
			.select('id, clausula_id, texto, estacionado, resolvido, delegacao_id, criado_em')
			.eq('documento_id', d.id)
			.order('criado_em'),
		supabase.from('assinatura').select('delegacao(id, nome, nome_oficial, bandeira)').eq('documento_id', d.id),
		supabase.from('pedido_reabertura').select('clausula_id, delegacao_id'),
		supabase.rpc('sou_redator', { p_bloco: d.bloco!.id }, { get: true }),
		supabase.rpc('regras', { p_comite: d.comite_id }, { get: true }),
		// Passo 57: a posição de cada delegação do bloco (e da mesa) em cada cláusula.
		supabase.from('posicao_clausula').select('clausula_id, delegacao_id, posicao').eq('documento_id', d.id)
	]);
	for (const r of [clausulas, propostas, comentarios, assinaturas, reaberturas, redator, regras, posicoes])
		if (r.error) throw r.error;

	return {
		posicoes: posicoes.data!,
		documento: d,
		comite: d.bloco!.comite!,
		clausulas: clausulas.data!,
		propostas: propostas.data!,
		comentarios: comentarios.data!,
		assinaturas: assinaturas.data!.map((a) => a.delegacao!).filter(Boolean),
		reaberturas: reaberturas.data!,
		souRedator: redator.data ?? false,
		regras: regras.data as Regras
	};
};
