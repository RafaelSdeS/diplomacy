// O nome do app e o do evento (passo 27). Diplomacy é a marca do app; o evento
// (UFRGSMUN, por exemplo) vem do banco, preenchido pelo layout com a participação da
// pessoa. Sem login, só "Diplomacy".
export const APP = 'Diplomacy';
// Passo 54: os créditos da página "Sobre" (decididos em 24/11/2026).
export const CRIADOR = { nome: 'Rafael Silva de Souza', site: 'https://rafaelsdes.github.io/' };
// O encarregado de dados (LGPD), decidido em 25/11/2026: o próprio criador.
export const ENCARREGADO = { nome: CRIADOR.nome, email: 'rafesilvadesouza@gmail.com' };
export const marca = $state<{ evento: string | null }>({ evento: null });

/** O título da aba: as partes, e no fim o nome do evento (ou do app). */
// Passo 61: as mensagens não lidas também aparecem no título da aba ("(2) Sessão · …").
export const mensagensNovas = $state({ n: 0 });
export const tituloDaAba = (...partes: (string | null | undefined)[]) =>
	(mensagensNovas.n ? `(${mensagensNovas.n}) ` : '') + [...partes.filter((p) => p), marca.evento ?? APP].join(' · ');
