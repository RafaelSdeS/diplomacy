// Passo 43: "Ir para…", a busca por telas, delegações e documentos (Ctrl+K ou a lupa da
// faixa). O componente só carrega na primeira vez que alguém abre.
export const irPara = $state({ aberto: false, usado: false });

export function abrirIrPara() {
	irPara.usado = true;
	irPara.aberto = true;
}
