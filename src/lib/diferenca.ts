// Passo 58 (e o 49 depois): o que entrou e o que saiu entre dois textos, palavra por palavra.
// Corta o começo e o fim iguais e compara o meio pela maior subsequência comum.
// ponytail: O(n·m) no meio; acima de ~4 milhões de pares, o meio vira "saiu tudo, entrou tudo".

export type Trecho = { tipo: 'igual' | 'entrou' | 'saiu'; texto: string };

const LIMITE = 4_000_000;

export function diferencaPorPalavra(antes: string, depois: string): Trecho[] {
	const a = antes.split(/(\s+)/).filter(Boolean);
	const b = depois.split(/(\s+)/).filter(Boolean);
	let ini = 0;
	while (ini < a.length && ini < b.length && a[ini] === b[ini]) ini++;
	let fim = 0;
	while (fim < a.length - ini && fim < b.length - ini && a[a.length - 1 - fim] === b[b.length - 1 - fim]) fim++;
	const ma = a.slice(ini, a.length - fim);
	const mb = b.slice(ini, b.length - fim);
	const trechos: Trecho[] = [];
	const por = (tipo: Trecho['tipo'], texto: string) => {
		if (!texto) return;
		const ultimo = trechos.at(-1);
		if (ultimo?.tipo === tipo) ultimo.texto += texto;
		else trechos.push({ tipo, texto });
	};
	por('igual', a.slice(0, ini).join(''));
	if (ma.length * mb.length > LIMITE) {
		por('saiu', ma.join(''));
		por('entrou', mb.join(''));
	} else {
		// lcs[i][j]: a maior subsequência comum de ma[i..] e mb[j..].
		const lcs = Array.from({ length: ma.length + 1 }, () => new Uint32Array(mb.length + 1));
		for (let i = ma.length - 1; i >= 0; i--)
			for (let j = mb.length - 1; j >= 0; j--) lcs[i][j] = ma[i] === mb[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
		let i = 0;
		let j = 0;
		while (i < ma.length || j < mb.length) {
			if (i < ma.length && j < mb.length && ma[i] === mb[j]) {
				por('igual', ma[i++]);
				j++;
			} else if (i < ma.length && (j === mb.length || lcs[i + 1][j] >= lcs[i][j + 1])) por('saiu', ma[i++]);
			else por('entrou', mb[j++]);
		}
	}
	por('igual', a.slice(a.length - fim).join(''));
	return trechos;
}
