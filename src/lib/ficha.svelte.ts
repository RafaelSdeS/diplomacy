// Passo 43: a ficha da delegação abre por cima da tela ao vivo (painel, sessão), sem sair
// dela. Um diálogo só, no layout; quem quer abrir chama abrirFicha.
export const ficha = $state({ sigla: '', id: null as string | null, usada: false });

export function abrirFicha(sigla: string, id: string) {
	ficha.sigla = sigla;
	ficha.id = id;
	ficha.usada = true;
}

export function fecharFicha() {
	ficha.id = null;
}
