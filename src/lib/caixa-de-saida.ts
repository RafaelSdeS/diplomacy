// Caixa de saída: o que se escreve sem internet não se perde. Cada envio (nota de
// crise, matéria, proposta de alteração) tem um id gerado no aparelho e vai para o
// IndexedDB antes de sair; o banco ignora um id repetido, então reenviar nunca duplica.
// Reenvia ao voltar a rede, ao voltar o app para a frente e ao abrir o app (o Safari
// não tem Background Sync, e nada depende dele).
import { createStore, del, entries, set, type UseStore } from 'idb-keyval';

export type Item = {
	id: string;
	rpc: string;
	args: Record<string, unknown>;
	rotulo: string; // "Nota de crise: Ataque ao porto", para o indicador
	criadoEm: number;
	imagem?: { bucket: string; caminho: string; blob: Blob };
};
export type Falha = { code?: string; message?: string } | null;
export type Resultado = 'enviado' | 'guardado' | { erro: Falha };

/**
 * Erro do banco ou da API (definitivo: o item sai da caixa) ou de rede (tenta de novo)?
 * Login vencido (PGRST301, HTTP401) também tenta de novo: depois de muito tempo sem
 * internet, o app renova o login antes do próximo envio.
 */
export const definitivo = (erro: NonNullable<Falha>) => {
	const codigo = erro.code ?? '';
	if (['PGRST301', 'HTTP401', 'HTTP408', 'HTTP429'].includes(codigo)) return false;
	return /^([0-9A-Z]{5}|PGRST\d+|HTTP4\d\d)$/.test(codigo);
};

export function criarCaixa(enviar: (item: Item) => Promise<Falha>, loja: UseStore = createStore('diplomacy', 'caixa-de-saida')) {
	const emAndamento = new Map<string, Promise<Resultado>>();
	const ouvintes = new Set<() => void>();
	const avisar = () => ouvintes.forEach((o) => o());

	function tentar(item: Item): Promise<Resultado> {
		// O mesmo item nunca sai duas vezes ao mesmo tempo.
		const atual = emAndamento.get(item.id);
		if (atual) return atual;
		const envio = (async (): Promise<Resultado> => {
			try {
				const erro = await enviar(item);
				if (erro && !definitivo(erro)) return 'guardado';
				await del(item.id, loja); // só sai da caixa depois de confirmado (ou recusado de vez)
				return erro ? { erro } : 'enviado';
			} catch {
				return 'guardado';
			} finally {
				emAndamento.delete(item.id);
				avisar();
			}
		})();
		emAndamento.set(item.id, envio);
		return envio;
	}

	return {
		/** Guarda e tenta enviar na hora. */
		async enviar(item: Omit<Item, 'criadoEm'>): Promise<Resultado> {
			const completo = { ...item, criadoEm: Date.now() };
			await set(item.id, completo, loja);
			avisar();
			return tentar(completo);
		},
		/** Tenta de novo tudo o que está guardado, do mais antigo ao mais novo. */
		async reenviar() {
			const itens = (await entries<string, Item>(loja)).map(([, item]) => item).sort((a, b) => a.criadoEm - b.criadoEm);
			const resultados: Resultado[] = [];
			for (const item of itens) resultados.push(await tentar(item));
			return resultados;
		},
		async pendentes() {
			return (await entries<string, Item>(loja)).map(([, item]) => item);
		},
		ouvir(ouvinte: () => void) {
			ouvintes.add(ouvinte);
			return () => void ouvintes.delete(ouvinte);
		}
	};
}
