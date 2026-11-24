// Passo 52: quais testes de ponta a ponta cobrem os arquivos alterados. Os testes não
// importam as telas (abrem pela URL), então o mapa sai do código: um arquivo de src/lib
// leva às telas que o importam, e a tela leva aos testes que citam a rota dela.
// ponytail: heurística pela rota; o que ela não pegar, a suíte inteira antes do commit pega.

/** O que muda tudo: layout raiz, estilos, configuração, banco e os auxiliares dos testes. */
const TUDO = [
	/^src\/routes\/\+layout\./,
	/^src\/routes\/\+page\./, // a Agora: quase todo teste passa por ela ao entrar
	/^src\/app\.(css|html)$/,
	/^src\/(hooks|service-worker)/,
	/^supabase\//,
	/^tests\/(?!.*\.spec\.ts$)/,
	/^(playwright\.config\.ts|package(-lock)?\.json|svelte\.config\.js|vite\.config\.ts)$/
];

/** O pedaço da rota que os testes citam: o último segmento que não é parâmetro. */
function chaveDaRota(arquivo: string) {
	const segmentos = arquivo
		.replace(/^src\/routes\//, '')
		.split('/')
		.slice(0, -1)
		.filter((s) => !s.startsWith('[') && !s.startsWith('('));
	return segmentos.at(-1);
}

/**
 * Os arquivos de teste para os alterados, ou 'todos'. `fontes` e `testes` mapeiam o caminho
 * ao conteúdo (de src/ e de tests/*.spec.ts).
 */
export function testesDaMudanca(alterados: string[], fontes: Record<string, string>, testes: Record<string, string>): string[] | 'todos' {
	const achados = new Set<string>();
	const vistos = new Set<string>();
	const fila = [...alterados];
	while (fila.length) {
		const arquivo = fila.shift()!;
		if (vistos.has(arquivo)) continue;
		vistos.add(arquivo);
		if (TUDO.some((r) => r.test(arquivo))) return 'todos';
		if (/^tests\/.*\.spec\.ts$/.test(arquivo)) {
			if (arquivo in testes) achados.add(arquivo);
		} else if (arquivo.startsWith('src/routes/')) {
			const chave = chaveDaRota(arquivo);
			if (!chave) return 'todos';
			for (const [teste, texto] of Object.entries(testes)) if (texto.includes(`/${chave}`)) achados.add(teste);
		} else if (arquivo.startsWith('src/lib/')) {
			// Quem importa este arquivo (pelo nome, com a pasta de ui quando é componente).
			const nome = arquivo.replace(/^src\/lib\//, '');
			for (const [fonte, texto] of Object.entries(fontes))
				if (fonte !== arquivo && (texto.includes(`/${nome}'`) || texto.includes(`./${nome.split('/').at(-1)}'`))) fila.push(fonte);
		}
	}
	return [...achados].sort();
}
