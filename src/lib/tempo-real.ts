import { supabase } from './supabase.ts';

// Todas as assinaturas de tempo real ficam aqui. No passo 13 elas viram
// Broadcast sem mexer nas telas. Cada função devolve o "cancelar assinatura".
// Cada assinatura tem um canal com nome próprio: o realtime-js reaproveita um canal
// pelo nome, e a saída do anterior (ao trocar de tela) termina depois.

/** Avisos novos ou removidos (a RLS decide quem recebe o quê). */
export function assinarAvisos(aoMudar: () => void): () => void {
	const canal = supabase
		.channel(`avisos:${crypto.randomUUID()}`)
		.on('postgres_changes', { event: '*', schema: 'public', table: 'aviso' }, aoMudar)
		// Quando a assinatura fica pronta, recarrega uma vez: o que mudou entre a
		// leitura da tela e a assinatura não se perde.
		.on('system', {}, aoMudar)
		.subscribe((status) => status === 'SUBSCRIBED' && aoMudar());
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
	const canal = supabase.channel(`sessao:${comiteId}:${crypto.randomUUID()}`);
	for (const table of ['estado_sessao', 'pedido_fala', 'ponto_mocao', 'presenca', 'lista_oradores', 'votacao', 'voto']) {
		canal.on('postgres_changes', { event: '*', schema: 'public', table, filter }, aoMudar);
	}
	// Quando a assinatura fica pronta (e o Postgres confirma), recarrega uma vez: o
	// que mudou entre a leitura da tela e a assinatura não se perde.
	canal.on('system', {}, aoMudar);
	canal.subscribe((status) => {
		aoConectar(status === 'SUBSCRIBED');
		if (status === 'SUBSCRIBED') aoMudar();
	});
	return () => {
		void supabase.removeChannel(canal);
	};
}
