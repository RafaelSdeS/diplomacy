import { eventoDaSecretaria } from '#lib/secretaria.ts';
import { supabase, todasAsLinhas } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:checkin');
	const evento = eventoDaSecretaria((await parent()).participacoes);
	const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
	const [convites, checkins] = await Promise.all([
		todasAsLinhas((de, ate) =>
			supabase
				.from('convite')
				.select('email, nome, papel, comite(sigla), delegacao(nome)')
				.eq('evento_id', evento)
				.order('nome')
				.order('id')
				.range(de, ate)
		),
		todasAsLinhas((de, ate) =>
			supabase.from('checkin').select('email').eq('evento_id', evento).eq('dia', hoje).order('email').range(de, ate)
		)
	]);
	// Uma linha por pessoa, com todos os papéis dela.
	const pessoas = new Map<string, { email: string; nome: string; papeis: string[] }>();
	for (const c of convites) {
		const email = c.email.toLowerCase();
		const p = pessoas.get(email) ?? { email, nome: c.nome ?? email, papeis: [] };
		p.papeis.push([c.papel, c.delegacao?.nome, c.comite?.sigla].filter(Boolean).join(' · '));
		pessoas.set(email, p);
	}
	return {
		evento,
		pessoas: [...pessoas.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
		presentes: new Set(checkins.map((c) => c.email))
	};
};
