// Hora relativa (passo 38): "há 2 minutos", "há 1 hora", no idioma da pessoa.

const UNIDADES: [Intl.RelativeTimeFormatUnit, number][] = [
	['day', 86_400],
	['hour', 3_600],
	['minute', 60]
];

export function horaRelativa(iso: string, agoraMs: number, lingua: string) {
	const seg = Math.round((Date.parse(iso) - agoraMs) / 1000);
	const formato = new Intl.RelativeTimeFormat(lingua, { numeric: 'auto' });
	for (const [unidade, tamanho] of UNIDADES) {
		if (Math.abs(seg) >= tamanho) return formato.format(Math.trunc(seg / tamanho), unidade);
	}
	return formato.format(0, 'second'); // "agora", "now"
}
