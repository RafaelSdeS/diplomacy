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

/** O que muda ao vivo numa sessão do comitê. */
export const TABELAS_SESSAO = ['estado_sessao', 'pedido_fala', 'ponto_mocao', 'presenca', 'lista_oradores', 'votacao', 'voto'];
/** O que muda ao vivo na crise do comitê (a RLS decide quem recebe cada nota). */
export const TABELAS_CRISE = ['nota_crise', 'atualizacao_comite'];

/**
 * Mudanças nas tabelas de um comitê, filtradas pelo comitê. `aoConectar` diz se a
 * conexão está de pé (a tela mostra "Ao vivo" ou "Conectando").
 */
export function assinarComite(
	comiteId: string,
	tabelas: string[],
	aoMudar: () => void,
	aoConectar: (ok: boolean) => void
): () => void {
	const filter = `comite_id=eq.${comiteId}`;
	const canal = supabase.channel(`comite:${comiteId}:${crypto.randomUUID()}`);
	for (const table of tabelas) {
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
