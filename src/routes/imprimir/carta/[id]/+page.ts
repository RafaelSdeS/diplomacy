import { error } from '@sveltejs/kit';
import { modeloCarta } from '#lib/impressao.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const carta = await supabase
		.from('carta')
		.select(
			`titulo, corpo, publica, enviada_em, comite(sigla, nome_oficial, idioma, topicos),
			remetente:delegacao(nome_oficial), bloco_remetente:bloco(nome),
			destinatarios:carta_destinatario(delegacao(nome_oficial), bloco(nome))`
		)
		.eq('id', params.id)
		.maybeSingle();
	if (carta.error) throw carta.error;
	if (!carta.data?.comite) error(404, 'Carta não encontrada.');
	const c = carta.data;
	const remetente = c.bloco_remetente?.nome ?? c.remetente?.nome_oficial ?? '';
	const destinatarios = c.destinatarios.map((d) => d.delegacao?.nome_oficial ?? d.bloco?.nome ?? '').filter(Boolean);
	return { sigla: c.comite!.sigla, enviadaEm: c.enviada_em, modelo: modeloCarta(c, remetente, destinatarios, c.comite!) };
};
