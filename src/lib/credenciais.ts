import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase.ts';

/**
 * Entra com o código do crachá ou com o código da secretaria: a Edge Function troca o
 * código por um link de login, e o app troca o link por uma sessão. Devolve a mensagem
 * de erro, ou null se entrou.
 */
export async function entrarComCodigo(codigo: string): Promise<string | null> {
	const { data, error } = await supabase.functions.invoke<{ token_hash: string }>('entrar-com-cracha', {
		body: { codigo: codigo.trim() }
	});
	if (error || !data) {
		if (error instanceof FunctionsHttpError) {
			const corpo = await error.context.json().catch(() => null);
			if (corpo?.erro) return corpo.erro as string;
		}
		return 'Não foi possível entrar agora. Confira a internet e tente de novo.';
	}
	const sessao = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'email' });
	return sessao.error ? 'Não foi possível entrar agora. Tente de novo em instantes.' : null;
}
