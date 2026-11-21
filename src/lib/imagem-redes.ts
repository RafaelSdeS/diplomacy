// Imagem da matéria para as redes da press (@press.ufrgsmun), gerada no aparelho:
// post (1080 × 1080) ou story (1080 × 1920), sempre com o selo de simulação.

export const FORMATOS = {
	post: { largura: 1080, altura: 1080 },
	story: { largura: 1080, altura: 1920 }
} as const;
export type Formato = keyof typeof FORMATOS;

// O nome do evento vem do banco (passo 27).
export const selo = (evento: string) => `Simulação · ${evento}`;
// ponytail: a hashtag usa a primeira palavra do nome do evento ("UFRGSMUN 2027" → #UFRGSMUN);
// um campo próprio no evento, quando outro evento usar o app.
export const hashtags = (evento: string) => {
	const tag = evento.split(/\s+/)[0].replace(/[^\p{L}\p{N}]/gu, '');
	return `#${tag} #Press${tag} #SimulaçãoDaONU`;
};

type Contexto = Pick<
	CanvasRenderingContext2D,
	'fillStyle' | 'font' | 'textAlign' | 'textBaseline' | 'fillRect' | 'fillText' | 'measureText'
>;

/** Quebra o texto em linhas que cabem na largura. */
export function quebrar(ctx: Pick<Contexto, 'measureText'>, texto: string, largura: number): string[] {
	const linhas: string[] = [];
	let atual = '';
	for (const palavra of texto.split(/\s+/).filter(Boolean)) {
		const tentativa = atual ? `${atual} ${palavra}` : palavra;
		if (ctx.measureText(tentativa).width > largura && atual) {
			linhas.push(atual);
			atual = palavra;
		} else atual = tentativa;
	}
	if (atual) linhas.push(atual);
	return linhas;
}

/** Desenha a imagem: o veículo no topo, a manchete, a linha fina e o selo de simulação. */
export function desenhar(
	ctx: Contexto,
	formato: Formato,
	materia: { veiculo: string; titulo: string; linhaFina?: string | null; evento: string }
) {
	const { largura, altura } = FORMATOS[formato];
	const margem = 80;
	ctx.fillStyle = '#1b365d';
	ctx.fillRect(0, 0, largura, altura);
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';

	ctx.fillStyle = '#c8a45c';
	ctx.font = '600 40px system-ui, sans-serif';
	ctx.fillText(materia.veiculo.toUpperCase(), margem, margem);

	ctx.fillStyle = '#ffffff';
	ctx.font = '600 76px Georgia, serif';
	let y = formato === 'story' ? altura * 0.3 : 220;
	for (const linha of quebrar(ctx, materia.titulo, largura - 2 * margem).slice(0, 6)) {
		ctx.fillText(linha, margem, y);
		y += 92;
	}
	if (materia.linhaFina) {
		ctx.font = '400 40px system-ui, sans-serif';
		y += 30;
		for (const linha of quebrar(ctx, materia.linhaFina, largura - 2 * margem).slice(0, 4)) {
			ctx.fillText(linha, margem, y);
			y += 54;
		}
	}

	ctx.fillStyle = '#c8a45c';
	ctx.fillRect(margem, altura - margem - 70, largura - 2 * margem, 4);
	ctx.fillStyle = '#ffffff';
	ctx.font = '600 36px system-ui, sans-serif';
	ctx.fillText(selo(materia.evento), margem, altura - margem - 40);
}

/** Gera o PNG no navegador. */
export async function gerarImagem(formato: Formato, materia: Parameters<typeof desenhar>[2]): Promise<Blob> {
	const canvas = document.createElement('canvas');
	canvas.width = FORMATOS[formato].largura;
	canvas.height = FORMATOS[formato].altura;
	desenhar(canvas.getContext('2d')!, formato, materia);
	return new Promise((pronto, falha) => canvas.toBlob((b) => (b ? pronto(b) : falha(new Error('PNG'))), 'image/png'));
}
