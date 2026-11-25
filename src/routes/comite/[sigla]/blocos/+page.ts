import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:blocos');
	const { comite } = await parent();
	// A RLS mostra os documentos do bloco da pessoa, os enviados à mesa (para a mesa)
	// e os aprovados (para todo o comitê).
	const [blocos, documentos, agenda, atualizacoes] = await Promise.all([
		supabase
			.from('bloco')
			.select('id, nome, membros:bloco_membro(redator, delegacao(id, nome, bandeira, situacao))')
			.eq('comite_id', comite.id)
			.order('criado_em'),
		supabase
			.from('documento')
			.select('id, tipo, numero, titulo, status, bloco_id, assinaturas:assinatura(count)')
			.eq('comite_id', comite.id)
			.order('criado_em', { ascending: false }),
		supabase
			.from('proposta_agenda')
			.select('topico, pontos:ponto_pauta(id, texto, pai_id, ordem)')
			.eq('comite_id', comite.id)
			.eq('adotada', true)
			.order('ordem', { referencedTable: 'pontos' }),
		supabase.from('atualizacao_comite').select('atualizacao:atualizacao_crise(id, texto, publicada_em)').eq('comite_id', comite.id)
	]);
	for (const r of [blocos, documentos, agenda, atualizacoes]) if (r.error) throw r.error;

	return {
		blocos: blocos.data!,
		documentos: documentos.data!,
		// Subtópicos da agenda adotada (o primeiro nível de cada tópico).
		subtopicos: agenda.data!.flatMap((a) =>
			a.pontos.filter((p) => p.pai_id === null).map((p) => ({ topico: a.topico, id: p.id, texto: p.texto }))
		),
		// Projeto de resolução só nos tópicos com a agenda adotada (passo 22).
		topicosAdotados: agenda.data!.map((a) => a.topico),
		atualizacoes: atualizacoes.data!.map((a) => a.atualizacao).filter((a) => a !== null)
	};
};
