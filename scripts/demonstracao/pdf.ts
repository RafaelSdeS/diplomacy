// Passo 53: o DPO é um PDF. A demonstração (e os testes) geram um simples a partir do texto:
// A4, Helvetica, título em negrito e o texto quebrado em linhas, 52 por página.
// ponytail: só caracteres Latin-1 (o resto vira "?"); sem hifenização nem justificação.

const latin1 = (s: string) =>
	s
		.replace(/[“”]/g, '"')
		.replace(/[‘’]/g, "'")
		.replace(/[–—]/g, '-')
		.replace(/[^\x00-\xff]/g, '?');
const escapar = (s: string) => latin1(s).replace(/[\\()]/g, (c) => '\\' + c);

function quebrar(texto: string, largura = 95): string[] {
	const linhas: string[] = [];
	for (const paragrafo of texto.split('\n')) {
		let linha = '';
		for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
			if (linha && `${linha} ${palavra}`.length > largura) {
				linhas.push(linha);
				linha = palavra;
			} else linha = linha ? `${linha} ${palavra}` : palavra;
		}
		linhas.push(linha);
	}
	return linhas;
}

export function pdfDeTexto(titulo: string, texto: string): Buffer {
	const linhas = quebrar(texto);
	const paginas: string[][] = [];
	for (let i = 0; i < linhas.length; i += 52) paginas.push(linhas.slice(i, i + 52));
	if (!paginas.length) paginas.push([]);
	// Objetos 1 a 4: catálogo, páginas e as duas fontes; depois, conteúdo e página, um par por página.
	const objetos = [
		'<< /Type /Catalog /Pages 2 0 R >>',
		'',
		'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
		'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
	];
	const filhas: number[] = [];
	paginas.forEach((ls, p) => {
		const titulo1 = p === 0 ? `/F2 14 Tf 16 TL (${escapar(titulo)}) Tj T* T* ` : '';
		const corpo = `BT 56 790 Td ${titulo1}/F1 11 Tf 14 TL ${ls.map((l) => `(${escapar(l)}) Tj T*`).join(' ')} ET`;
		const n = objetos.length + 1;
		objetos.push(`<< /Length ${corpo.length} >>\nstream\n${corpo}\nendstream`);
		objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${n} 0 R >>`);
		filhas.push(n + 1);
	});
	objetos[1] = `<< /Type /Pages /Kids [${filhas.map((k) => `${k} 0 R`).join(' ')}] /Count ${filhas.length} >>`;
	let saida = '%PDF-1.4\n';
	const posicoes = objetos.map((o, i) => {
		const pos = saida.length;
		saida += `${i + 1} 0 obj\n${o}\nendobj\n`;
		return pos;
	});
	const xref = saida.length;
	saida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${posicoes.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('')}`;
	saida += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
	return Buffer.from(saida, 'latin1');
}
