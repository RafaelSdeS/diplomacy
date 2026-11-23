import { semRede } from '#lib/cache-dados.ts';
import { papelPrincipal } from '#lib/papeis.ts';
import { carregarIncidentes } from '#lib/crise.ts';
import { carregarSessao } from '#lib/sessao.ts';
import { supabase } from '#lib/supabase.ts';
import { lerAoVivo } from '#lib/tempo-real.ts';
import type { PageLoad } from './$types';

// Contagens são extras: sem rede (o pedido HEAD não fica no cache), o Agora abre sem elas.
const contar = async (consulta: PromiseLike<{ count: number | null; error: unknown }>) => {
	const { count, error } = await consulta;
	return error ? null : (count ?? 0);
};

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:avisos');
	depends('app:sessao-ao-vivo');
	const { usuario, participacoes } = await parent();
	// Passo 32: o Agora de cada papel. Delegado e mesa veem a sessão ao vivo do comitê.
	const principal = papelPrincipal(participacoes);
	const minha = participacoes.find((p) => p.papel === principal && p.comite_id);
	const comiteAoVivo = principal === 'delegado' || principal === 'mesa' ? (minha?.comite_id ?? null) : null;
	// Sem a hora na consulta: a mesma URL sempre, para a resposta guardada abrir o Agora sem
	// rede (passo 15). O que já passou sai aqui.
	const agoraIso = new Date().toISOString();
	const comites = [...new Set(participacoes.map((p) => p.comite_id).filter((id) => id !== null))];

	const delegacoes = participacoes.filter((p) => p.papel === 'delegado' && p.delegacao_id).map((p) => p.delegacao_id!);
	// Passo 40: uma mudança ao vivo (sessão ou aviso) só relê as leituras da tabela que mudou.
	const ler = <T>(nome: string, tabelas: string[], consulta: () => PromiseLike<T>) =>
		lerAoVivo(`agora:${usuario!.id}:${nome}`, tabelas, consulta);

	const [cronograma, avisos, pessoa, comitesAoVivo, respostasCrise, dpos, citacoes] = await Promise.all([
		ler('cronograma', ['cronograma_item'], () => supabase.from('cronograma_item').select('id, titulo, local, inicio, fim, comite_id, tipo').order('inicio')),
		ler('avisos', ['aviso'], () => supabase.from('aviso').select('id, texto, criado_em').order('criado_em', { ascending: false }).limit(20)),
		ler('avisos-vistos', ['aviso'], () => supabase.from('pessoa').select('avisos_vistos_em').eq('id', usuario!.id).single()),
		// O andamento de cada comitê da pessoa: plenária, tópico em debate ou fase de ação.
		ler('comites', ['estado_sessao'], () =>
			supabase.from('estado_sessao').select('fase, topico_atual, comite(sigla, topicos)').in('comite_id', comites)
		),
		// As últimas respostas da crise às notas da delegação da pessoa.
		ler('respostas-crise', ['nota_crise'], () =>
			supabase
				.from('nota_crise')
				.select('id, titulo, status, resposta, comite_id')
				.in('delegacao_id', delegacoes)
				.not('resposta', 'is', null)
				.order('respondida_em', { ascending: false })
				.limit(3)
				// Nunca está no cache (passo 44): sem rede, falha na hora em vez de tentar de novo.
				.retry(false)
		),
		// Os DPOs da delegação da pessoa, um por tópico.
		ler('dpos', ['dpo'], () => supabase.from('dpo').select('id, topico, status, comite_id').in('delegacao_id', delegacoes).order('topico')),
		// As últimas matérias publicadas que citam a delegação da pessoa.
		ler('citacoes', ['noticia', 'citacao'], () =>
			supabase
				.from('citacao')
				.select('noticia!inner(id, titulo, publicada_em, status, veiculo(nome, comite(sigla)))')
				.in('delegacao_id', delegacoes)
				.eq('noticia.status', 'publicada')
				.order('noticia(publicada_em)', { ascending: false })
				.limit(3)
		)
	]);
	const minhaDelegacao = principal === 'delegado' ? (minha?.delegacao_id ?? null) : null;
	const [aoVivo, bilhetes, rodadas, mesa, crise, entrevistas] = await Promise.all([
		comiteAoVivo
			? Promise.all([
					carregarSessao(comiteAoVivo),
					ler('restrita', ['comite'], () => supabase.from('comite').select('tecnologia_restrita').eq('id', comiteAoVivo).single()),
					carregarIncidentes(comiteAoVivo)
				]).then(([sessao, comite, incidentes]) => ({ ...sessao, restrita: !!comite.data?.tecnologia_restrita, incidentes }))
			: null,
		minhaDelegacao
			? ler('bilhetes', ['mensagem'], () =>
					supabase
						.from('mensagem')
						.select('id, texto, criado_em, de:delegacao!mensagem_de_delegacao_id_comite_id_fkey(nome)')
						.eq('tipo', 'bilhete')
						.eq('para_delegacao_id', minhaDelegacao)
						.order('criado_em', { ascending: false })
						.limit(3)
				)
			: { data: [], error: null },
		minhaDelegacao
			? ler('rodadas', ['rodada'], () => supabase.from('rodada').select('fim, documento!inner(id, titulo)').order('fim', { ascending: false }).limit(10))
			: { data: [], error: null },
		principal === 'mesa' && minha?.comite_id
			? Promise.all([
					contar(ler('dpos-enviados', ['dpo'], () => supabase.from('dpo').select('id', { count: 'exact', head: true }).eq('comite_id', minha.comite_id!).eq('status', 'enviado'))),
					contar(
						ler('documentos-enviados', ['documento'], () =>
							supabase.from('documento').select('id', { count: 'exact', head: true }).eq('comite_id', minha.comite_id!).eq('status', 'enviado')
						)
					)
				]).then(([dpos, documentos]) => ({ dpos, documentos }))
			: null,
		principal === 'crise' && minha?.comite_id
			? contar(
					ler('notas-pendentes', ['nota_crise'], () =>
						supabase.from('nota_crise').select('id', { count: 'exact', head: true }).eq('comite_id', minha.comite_id!).eq('status', 'pendente')
					)
				)
			: null,
		principal === 'press'
			? ler('entrevistas', ['entrevista'], () =>
					supabase
						.from('entrevista')
						.select('id, tema, horario, delegacao(nome)')
						.eq('status', 'aceita')
						.order('horario', { ascending: false })
						.limit(10)
				)
			: { data: [], error: null }
	]);
	for (const r of [bilhetes, rodadas, entrevistas]) if (r.error) throw r.error;
	if (dpos.error) throw dpos.error;
	if (citacoes.error) throw citacoes.error;
	if (comitesAoVivo.error) throw comitesAoVivo.error;
	// Passo 44: as notas de crise nunca ficam no cache; sem rede, o cartão só fica vazio.
	if (respostasCrise.error && !semRede(respostasCrise.error)) throw respostasCrise.error;
	if (cronograma.error) throw cronograma.error;
	if (avisos.error) throw avisos.error;
	if (pessoa.error) throw pessoa.error;

	return {
		cronograma: cronograma.data,
		avisos: avisos.data,
		avisosVistosEm: pessoa.data.avisos_vistos_em,
		comitesAoVivo: comitesAoVivo.data,
		respostasCrise: respostasCrise.data ?? [],
		dpos: dpos.data,
		citacoes: citacoes.data.map((c) => c.noticia),
		principal,
		minha: minha ?? null,
		aoVivo,
		bilhetes: bilhetes.data ?? [],
		rodadas: (rodadas.data ?? []).filter((r) => r.fim > agoraIso).reverse(),
		mesa,
		notasPendentes: crise,
		entrevistas: (entrevistas.data ?? []).filter((e) => (e.horario ?? '') >= agoraIso).reverse().slice(0, 3)
	};
};
