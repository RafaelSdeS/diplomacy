import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase.ts';

// Todo o tempo real passa por aqui (passo 13: Broadcast em canais privados). O banco
// manda um aviso curto, "mudou", com o nome da tabela e sem os dados da linha; a tela
// recarrega pela API, com a RLS de sempre. Quem pode entrar em cada canal está em
// public.pode_ouvir. Cada função devolve o "cancelar assinatura".

/** O que muda ao vivo numa sessão do comitê. */
export const TABELAS_SESSAO = [
	'estado_sessao',
	'pedido_fala',
	'ponto_mocao',
	'presenca',
	'lista_oradores',
	'votacao',
	'voto',
	'documento'
];
/** O que muda ao vivo na crise do comitê. */
export const TABELAS_CRISE = ['nota_crise', 'atualizacao_comite'];
/** Blocos e documentos do comitê. */
export const TABELAS_BLOCOS = ['bloco_membro', 'documento'];

type Ouvinte = { tabelas: Set<string> | null; aoMudar: () => void; aoConectar: (ok: boolean) => void };
type Canal = { ouvintes: Set<Ouvinte>; conectado: boolean; canal?: RealtimeChannel; saida?: ReturnType<typeof setTimeout> };

// Um canal por tópico, dividido entre as telas: o realtime-js reaproveita o canal
// pelo nome. Quando a última tela sai, o canal fica mais um pouco, para a próxima tela
// do mesmo comitê; a saída de um canal termina antes de um novo com o mesmo nome.
const canais = new Map<string, Canal>();
const saindo = new Map<string, Promise<unknown>>();
const ESPERA_SAIDA_MS = 5_000;

function ouvir(topico: string, ouvinte: Ouvinte): () => void {
	let c = canais.get(topico);
	if (!c) {
		const novo: Canal = { ouvintes: new Set(), conectado: false };
		canais.set(topico, novo);
		void (async () => {
			await saindo.get(topico);
			if (canais.get(topico) !== novo) return;
			novo.canal = supabase
				.channel(topico, { config: { private: true } })
				.on('broadcast', { event: 'mudou' }, ({ payload }) => {
					for (const o of novo.ouvintes) if (!o.tabelas || o.tabelas.has(payload?.tabela)) o.aoMudar();
				})
				// Ao entrar (e ao voltar depois de uma queda), recarrega: o que mudou enquanto
				// a tela estava sem canal não se perde.
				.subscribe((status) => {
					novo.conectado = status === 'SUBSCRIBED';
					for (const o of novo.ouvintes) {
						o.aoConectar(novo.conectado);
						if (novo.conectado) o.aoMudar();
					}
				});
		})();
		c = novo;
	}
	const canal = c;
	clearTimeout(canal.saida);
	canal.ouvintes.add(ouvinte);
	if (canal.conectado) {
		ouvinte.aoConectar(true);
		ouvinte.aoMudar();
	}
	return () => {
		canal.ouvintes.delete(ouvinte);
		if (canal.ouvintes.size) return;
		canal.saida = setTimeout(() => {
			canais.delete(topico);
			if (canal.canal) {
				const saida = supabase.removeChannel(canal.canal);
				saindo.set(topico, saida);
				void saida.finally(() => saindo.get(topico) === saida && saindo.delete(topico));
			}
		}, ESPERA_SAIDA_MS);
	};
}

/**
 * Ouve vários canais de uma vez. `aoConectar` diz se todos estão de pé (a tela mostra
 * "Ao vivo" ou "Conectando"). Sem `tabelas`, qualquer mudança no canal conta.
 */
export function assinar(
	topicos: string[],
	tabelas: string[] | null,
	aoMudar: () => void,
	aoConectar: (ok: boolean) => void = () => {}
): () => void {
	const filtro = tabelas ? new Set(tabelas) : null;
	const conectados = new Set<string>();
	const cancelar = topicos.map((topico) =>
		ouvir(topico, {
			tabelas: filtro,
			aoMudar,
			aoConectar: (ok) => {
				if (ok) conectados.add(topico);
				else conectados.delete(topico);
				aoConectar(conectados.size === topicos.length);
			}
		})
	);
	return () => cancelar.forEach((c) => c());
}

/** Avisos novos ou removidos nos eventos da pessoa. */
export function assinarAvisos(eventos: string[], aoMudar: () => void): () => void {
	return assinar(
		eventos.map((e) => `evento:${e}`),
		['aviso'],
		aoMudar
	);
}
