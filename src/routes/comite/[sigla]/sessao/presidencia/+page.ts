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
	// Divisão da questão: as operativas dos projetos em votação (as emendas saíram no passo 63).
	const emVotacao = projetos.data.filter((p) => p.status === 'em_votacao').map((p) => p.id);
	const operativas = await (
		// Na divisão da questão, uma parte rejeitada apaga cláusulas: muda com a votação.
		lerAoVivo(`operativas:${emVotacao.join(',')}`, ['documento', 'votacao'], () =>
			supabase.from('clausula').select('id, documento_id, texto').in('documento_id', emVotacao).eq('tipo', 'operativa').order('ordem')
		)
	);
	if (operativas.error) throw operativas.error;
	// Sem sessão aberta, o painel mostra o resumo da última.
	const resumo = sessao.estado ? null : await lerAoVivo(`resumo:${comite.id}`, ['estado_sessao'], () => ultimaSessao(comite.id));
	return { ...sessao, projetos: projetos.data, operativas: operativas.data, resumo, incidentes };
};
