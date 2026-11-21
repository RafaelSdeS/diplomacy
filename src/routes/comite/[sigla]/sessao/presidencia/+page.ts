import { carregarIncidentes } from '#lib/crise.ts';
import { carregarSessao, ultimaSessao } from '#lib/sessao.ts';
import { supabase } from '#lib/supabase.ts';
import { lerAoVivo } from '#lib/tempo-real.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:sessao-ao-vivo');
	const { comite } = await parent();
	const [sessao, projetos, incidentes] = await Promise.all([
		carregarSessao(comite.id),
		// Os projetos que a mesa aprovou: esperam o consenso ou a votação.
		lerAoVivo(`projetos:${comite.id}`, ['documento'], () =>
			supabase
				.from('documento')
				.select('id, tipo, numero, titulo, status, aprovacao')
				.eq('comite_id', comite.id)
				.neq('tipo', 'working_paper')
				.in('status', ['aprovado_mesa', 'em_votacao', 'aprovado', 'rejeitado'])
				.order('numero')
		),
		carregarIncidentes(comite.id)
	]);
	if (projetos.error) throw projetos.error;
	// Divisão da questão: as operativas dos projetos em votação. Emendas: as propostas.
	const emVotacao = projetos.data.filter((p) => p.status === 'em_votacao').map((p) => p.id);
	const [operativas, emendas] = await Promise.all([
		// Na divisão da questão, uma parte rejeitada apaga cláusulas: muda com a votação.
		lerAoVivo(`operativas:${emVotacao.join(',')}`, ['documento', 'votacao'], () =>
			supabase.from('clausula').select('id, documento_id, texto').in('documento_id', emVotacao).eq('tipo', 'operativa').order('ordem')
		),
		lerAoVivo(`emendas:${comite.id}`, ['emenda', 'emenda_assinatura', 'votacao'], () =>
			supabase
				.from('emenda')
				.select('id, documento_id, acao, texto, clausula(texto), delegacao(nome), assinaturas:emenda_assinatura(delegacao_id)')
				.eq('comite_id', comite.id)
				.eq('status', 'proposta')
				.order('criada_em')
		)
	]);
	if (operativas.error) throw operativas.error;
	if (emendas.error) throw emendas.error;
	// Sem sessão aberta, o painel mostra o resumo da última.
	const resumo = sessao.estado ? null : await lerAoVivo(`resumo:${comite.id}`, ['estado_sessao'], () => ultimaSessao(comite.id));
	return { ...sessao, projetos: projetos.data, operativas: operativas.data, emendas: emendas.data, resumo, incidentes };
};
