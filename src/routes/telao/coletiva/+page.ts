import { error } from '@sveltejs/kit';
import { semRede } from '#lib/cache-dados.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

// Passo 45, parte B: o telão da coletiva é do evento (o de cada comitê fica como está).
// Aberto numa conta do evento (mesa, press ou secretaria) no projetor da sala da coletiva.
export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:coletiva');
	const { participacoes } = await parent();
	const evento = participacoes[0]?.evento_id;
	if (!evento) error(403, 'Sem acesso.');
	const coletiva = await supabase
		.from('coletiva')
		.select('id, titulo, aberta')
		.eq('evento_id', evento)
		.order('criada_em', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (coletiva.error) throw coletiva.error;
	if (!coletiva.data) return { evento, coletiva: null, perguntas: [] };
	const [perguntas, textos] = await Promise.all([
		supabase
			.from('coletiva_pergunta')
			.select('id, status, ordem, resposta_iniciada_em, veiculo(nome), delegacao(nome, bandeira)')
			.eq('coletiva_id', coletiva.data.id)
			.order('ordem'),
		supabase
			.from('coletiva_pergunta_texto')
			.select('pergunta_id, texto, pergunta:coletiva_pergunta!inner(coletiva_id, status)')
			.eq('pergunta.coletiva_id', coletiva.data.id)
			// No telão, o texto só a partir de Respondendo, mesmo se a conta puder ler antes.
			.eq('pergunta.status', 'respondendo')
			.retry(false)
	]);
	if (perguntas.error) throw perguntas.error;
	if (textos.error && !semRede(textos.error)) throw textos.error;
	const texto = new Map((textos.data ?? []).map((t) => [t.pergunta_id, t.texto]));
	return {
		evento,
		coletiva: coletiva.data,
		perguntas: (perguntas.data ?? []).map((p) => ({ ...p, texto: p.status === 'respondendo' ? (texto.get(p.id) ?? null) : null }))
	};
};
