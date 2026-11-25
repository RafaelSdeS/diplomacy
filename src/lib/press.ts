import { linksAssinados } from './imagem.ts';
import { bilingue, t } from './i18n.svelte.ts';

export const TIPOS_NOTICIA: Record<string, string> = bilingue({
	nota_urgente: 'Nota urgente',
	reportagem: 'Reportagem',
	entrevista: 'Entrevista',
	opiniao: 'Opinião',
	charge: 'Charge'
});

// Passo 45, parte B: os estados da pergunta na coletiva oral.
export const SITUACAO_COLETIVA: Record<string, { rotulo: string; selo: string }> = {
	na_pauta: { get rotulo() { return t('Na pauta'); }, selo: '' },
	chamando: { get rotulo() { return t('Chamando'); }, selo: 'selo--alerta' },
	respondendo: { get rotulo() { return t('Respondendo'); }, selo: 'selo--info' },
	concluida: { get rotulo() { return t('Concluída'); }, selo: 'selo--ok' },
	retirada: { get rotulo() { return t('Retirada'); }, selo: 'selo--erro' }
};

/** A pergunta em andamento (chamando ou respondendo) e a próxima da pauta, pela ordem. */
export function andamentoDaPauta<T extends { status: string; ordem: number }>(perguntas: T[]) {
	const pela = [...perguntas].sort((a, b) => a.ordem - b.ordem);
	return {
		atual: pela.find((p) => p.status === 'chamando' || p.status === 'respondendo') ?? null,
		proxima: pela.find((p) => p.status === 'na_pauta') ?? null
	};
}

/** As imagens ficam num bucket privado: cada notícia ganha um link assinado (1 h). */
export async function comImagens<T extends { imagem_path: string | null }>(noticias: T[]) {
	const links = await linksAssinados('press', noticias.map((n) => n.imagem_path).filter((c) => c !== null));
	return noticias.map((n) => ({ ...n, imagem: n.imagem_path ? (links.get(n.imagem_path) ?? null) : null }));
}

// Passo 36: levar a matéria às redes do evento em um toque.

/** A legenda: título, linha fina e as hashtags do evento. */
export const legendaDaNoticia = (n: { titulo: string; linha_fina?: string | null }, tags: string) =>
	[n.titulo, n.linha_fina, tags].filter(Boolean).join('\n\n');

export const linkWhatsApp = (texto: string) => `https://wa.me/?text=${encodeURIComponent(texto)}`;

/** O X aceita 280 caracteres: corta sem partir palavra e põe reticências. */
export function textoParaX(texto: string, limite = 280) {
	if (texto.length <= limite) return texto;
	const corte = texto.slice(0, limite - 1);
	return `${corte.slice(0, corte.lastIndexOf(' ') > 0 ? corte.lastIndexOf(' ') : corte.length).trimEnd()}…`;
}

export const linkX = (texto: string) => `https://x.com/intent/post?text=${encodeURIComponent(textoParaX(texto))}`;
