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
