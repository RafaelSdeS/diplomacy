// Passo 51: o "Voltar" devolve a tela como estava. A rolagem da janela o SvelteKit já devolve;
// aqui, a das colunas que rolam por dentro (painel, crise, listas da secretaria, conversas).
const COLUNAS = '.painel > .painel-coluna, .crise > .cartao, .colunas-que-rolam > .cartao, .chat-itens';

export const capturarRolagens = (): number[] => [...document.querySelectorAll<HTMLElement>(COLUNAS)].map((e) => e.scrollTop);

export function restaurarRolagens(valores: number[]) {
	// Depois de a tela desenhar as colunas, com os dados da navegação.
	requestAnimationFrame(() =>
		requestAnimationFrame(() =>
			document.querySelectorAll<HTMLElement>(COLUNAS).forEach((e, i) => {
				if (valores[i]) e.scrollTop = valores[i];
			})
		)
	);
}
