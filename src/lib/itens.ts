import type { ItemEsboco } from './votacao.ts';

// Passo 56: o editor de itens da agenda, sem sintaxe. A lista é plana, cada item com o nível
// (0 tópico, 1 subtópico, 2 ponto), como o esboço de lerEsboco. Toda mudança passa por
// normalizar: o primeiro item fica no nível 0 e nenhum desce mais de um nível em relação ao
// de cima. ponytail: mover e recuar valem para o item, não para os filhos dele; os filhos se
// ajustam pelo normalizar.
export const NIVEL_MAX = 2;

export function normalizar(itens: ItemEsboco[]): ItemEsboco[] {
	let anterior = -1;
	return itens.map((i) => {
		const nivel = Math.max(0, Math.min(i.nivel, anterior + 1, NIVEL_MAX));
		anterior = nivel;
		return { ...i, nivel };
	});
}

/** Sobe (delta -1) ou desce (+1) um nível. */
export const recuar = (itens: ItemEsboco[], i: number, delta: number) =>
	normalizar(itens.map((x, j) => (j === i ? { ...x, nivel: x.nivel + delta } : x)));

/** Troca o item de lugar com o de cima (-1) ou o de baixo (+1). */
export function mover(itens: ItemEsboco[], i: number, delta: number) {
	const j = i + delta;
	if (j < 0 || j >= itens.length) return itens;
	const novos = [...itens];
	[novos[i], novos[j]] = [novos[j], novos[i]];
	return normalizar(novos);
}

/** Um item vazio depois do i, no nível dado (o do i, por padrão). */
export function inserir(itens: ItemEsboco[], i: number, nivel = itens[i]?.nivel ?? 0) {
	const novos = [...itens];
	novos.splice(i + 1, 0, { texto: '', nivel });
	return normalizar(novos);
}

export const remover = (itens: ItemEsboco[], i: number) => normalizar(itens.filter((_, j) => j !== i));

/** Os itens que vão ao banco: sem os vazios. */
export const preenchidos = (itens: ItemEsboco[]) =>
	normalizar(itens.map((i) => ({ ...i, texto: i.texto.trim() })).filter((i) => i.texto));
