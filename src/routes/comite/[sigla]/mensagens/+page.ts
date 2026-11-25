import type { Regras } from '#lib/regras.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:mensagens');
	const { comite } = await parent();
	// A RLS mostra a cada um só as conversas de que participa.
	const [mensagens, delegacoes, regras, entrevistas, bloqueios, sessoes] = await Promise.all([
		supabase
			.from('mensagem')
			.select('id, tipo, texto, oculta, criado_em, de_delegacao_id, para_delegacao_id, autor_id, autor:pessoa(nome)')
			.eq('comite_id', comite.id)
			.order('criado_em'),
		supabase.from('delegacao').select('id, nome, nome_oficial, bandeira').eq('comite_id', comite.id).order('nome'),
		supabase.rpc('regras', { p_comite: comite.id }, { get: true }),
		supabase
			.from('entrevista')
			.select('id, tema, status, horario, delegacao_id, veiculo(nome)')
			.eq('comite_id', comite.id)
			.order('criada_em', { ascending: false }),
		// Bloqueios de bilhetes (passo 24): a RLS mostra os da sua delegação e, à mesa, os do comitê.
		supabase.from('bloqueio_bilhete').select('delegacao_id, bloqueada_id').eq('comite_id', comite.id),
		// Passo 51 (lote 3): as sessões, para separar as conversas por sessão.
		supabase.from('sessao').select('numero, inicio').eq('comite_id', comite.id).order('inicio')
	]);
	for (const r of [mensagens, delegacoes, regras, entrevistas, bloqueios, sessoes]) if (r.error) throw r.error;
	return {
		mensagens: mensagens.data!,
		delegacoes: delegacoes.data!,
		regras: regras.data as Regras,
		entrevistas: entrevistas.data!,
		bloqueios: bloqueios.data!,
		sessoes: sessoes.data!
	};
};
