// O caderno da delegação (passo 34).

/** Quanto tempo leva para ler o texto em voz alta, em segundos (130 palavras por minuto). */
export function estimarDuracao(texto: string, palavrasPorMinuto = 130) {
	const palavras = texto.split(/\s+/).filter(Boolean).length;
	return Math.round((palavras / palavrasPorMinuto) * 60);
}
