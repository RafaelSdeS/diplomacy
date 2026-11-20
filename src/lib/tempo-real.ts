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

/**
 * Tudo o que muda ao vivo numa sessão do comitê. `aoConectar` diz se a conexão
 * está de pé (a tela mostra "Ao vivo" ou "Reconectando").
 */
export function assinarSessao(comiteId: string, aoMudar: () => void, aoConectar: (ok: boolean) => void): () => void {
	const filter = `comite_id=eq.${comiteId}`;
	const canal = supabase.channel(`sessao:${comiteId}`);
	for (const table of ['estado_sessao', 'pedido_fala', 'ponto_mocao', 'presenca']) {
		canal.on('postgres_changes', { event: '*', schema: 'public', table, filter }, aoMudar);
	}
	canal.subscribe((status) => aoConectar(status === 'SUBSCRIBED'));
	return () => {
		void supabase.removeChannel(canal);
	};
}
