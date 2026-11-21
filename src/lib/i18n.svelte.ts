import { EN, EN_PADROES } from './i18n-en.ts';

// Idiomas da interface (passo 18). O texto em português é a própria chave: t('Levantar
// placa') devolve o inglês quando o idioma é inglês. As traduções ficam em i18n-en.ts, e
// um teste confere que todo texto marcado tem tradução.

export type Idioma = 'pt' | 'en';
export const idioma = $state({ atual: 'pt' as Idioma });

export function definirIdioma(novo: Idioma) {
	idioma.atual = novo;
	if (typeof document !== 'undefined') document.documentElement.lang = novo === 'en' ? 'en' : 'pt-BR';
}

/** O texto no idioma atual, com {parâmetros} trocados. */
export function t(texto: string, parametros?: Record<string, string | number>): string {
	let saida = idioma.atual === 'en' ? (EN[texto] ?? texto) : texto;
	if (parametros) saida = saida.replace(/\{(\w+)\}/g, (_, chave: string) => String(parametros[chave] ?? ''));
	return saida;
}

/** Mensagens que vêm do banco, com partes variáveis (números, nomes). */
export function traduzirMensagem(mensagem: string): string {
	if (idioma.atual !== 'en') return mensagem;
	if (EN[mensagem]) return EN[mensagem];
	for (const [padrao, traducao] of EN_PADROES) if (padrao.test(mensagem)) return mensagem.replace(padrao, traducao);
	return mensagem;
}

/** O locale do Intl para datas, horas, números e listas. */
export const locale = () => (idioma.atual === 'en' ? 'en-GB' : 'pt-BR');

/** Um mapa de rótulos que responde no idioma atual (quem usa não muda nada). */
export function bilingue<T extends Record<string, string>>(rotulos: T): T {
	return new Proxy(rotulos, {
		get: (alvo, chave) => {
			const valor = Reflect.get(alvo, chave);
			return typeof valor === 'string' ? t(valor) : valor;
		}
	});
}
