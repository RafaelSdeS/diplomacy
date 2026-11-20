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
		.subscribe((status) => status === 'SUBSCRIBED' && aoMudar());
	return () => {
		void supabase.removeChannel(canal);
	};
}

/** O que muda ao vivo numa sessão do comitê. */
export const TABELAS_SESSAO = ['estado_sessao', 'pedido_fala', 'ponto_mocao', 'presenca', 'lista_oradores', 'votacao', 'voto'];
/** O que muda ao vivo na crise do comitê (a RLS decide quem recebe cada nota). */
export const TABELAS_CRISE = ['nota_crise', 'atualizacao_comite'];
/** Blocos e documentos do comitê. */
export const TABELAS_BLOCOS = ['bloco_membro', 'documento'];

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
	return assinar(
		`comite:${comiteId}`,
		tabelas.map((table) => ({ table, filter: `comite_id=eq.${comiteId}` })),
		aoMudar,
		aoConectar
	);
}

/** Mudanças em tabelas de todo o evento, sem filtro (a RLS decide quem recebe o quê). */
export function assinarEvento(tabelas: string[], aoMudar: () => void, aoConectar: (ok: boolean) => void) {
	return assinar(
		'evento',
		tabelas.map((table) => ({ table })),
		aoMudar,
		aoConectar
	);
}

/** Tudo o que muda num documento: o próprio documento, cláusulas, propostas, comentários... */
export function assinarDocumento(documentoId: string, aoMudar: () => void, aoConectar: (ok: boolean) => void) {
	const filter = `documento_id=eq.${documentoId}`;
	return assinar(
		`documento:${documentoId}`,
		[
			{ table: 'documento', filter: `id=eq.${documentoId}` },
			...['clausula', 'proposta_alteracao', 'comentario', 'assinatura', 'rodada'].map((table) => ({ table, filter }))
		],
		aoMudar,
		aoConectar
	);
}

function assinar(
	nome: string,
	entradas: { table: string; filter?: string }[],
	aoMudar: () => void,
	aoConectar: (ok: boolean) => void
): () => void {
	const canal = supabase.channel(`${nome}:${crypto.randomUUID()}`);
	for (const { table, filter } of entradas) {
		canal.on('postgres_changes', { event: '*', schema: 'public', table, filter }, aoMudar);
	}
	// Quando a assinatura fica pronta, recarrega uma vez: o que mudou entre a leitura
	// da tela e a assinatura não se perde. (Não escute as mensagens 'system': com várias
	// assinaturas ao mesmo tempo, isso fez o tempo real parar de entregar mudanças.)
	canal.subscribe((status) => {
		aoConectar(status === 'SUBSCRIBED');
		if (status === 'SUBSCRIBED') aoMudar();
	});
	return () => {
		void supabase.removeChannel(canal);
	};
}
