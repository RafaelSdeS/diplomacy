import { linksAssinados } from './imagem.ts';
import { bilingue } from './i18n.svelte.ts';

export const TIPOS_NOTICIA: Record<string, string> = bilingue({
	nota_urgente: 'Nota urgente',
	reportagem: 'Reportagem',
	entrevista: 'Entrevista',
	opiniao: 'Opinião',
	charge: 'Charge'
});

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
