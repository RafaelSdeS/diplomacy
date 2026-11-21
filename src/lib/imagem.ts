import { supabase } from './supabase.ts';

// Fotos de perfil: reduzidas no próprio aparelho antes do envio, para gastar
// pouca internet móvel e pouco armazenamento.

export const LADO_MAXIMO = 512;

/** Tamanho final, mantendo a proporção; imagens pequenas não aumentam. */
export function dimensoesReduzidas(largura: number, altura: number, maximo = LADO_MAXIMO) {
	const escala = Math.min(1, maximo / Math.max(largura, altura));
	return { largura: Math.round(largura * escala), altura: Math.round(altura * escala) };
}

function codificar(canvas: HTMLCanvasElement, tipo: string): Promise<Blob | null> {
	return new Promise((resolver) => canvas.toBlob(resolver, tipo, 0.85));
}

/** Reduz para no máximo 512 px e gera WebP (ou JPEG nos navegadores que não geram WebP). */
export async function reduzirImagem(arquivo: Blob, maximo = LADO_MAXIMO): Promise<Blob> {
	const bitmap = await createImageBitmap(arquivo);
	const { largura, altura } = dimensoesReduzidas(bitmap.width, bitmap.height, maximo);
	const canvas = document.createElement('canvas');
	canvas.width = largura;
	canvas.height = altura;
	canvas.getContext('2d')?.drawImage(bitmap, 0, 0, largura, altura);
	bitmap.close();

	const webp = await codificar(canvas, 'image/webp');
	if (webp?.type === 'image/webp') return webp;
	const jpeg = await codificar(canvas, 'image/jpeg');
	if (!jpeg) throw new Error('Não foi possível processar a imagem.');
	return jpeg;
}

// Passo 40: links assinados das imagens dos buckets privados, guardados até 5 min antes
// de vencer. O mesmo link deixa o navegador reaproveitar a imagem que já baixou; um link
// novo a cada recarga baixava a imagem de novo.
// ponytail: a foto nova de outra pessoa pode levar até 1 h para aparecer.
const VALIDADE_S = 3600;
const links = new Map<string, { url: string; ate: number }>();

/** O link de cada caminho que existe no bucket (sem rede, os que já havia). */
export async function linksAssinados(bucket: 'press' | 'fotos', caminhos: string[]): Promise<Map<string, string>> {
	const agora = Date.now();
	const faltam = caminhos.filter((c) => (links.get(`${bucket}/${c}`)?.ate ?? 0) <= agora);
	if (faltam.length) {
		const { data } = await supabase.storage.from(bucket).createSignedUrls(faltam, VALIDADE_S);
		for (const l of data ?? []) if (l.path && l.signedUrl) links.set(`${bucket}/${l.path}`, { url: l.signedUrl, ate: agora + (VALIDADE_S - 300) * 1000 });
	}
	const achados = caminhos.map((c) => [c, links.get(`${bucket}/${c}`)?.url] as const);
	return new Map(achados.filter((a): a is readonly [string, string] => !!a[1]));
}

/** Depois de trocar uma imagem: o próximo pedido gera um link novo. */
export const esquecerLink = (bucket: 'press' | 'fotos', caminho: string) => links.delete(`${bucket}/${caminho}`);
