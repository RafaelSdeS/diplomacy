// O cronômetro da sessão. O banco guarda só início, duração e o que restava na
// pausa; cada aparelho calcula o tempo que falta, com o relógio corrigido pelo
// do servidor. Nada é enviado a cada segundo.

export type Cronometro = {
	cronometro_inicio: string | null;
	cronometro_duracao_seg: number | null;
	cronometro_pausado_restante_seg: number | null;
};

export type Fase = 'parado' | 'correndo' | 'pausado' | 'aviso' | 'esgotado';

/** Segundos que faltam, arredondados para cima; null sem cronômetro. */
export function restanteSeg(c: Cronometro, agoraMs: number): number | null {
	if (c.cronometro_pausado_restante_seg !== null) return c.cronometro_pausado_restante_seg;
	if (c.cronometro_inicio === null || c.cronometro_duracao_seg === null) return null;
	const decorrido = (agoraMs - Date.parse(c.cronometro_inicio)) / 1000;
	return Math.max(0, Math.ceil(c.cronometro_duracao_seg - decorrido));
}

/** O aviso começa quando faltam `avisoSeg` segundos (o guia diz 10). */
export function fase(c: Cronometro, restante: number | null, avisoSeg: number): Fase {
	if (restante === null) return 'parado';
	if (restante === 0) return 'esgotado';
	if (c.cronometro_pausado_restante_seg !== null) return 'pausado';
	return restante <= avisoSeg ? 'aviso' : 'correndo';
}

export const formatarTempo = (seg: number) => `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;

/**
 * Quanto o relógio do servidor está à frente do aparelho, a partir de uma ida e
 * volta: supõe que a resposta saiu no meio do caminho.
 */
export const diferencaRelogio = (antesMs: number, servidorIso: string, depoisMs: number) =>
	Date.parse(servidorIso) - (antesMs + depoisMs) / 2;
