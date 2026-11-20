import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CHAVE, SUPABASE_URL } from '$app/env/public';
import type { Database } from './database.types.ts';

// Cliente único do app. A sessão fica no navegador e é renovada sozinha.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_CHAVE);

export type Participacao = Database['public']['Views']['minhas_participacoes']['Row'];
export type Papel = Database['public']['Enums']['papel'];

/**
 * Todas as linhas de uma consulta, em páginas de 1000 (a API devolve no máximo isso de
 * uma vez). A consulta precisa de uma ordem estável.
 */
export async function todasAsLinhas<T>(
	consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
	const linhas: T[] = [];
	for (let de = 0; ; de += 1000) {
		const { data, error } = await consulta(de, de + 999);
		if (error) throw error;
		linhas.push(...(data ?? []));
		if (!data || data.length < 1000) return linhas;
	}
}
