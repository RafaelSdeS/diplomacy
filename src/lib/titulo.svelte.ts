// O nome do app e o do evento (passo 27). Diplomacy é a marca do app; o evento
// (UFRGSMUN, por exemplo) vem do banco, preenchido pelo layout com a participação da
// pessoa. Sem login, só "Diplomacy".
export const APP = 'Diplomacy';
// Passo 54: os créditos da página "Sobre" (decididos em 24/11/2026).
export const CRIADOR = { nome: 'Rafael Silva de Souza', site: 'https://rafaelsdes.github.io/' };
export const marca = $state<{ evento: string | null }>({ evento: null });

/** O título da aba: as partes, e no fim o nome do evento (ou do app). */
export const tituloDaAba = (...partes: (string | null | undefined)[]) =>
	[...partes.filter((p) => p), marca.evento ?? APP].join(' · ');
