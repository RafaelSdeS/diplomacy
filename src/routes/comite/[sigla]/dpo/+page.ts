import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:dpo');
	const { comite } = await parent();
	// Passo 53: a RLS mostra os DPOs enviados a quem está no comitê; o rascunho de texto antigo e
	// o retirado, só à delegação e à mesa. O comentário da mesa, só à delegação dele.
	const [dpos, comentarios, prazo] = await Promise.all([
		supabase
			.from('dpo')
			.select('id, topico, texto, status, arquivo, enviado_em, envios, delegacao(id, nome, bandeira)')
			.eq('comite_id', comite.id)
			.order('topico'),
		supabase.from('dpo_comentario').select('dpo_id, texto').eq('comite_id', comite.id),
		// ponytail: o prazo é o fim do item do cronograma com "DPO" no título (do comitê ou geral);
		// um campo próprio no comitê, se o título não bastar.
		supabase
			.from('cronograma_item')
			.select('fim, comite_id')
			.ilike('titulo', '%DPO%')
			.order('fim')
	]);
	for (const r of [dpos, comentarios, prazo]) if (r.error) throw r.error;
	// Os links dos PDFs valem por 6 horas, um dia de sessões; a tela os renova a cada mudança nos DPOs.
	const arquivos = dpos.data!.flatMap((d) => (d.arquivo ? [d.arquivo] : []));
	const links = arquivos.length ? await supabase.storage.from('dpos').createSignedUrls(arquivos, 6 * 3600) : { data: [], error: null };
	if (links.error) throw links.error;
	return {
		dpos: dpos.data!,
		comentarios: new Map(comentarios.data!.map((c) => [c.dpo_id, c.texto])),
		links: new Map(links.data.flatMap((l) => (l.path && l.signedUrl ? [[l.path, l.signedUrl] as const] : []))),
		prazo: prazo.data!.find((p) => p.comite_id === comite.id || p.comite_id === null)?.fim ?? null
	};
};
