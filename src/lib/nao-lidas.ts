// Passo 61: as mensagens não lidas, sem migração. A hora da última leitura de cada conversa
// fica no aparelho; o que chegou depois dela, e não foi escrito por mim, conta.
export type Msg = { id: string; tipo: string; criado_em: string; de_delegacao_id: string | null; para_delegacao_id: string | null; bloco_id?: string | null };

/** A conversa da mensagem: o bilhete, pela outra delegação; a da mesa, pela delegação. */
export function conversa(m: Msg, minha: string | null): string | null {
	if (m.tipo === 'bilhete') return `b:${m.de_delegacao_id === minha ? m.para_delegacao_id : m.de_delegacao_id}`;
	if (m.tipo === 'mesa') return `m:${m.de_delegacao_id ?? m.para_delegacao_id}`;
	if (m.tipo === 'bloco') return `bl:${m.bloco_id}`; // passo 63: a conversa do bloco
	return null;
}

/** Chegou para mim: para a delegação, o bilhete recebido e a mensagem da mesa; para a mesa, a da delegação. */
export const chegou = (m: Msg, minha: string | null) =>
	minha
		? (m.tipo === 'bilhete' && m.para_delegacao_id === minha) ||
			(m.tipo === 'mesa' && !m.de_delegacao_id && m.para_delegacao_id === minha) ||
			(m.tipo === 'bloco' && m.de_delegacao_id !== minha)
		: m.tipo === 'mesa' && !!m.de_delegacao_id;

export function naoLidas<M extends Msg>(msgs: M[], minha: string | null, lidas: Record<string, number>): M[] {
	return msgs.filter((m) => {
		const c = conversa(m, minha);
		return !!c && chegou(m, minha) && Date.parse(m.criado_em) > (lidas[c] ?? 0);
	});
}

const chave = (comite: string) => `lidas:${comite}`;
export function lerLidas(comite: string): Record<string, number> {
	try {
		return JSON.parse(localStorage.getItem(chave(comite)) ?? '{}');
	} catch {
		return {};
	}
}
export function marcarLida(comite: string, ...conversas: string[]) {
	const lidas = lerLidas(comite);
	for (const c of conversas) lidas[c] = Date.now();
	localStorage.setItem(chave(comite), JSON.stringify(lidas));
	dispatchEvent(new Event('lidas'));
}

/** Passo 58: a publicação lida de cada documento da mesa; "novo" se nunca lido, "alterado" se mudou. */
export function marcarPublicacaoLida(comite: string, documento: string, versao: number) {
	const lidas = lerLidas(comite);
	lidas[`dm:${documento}`] = versao;
	localStorage.setItem(chave(comite), JSON.stringify(lidas));
}
export const seloDaPublicacao = (lidas: Record<string, number>, documento: string, versao: number) =>
	!lidas[`dm:${documento}`] ? 'novo' : lidas[`dm:${documento}`] < versao ? 'alterado' : null;
