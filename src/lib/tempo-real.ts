import type { RealtimeChannel } from '@supabase/supabase-js';
import { invalidate } from '$app/navigation';
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
	'aviso_chegada',
	'incidente_comite',
	'incidente_efeito',
	'lista_oradores',
	'votacao',
	'voto',
	'documento',
	// Passo 56: a trilha do tópico (agenda adotada).
	'proposta_agenda',
	// Passo 40: com a releitura por tabela, o que a tela mostra precisa do próprio aviso.
	'proximo_orador',
	'assinatura_mocao',
	'passe',
	'representacao',
	'emenda',
	'emenda_assinatura'
];
/** O que muda ao vivo na crise do comitê. */
export const TABELAS_CRISE = ['nota_crise', 'atualizacao_comite', 'incidente_comite', 'incidente_efeito'];
/** Blocos e documentos do comitê. */
export const TABELAS_BLOCOS = ['bloco_membro', 'documento'];

// `aoMudar` recebe a tabela que mudou, ou null quando tudo pode ter mudado (ao conectar).
type Ouvinte = { tabelas: Set<string> | null; aoMudar: (tabela: string | null) => void; aoConectar: (ok: boolean) => void };
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
					for (const o of novo.ouvintes) if (!o.tabelas || o.tabelas.has(payload?.tabela)) o.aoMudar(payload?.tabela ?? null);
				})
				// Ao entrar (e ao voltar depois de uma queda), recarrega: o que mudou enquanto
				// a tela estava sem canal não se perde.
				.subscribe((status) => {
					novo.conectado = status === 'SUBSCRIBED';
					for (const o of novo.ouvintes) {
						o.aoConectar(novo.conectado);
						if (novo.conectado) o.aoMudar(null);
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
		ouvinte.aoMudar(null);
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
	aoMudar: (tabela: string | null) => void,
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
export function assinarAvisos(eventos: string[], aoMudar: (tabela: string | null) => void): () => void {
	return assinar(
		eventos.map((e) => `evento:${e}`),
		['aviso'],
		aoMudar
	);
}

// Passo 40: numa recarga causada pelo tempo real, só se relê o que usa uma tabela que
// mudou; o resto devolve a última leitura. Navegar, recarregar à mão e reconectar
// releem tudo, porque aí `pendentes` é 0 (ou `tudo` está ligado).
// ponytail: um `invalidate` feito à mão durante uma recarga ao vivo pode reaproveitar uma
// leitura antiga; ela se corrige no aviso seguinte do banco, que chega logo depois.
const mudadas = new Set<string>();
let tudo = false;
let pendentes = 0;
const lidas = new Map<string, Promise<unknown>>();

/** Recarrega a dependência relendo só as leituras das `tabelas` (null: todas). */
export async function recarregarAoVivo(dependencia: `${string}:${string}`, tabelas: Iterable<string> | null) {
	if (tabelas) for (const t of tabelas) mudadas.add(t);
	else tudo = true;
	pendentes++;
	try {
		await invalidate(dependencia);
	} finally {
		if (--pendentes === 0) {
			mudadas.clear();
			tudo = false;
		}
	}
}

/**
 * Uma leitura de tela ao vivo. `chave` identifica a consulta (com os ids); `tabelas` são
 * as que ela lê, inclusive as embutidas e as que uma função consulta.
 */
export function lerAoVivo<T>(chave: string, tabelas: string[], ler: () => PromiseLike<T>): Promise<T> {
	const anterior = lidas.get(chave) as Promise<T> | undefined;
	if (anterior && pendentes > 0 && !tudo && !tabelas.some((t) => mudadas.has(t))) return anterior;
	const leitura = Promise.resolve(ler());
	lidas.set(chave, leitura);
	// Uma falha (sem rede, por exemplo) não fica guardada.
	leitura.then(
		(r) => (r as { error?: unknown } | null)?.error && lidas.delete(chave),
		() => lidas.delete(chave)
	);
	return leitura;
}

/** Ao sair da conta: nada lido por uma pessoa serve para a próxima. */
export const esquecerLeituras = () => lidas.clear();
