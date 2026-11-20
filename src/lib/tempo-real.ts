import { supabase } from './supabase.ts';

// Todas as assinaturas de tempo real ficam aqui. No passo 13 elas viram
// Broadcast sem mexer nas telas. Cada função devolve o "cancelar assinatura".

/** Avisos novos ou removidos (a RLS decide quem recebe o quê). */
export function assinarAvisos(aoMudar: () => void): () => void {
	const canal = supabase
		.channel('avisos')
		.on('postgres_changes', { event: '*', schema: 'public', table: 'aviso' }, aoMudar)
		.subscribe();
	return () => {
		void supabase.removeChannel(canal);
	};
}
