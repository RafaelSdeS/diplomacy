import { carregarOrdem } from '#lib/ordem.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

// Passo 43: tudo o que se escreve no comitê, num lugar só (DPO, documentos dos blocos,
// cartas, caderno). A RLS decide o que cada um vê; aqui só se separa "seu" de "do comitê".
export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:documentos');
	const { comite, participacoes } = await parent();
	const minha = participacoes.find((p) => p.comite_id === comite.id && p.papel === 'delegado')?.delegacao_id ?? null;
	const ehMesa = participacoes.some((p) => p.papel === 'secretaria' || (p.papel === 'mesa' && p.comite_id === comite.id));

	const [dpos, documentos, meusBlocos, rodadas, cartas, delegacoes, ordem, daMesa] = await Promise.all([
		supabase.from('dpo').select('id, topico, status, delegacao(id, nome, bandeira)').eq('comite_id', comite.id).order('topico'),
		supabase
			.from('documento')
			.select('id, tipo, numero, titulo, status, topico, bloco_id, bloco(nome), ponto_pauta(ordem), assinaturas:assinatura(delegacao(id, nome, bandeira))')
			.eq('comite_id', comite.id)
			.order('criado_em', { ascending: false }),
		minha ? supabase.from('bloco_membro').select('bloco_id').eq('delegacao_id', minha) : Promise.resolve({ data: [], error: null }),
		// Sem a hora atual na URL: a lista abre sem internet (o cache é pela URL). O filtro
		// das rodadas abertas fica na tela.
		supabase.from('rodada').select('fim, documento_id').order('fim', { ascending: false }).limit(50),
		supabase
			.from('carta')
			.select('id, titulo, enviada_em, remetente:delegacao(nome)')
			.eq('comite_id', comite.id)
			.order('enviada_em', { ascending: false })
			.limit(5),
		supabase.from('delegacao').select('id', { count: 'exact', head: true }).eq('comite_id', comite.id),
		// Passo 56: a ordem de cada tópico (agenda adotada e documentos).
		carregarOrdem(comite.id),
		// Passo 58: os documentos da mesa (a RLS mostra ao comitê só os publicados), fixados primeiro.
		supabase
			.from('documento_mesa')
			.select('id, titulo, versao, fixado, publicado_em')
			.eq('comite_id', comite.id)
			.order('fixado', { ascending: false })
			.order('publicado_em', { ascending: false, nullsFirst: true })
	]);
	for (const r of [dpos, documentos, meusBlocos, rodadas, cartas, daMesa]) if (r.error) throw r.error;

	return {
		minha,
		ehMesa,
		dpos: dpos.data!,
		documentos: documentos.data!,
		meusBlocos: meusBlocos.data!.map((b) => b.bloco_id),
		rodadas: rodadas.data!,
		cartas: cartas.data!,
		totalDelegacoes: delegacoes.count ?? 0,
		ordem,
		daMesa: daMesa.data!
	};
};
