// Passo 58: a marcação simples dos documentos da mesa vira HTML seguro. Tudo é escapado antes;
// só entram títulos (# e ##), listas (- e 1.), negrito (**texto**) e links http(s) ([texto](url)).
// ponytail: sem tabelas nem imagens; um parser de Markdown se a mesa pedir mais que isso.

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const linha = (s: string) =>
	escapar(s)
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

export function marcacaoParaHtml(texto: string): string {
	const saida: string[] = [];
	let lista: 'ul' | 'ol' | null = null;
	let paragrafo: string[] = [];
	const fecharParagrafo = () => {
		if (paragrafo.length) saida.push(`<p>${paragrafo.map(linha).join('<br>')}</p>`);
		paragrafo = [];
	};
	const fecharLista = () => {
		if (lista) saida.push(`</${lista}>`);
		lista = null;
	};
	for (const bruta of texto.split('\n')) {
		const l = bruta.trimEnd();
		const titulo = /^(#{1,2})\s+(.*)$/.exec(l);
		const item = /^\s*(?:([-*])|\d+[.)])\s+(.*)$/.exec(l);
		if (titulo) {
			fecharParagrafo();
			fecharLista();
			const n = titulo[1].length + 1;
			saida.push(`<h${n}>${linha(titulo[2])}</h${n}>`);
		} else if (item) {
			fecharParagrafo();
			const tipo = item[1] ? 'ul' : 'ol';
			if (lista !== tipo) {
				fecharLista();
				saida.push(`<${tipo}>`);
				lista = tipo;
			}
			saida.push(`<li>${linha(item[2])}</li>`);
		} else if (!l.trim()) {
			fecharParagrafo();
			fecharLista();
		} else {
			fecharLista();
			paragrafo.push(l);
		}
	}
	fecharParagrafo();
	fecharLista();
	return saida.join('');
}
