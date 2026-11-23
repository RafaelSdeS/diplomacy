// Passo 44: o cache offline das leituras da API é de cada conta (dados-<sub>), vale 12
// horas e nunca guarda o que é sensível. Usado pelo service worker e pelo logout.

export const PREFIXO = 'dados-';
export const VALIDADE_MS = 12 * 60 * 60 * 1000;
export const GUARDADO_EM = 'x-guardado-em';

// Texto da pergunta da coletiva e notas de crise: nem do próprio usuário. Vale para a
// URL inteira, porque um embed (`select=*,nota_crise(*)`) traz a tabela dentro da
// consulta de outra. Os votos ficam de fora da lista: são públicos no comitê (placas,
// telão, lista do passo 23) e vêm embutidos na consulta da sessão, que precisa abrir
// sem rede (passo 15).
const SENSIVEIS = /(^|[^a-z_])(coletiva_pergunta_texto|nota_crise)([^a-z_]|$)/;

/** O `sub` do JWT do pedido, só para dar nome ao cache (quem autoriza é o banco). Anônimo: null. */
export function subDoPedido(autorizacao: string | null): string | null {
	const carga = autorizacao?.match(/^Bearer [^.]+\.([^.]+)\./)?.[1];
	if (!carga) return null;
	try {
		const jwt = JSON.parse(atob(carga.replace(/-/g, '+').replace(/_/g, '/')));
		return jwt.role === 'authenticated' && typeof jwt.sub === 'string' && jwt.sub ? jwt.sub : null;
	} catch {
		return null;
	}
}

export const nomeDoCache = (sub: string) => PREFIXO + sub;

/** Os caches de dados lidos, inclusive o `dados` global de antes do passo 44. */
export const ehCacheDeDados = (nome: string) => nome === 'dados' || nome.startsWith(PREFIXO);

/** Na troca de versão do service worker, o cache de cada conta continua; o `dados` antigo sai. */
export const sobreviveAAtualizacao = (nome: string, daVersao: string[]) =>
	daVersao.includes(nome) || nome.startsWith(PREFIXO);

export function sensivel(url: string) {
	let texto = url;
	try {
		texto = decodeURIComponent(url);
	} catch {
		// URL com % solto: confere como veio
	}
	return SENSIVEIS.test(texto);
}

/** Erro de rede (a API nem respondeu): o PostgREST sempre manda um código. */
export const semRede = (erro: { code?: string; message?: string } | null) => !!erro && !erro.code;

/** Guardada há mais de 12 horas (ou sem horário): não é mais servida sem rede. */
export const vencida = (guardadaEm: string | null, agora = Date.now()) =>
	!guardadaEm || !(agora - Number(guardadaEm) <= VALIDADE_MS);
