// Passo 43: "Voltar" leva à tela de onde a pessoa veio, não só à de cima na hierarquia.
// A pilha espelha o histórico dentro do app: cada navegação empilha a tela que ficou para
// trás; o voltar do navegador (ou o nosso, que usa history.back) desempilha. Quem chega por
// um link direto não tem pilha e vê a trilha.
export type Anterior = { href: string; titulo: string };

const pilha = $state<Anterior[]>([]);
let saindoDe = '';

/** A tela para onde "Voltar" leva, ou null. */
export const anterior = (): Anterior | null => pilha.at(-1) ?? null;

/** Antes de sair: o título da tela atual, sem o nome do evento (veja tituloDaAba). */
export function antesDeNavegar() {
	saindoDe = document.title.split(' · ')[0];
}

export function depoisDeNavegar({ type, delta, from }: { type: string; delta?: number; from: { url: URL } | null }) {
	if (type === 'enter' || !from || from.url.pathname.startsWith('/entrar')) {
		pilha.length = 0;
		return;
	}
	if (type === 'popstate') {
		// Para trás: desempilha. Para a frente não dá para saber de onde: recomeça.
		if (delta && delta < 0) pilha.splice(Math.max(0, pilha.length + delta));
		else pilha.length = 0;
		return;
	}
	pilha.push({ href: from.url.pathname + from.url.search, titulo: saindoDe });
}
