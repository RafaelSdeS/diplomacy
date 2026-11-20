import { describe, expect, it } from 'vitest';
import { desenhar, FORMATOS, quebrar, SELO, type Formato } from './imagem-redes.ts';

// Um contexto 2D falso, que anota o que foi desenhado (cada letra mede 30 px).
function contextoFalso() {
	const textos: { texto: string; y: number }[] = [];
	const retangulos: { w: number; h: number }[] = [];
	return {
		textos,
		retangulos,
		ctx: {
			fillStyle: '',
			font: '',
			textAlign: 'left' as CanvasTextAlign,
			textBaseline: 'top' as CanvasTextBaseline,
			fillRect: (_x: number, _y: number, w: number, h: number) => void retangulos.push({ w, h }),
			fillText: (texto: string, _x: number, y: number) => void textos.push({ texto, y }),
			measureText: (texto: string) => ({ width: texto.length * 30 }) as TextMetrics
		}
	};
}

describe('imagem para as redes', () => {
	it.each(['post', 'story'] as Formato[])('%s: fundo no tamanho certo e o selo de simulação dentro da imagem', (formato) => {
		const { ctx, textos, retangulos } = contextoFalso();
		desenhar(ctx, formato, { veiculo: 'Al Jazeera', titulo: 'Brasil propõe trégua no Rio Aurora', linhaFina: 'Proposta divide o conselho' });
		expect(retangulos[0]).toEqual({ w: FORMATOS[formato].largura, h: FORMATOS[formato].altura });
		const selo = textos.find((t) => t.texto === SELO);
		expect(selo).toBeDefined();
		expect(selo!.y).toBeLessThan(FORMATOS[formato].altura);
	});

	it('post tem 1080 × 1080 e story 1080 × 1920', () => {
		expect(FORMATOS.post).toEqual({ largura: 1080, altura: 1080 });
		expect(FORMATOS.story).toEqual({ largura: 1080, altura: 1920 });
	});

	it('quebra a manchete em linhas que cabem na largura', () => {
		const { ctx } = contextoFalso();
		expect(quebrar(ctx, 'um dois três quatro', 300)).toEqual(['um dois', 'três', 'quatro']);
	});
});
