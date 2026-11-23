// Rascunhos no aparelho (passo 38): o texto em edição sobrevive a recarregar a página
// ou a fechar o app. Aba anônima ou armazenamento bloqueado não quebram nada.

const CHAVE = (chave: string) => `rascunho:${chave}`;

export function lerRascunho(chave: string) {
	try {
		return localStorage.getItem(CHAVE(chave)) ?? '';
	} catch {
		return '';
	}
}

/** Passo 44: ao sair da conta, nenhum rascunho fica no aparelho. */
export function esquecerRascunhos() {
	try {
		for (const chave of Object.keys(localStorage)) if (chave.startsWith(CHAVE(''))) localStorage.removeItem(chave);
	} catch {
		// sem armazenamento: não há o que apagar
	}
}

/** Guarda o texto; vazio (depois de enviar) apaga o rascunho. */
export function guardarRascunho(chave: string, texto: string) {
	try {
		if (texto.trim()) localStorage.setItem(CHAVE(chave), texto);
		else localStorage.removeItem(CHAVE(chave));
	} catch {
		// sem armazenamento: o rascunho só não sobrevive
	}
}
