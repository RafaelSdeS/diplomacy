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

// Passo 47: a prévia de um documento (DPO, carta, working paper ou projeto, notícia), no
// mesmo painel lateral. O documento completo segue com URL própria, para compartilhar e imprimir.
export type TipoPrevia = 'dpo' | 'carta' | 'documento' | 'noticia';
export const previa = $state({ tipo: 'dpo' as TipoPrevia, id: null as string | null, usada: false });

export function abrirPrevia(tipo: TipoPrevia, id: string) {
	previa.tipo = tipo;
	previa.id = id;
	previa.usada = true;
}

export function fecharPrevia() {
	previa.id = null;
}
