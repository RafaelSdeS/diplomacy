import { error } from '@sveltejs/kit';
import type { Participacao } from './supabase.ts';

/** O evento da secretaria logada; quem não é da secretaria recebe 403. */
export function eventoDaSecretaria(participacoes: Participacao[]) {
	const evento = participacoes.find((p) => p.papel === 'secretaria')?.evento_id;
	if (!evento) error(403, 'Só a secretaria do evento acessa esta página.');
	return evento;
}
