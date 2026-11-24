// Passo 47: desfazer no lugar de confirmar, quando a ação tem volta (retirar ponto, remover
// item não enviado). A ação espera alguns segundos antes de valer; "Desfazer" a cancela.
// ponytail: o tempo corre só nesta tela; fechar o app antes cancela (a pessoa refaz).
export const ESPERA_MS = 5000;

/** As ações esperando, pela chave de quem chamou (o id do ponto ou do item). */
export const adiadas = $state<Record<string, ReturnType<typeof setTimeout>>>({});

// Os testes encurtam a espera (window.__esperaDesfazer) para não esperar 5 s de verdade (passo 52).
const espera = () => (globalThis as { __esperaDesfazer?: number }).__esperaDesfazer ?? ESPERA_MS;

export function adiar(chave: string, acao: () => unknown) {
	desfazer(chave);
	adiadas[chave] = setTimeout(() => {
		delete adiadas[chave];
		void acao();
	}, espera());
}

export function desfazer(chave: string) {
	clearTimeout(adiadas[chave]);
	delete adiadas[chave];
}
