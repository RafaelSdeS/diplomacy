import { error } from '@sveltejs/kit';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

// Passo 26: a página da delegação. A RLS decide o que aparece: delegados para quem é do
// comitê, DPOs conforme a regra do comitê, cartas públicas, matérias publicadas.
export const load: PageLoad = async ({ params, parent, depends }) => {
	const { comite } = await parent();
	depends('app:caderno');
	const [delegacao, delegados, dpos, cartas, citacoes, votos, bloqueios, anotacoes] = await Promise.all([
		supabase
			.from('delegacao')
			.select('id, nome, nome_oficial, bandeira, situacao')
			.eq('id', params.id)
			.eq('comite_id', comite.id)
			.maybeSingle(),
		supabase.from('participacao').select('id, pessoa(id, nome, bio, foto_path)').eq('delegacao_id', params.id).eq('papel', 'delegado'),
		supabase.from('dpo').select('id, topico, status').eq('delegacao_id', params.id).order('topico'),
		supabase
			.from('carta')
			.select('id, titulo, enviada_em')
			.eq('remetente_delegacao_id', params.id)
			.eq('publica', true)
			.order('enviada_em', { ascending: false }),
		supabase
			.from('citacao')
			.select('noticia!inner(id, titulo, publicada_em, status, veiculo(nome, comite(sigla)))')
			.eq('delegacao_id', params.id)
			.eq('noticia.status', 'publicada')
			.order('noticia(publicada_em)', { ascending: false })
			.limit(5),
		supabase
			.from('voto')
			.select('escolha, votacao!inner(id, objeto, aprovada, encerrada_em)')
			.eq('delegacao_id', params.id)
			.not('votacao.encerrada_em', 'is', null)
			.order('votacao(encerrada_em)', { ascending: false })
			.limit(10),
		supabase.from('bloqueio_bilhete').select('delegacao_id, bloqueada_id').or(`delegacao_id.eq.${params.id},bloqueada_id.eq.${params.id}`),
		// Passo 34: as anotações sobre esta delegação que a pessoa pode ler (a RLS decide).
		supabase.from('anotacao').select('id, texto, criado_em, delegacao_id').eq('sobre_delegacao_id', params.id).order('criado_em', { ascending: false })
	]);
	for (const r of [delegacao, delegados, dpos, cartas, citacoes, votos, bloqueios, anotacoes]) if (r.error) throw r.error;
	if (!delegacao.data) error(404, 'Delegação não encontrada.');

	// Fotos num bucket privado: um link assinado (1 h) para cada uma.
	const pessoas = delegados.data!.map((p) => p.pessoa).filter((p) => p !== null);
	const caminhos = pessoas.map((p) => p.foto_path).filter((c) => c !== null);
	const fotos = new Map<string, string>();
	if (caminhos.length) {
		const { data } = await supabase.storage.from('fotos').createSignedUrls(caminhos, 3600);
		for (const f of data ?? []) if (f.path && f.signedUrl) fotos.set(f.path, f.signedUrl);
	}

	return {
		delegacao: delegacao.data,
		delegados: pessoas.map((p) => ({ ...p, foto: p.foto_path ? (fotos.get(p.foto_path) ?? null) : null })),
		dpos: dpos.data!,
		cartas: cartas.data!,
		citacoes: citacoes.data!.map((c) => c.noticia),
		votos: votos.data!,
		bloqueios: bloqueios.data!,
		anotacoes: anotacoes.data!
	};
};
