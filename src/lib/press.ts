import { supabase } from './supabase.ts';
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
	const caminhos = noticias.map((n) => n.imagem_path).filter((c) => c !== null);
	const links = new Map<string, string>();
	if (caminhos.length) {
		const { data, error } = await supabase.storage.from('press').createSignedUrls(caminhos, 3600);
		if (error) throw error;
		for (const l of data) if (l.path && l.signedUrl) links.set(l.path, l.signedUrl);
	}
	return noticias.map((n) => ({ ...n, imagem: n.imagem_path ? (links.get(n.imagem_path) ?? null) : null }));
}
