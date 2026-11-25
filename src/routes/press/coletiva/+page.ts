import { error } from '@sveltejs/kit';
import { semRede } from '#lib/cache-dados.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:coletiva');
	const { participacoes } = await parent();
	const evento = participacoes[0]?.evento_id;
	if (!evento) error(403, 'Sem acesso.');
	const coletiva = await supabase
		.from('coletiva')
		.select('id, titulo, aberta, criada_em')
		.eq('evento_id', evento)
		.order('criada_em', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (coletiva.error) throw coletiva.error;
	const comitesPress = participacoes.filter((p) => p.papel === 'press' && p.comite_id).map((p) => p.comite_id!);
	// Passo 45: o texto fica numa tabela à parte, que só a press do veículo e a Diretoria
	// da Press leem (a RLS devolve só esses). Nunca vai para o cache do aparelho.
	const [perguntas, textos, delegacoes, notas] = await Promise.all([
		coletiva.data
			? supabase
					.from('coletiva_pergunta')
					.select(
						'id, status, ordem, chamada_em, resposta_iniciada_em, presente, retirada_motivo, comite_id, veiculo(nome), delegacao(id, nome, bandeira, comite(sigla))'
					)
					.eq('coletiva_id', coletiva.data.id)
					.order('ordem')
			: Promise.resolve({ data: [], error: null }),
		coletiva.data
			? supabase
					.from('coletiva_pergunta_texto')
					.select('pergunta_id, texto, pergunta:coletiva_pergunta!inner(coletiva_id)')
					.eq('pergunta.coletiva_id', coletiva.data.id)
					.retry(false)
			: Promise.resolve({ data: [], error: null }),
		supabase.from('delegacao').select('id, nome, nome_oficial, bandeira').in('comite_id', comitesPress).neq('situacao', 'suspensa').order('nome'),
		// Passo 45, parte B: a nota da press depois da fala (só a press do veículo e a Diretoria leem).
		coletiva.data
			? supabase
					.from('coletiva_nota')
					.select('pergunta_id, texto, pergunta:coletiva_pergunta!inner(coletiva_id)')
					.eq('pergunta.coletiva_id', coletiva.data.id)
					.retry(false)
			: Promise.resolve({ data: [], error: null })
	]);
	if (perguntas.error) throw perguntas.error;
	if (textos.error && !semRede(textos.error)) throw textos.error;
	if (notas.error && !semRede(notas.error)) throw notas.error;
	const texto = new Map((textos.data ?? []).map((t) => [t.pergunta_id, t.texto]));
	const nota = new Map((notas.data ?? []).map((n) => [n.pergunta_id, n.texto]));
	if (delegacoes.error) throw delegacoes.error;
	return {
		evento,
		coletiva: coletiva.data,
		perguntas: (perguntas.data ?? []).map((p) => ({ ...p, texto: texto.get(p.id) ?? null, nota: nota.get(p.id) ?? null })),
		// As delegações da pessoa (para o cartão "Sua delegação foi chamada").
		minhasDelegacoes: participacoes.filter((p) => p.papel === 'delegado' && p.delegacao_id).map((p) => p.delegacao_id!),
		delegacoes: delegacoes.data,
		diretoria: participacoes.some((p) => p.papel === 'diretoria_press' || p.papel === 'secretaria'),
		souPress: comitesPress.length > 0,
		comitesPress
	};
};
