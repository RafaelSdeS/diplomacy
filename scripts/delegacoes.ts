// As delegações do comitê de teste (seed e testes de ponta a ponta usam a mesma
// lista). A conta delegadoNN@exemplo.test representa a NN-ésima delegação.
export const DELEGACOES = [
	['EUA', 'United States of America', 'us'],
	['Rússia', 'Russian Federation', 'ru'],
	['China', "People's Republic of China", 'cn'],
	['Reino Unido', 'United Kingdom of Great Britain and Northern Ireland', 'gb'],
	['França', 'French Republic', 'fr'],
	['Brasil', 'Federative Republic of Brazil', 'br'],
	['México', 'United Mexican States', 'mx'],
	['Colômbia', 'Republic of Colombia', 'co'],
	['Paraguai', 'Republic of Paraguay', 'py'],
	['Irã', 'Islamic Republic of Iran', 'ir'],
	['Arábia Saudita', 'Kingdom of Saudi Arabia', 'sa'],
	['Nigéria', 'Federal Republic of Nigeria', 'ng'],
	['Marrocos', 'Kingdom of Morocco', 'ma'],
	['Itália', 'Italian Republic', 'it'],
	['Somália', 'Federal Republic of Somalia', 'so']
] as const;

/** A conta de teste que representa a delegação. */
export function contaDaDelegacao(nome: string) {
	const i = DELEGACOES.findIndex(([d]) => d === nome);
	if (i < 0) throw new Error(`Delegação desconhecida: ${nome}`);
	return `delegado${String(i + 1).padStart(2, '0')}@exemplo.test`;
}

// O comitê de treino (TREINO): o "mock" do primeiro dia, com um cenário fictício,
// para ensinar o app. A conta treinoNN@exemplo.test representa a NN-ésima delegação.
export const DELEGACOES_TREINO = [
	['Argentina', 'Argentine Republic', 'ar'],
	['Bolívia', 'Plurinational State of Bolivia', 'bo'],
	['Brasil', 'Federative Republic of Brazil', 'br'],
	['Chile', 'Republic of Chile', 'cl'],
	['Paraguai', 'Republic of Paraguay', 'py'],
	['Uruguai', 'Oriental Republic of Uruguay', 'uy']
] as const;

export const TOPICOS_TREINO = [
	'A crise do Rio Aurora: seca, barragens e fronteiras (cenário fictício)',
	'Refugiados climáticos na fronteira norte (cenário fictício)'
];

/** A conta de teste que representa a delegação no comitê de treino. */
export function contaDoTreino(nome: string) {
	const i = DELEGACOES_TREINO.findIndex(([d]) => d === nome);
	if (i < 0) throw new Error(`Delegação desconhecida no treino: ${nome}`);
	return `treino${String(i + 1).padStart(2, '0')}@exemplo.test`;
}

/**
 * Passo 39: cópias dos comitês de teste, uma por arquivo de ponta a ponta que mexe na
 * sessão, na crise ou nos documentos do comitê. A cópia tem as mesmas delegações e
 * regras do original, e as mesmas contas com "+NN" no e-mail (o seed cria tudo).
 * Assim os arquivos rodam em paralelo e cada um só vê o que ele mesmo fez.
 */
export const ISOLADOS = {
	'06': 'CSNU-T',
	'08': 'CSNU-T',
	'09': 'CSNU-T',
	'10': 'CSNU-T',
	'12': 'TREINO',
	'15': 'TREINO',
	'16': 'TREINO',
	'21': 'CE-T',
	'23': 'UNOCT-T',
	'28': 'CE-T',
	'29': 'CE-T',
	'30': 'CE-T',
	'31': 'CE-T',
	'32': 'CE-T',
	'33': 'CE-T',
	'35': 'TREINO',
	'41': 'CSNU-T',
	'43': 'CSNU-T',
	'44': 'TREINO',
	'46': 'TREINO',
	'47': 'TREINO',
	'51': 'TREINO',
	'54': 'CE-T',
	'55': 'TREINO',
	'56': 'CE-T',
	'57': 'CE-T',
	'61': 'CE-T'
} as const;

/** O comitê do arquivo NN e as contas dele: `conta('mesa01@exemplo.test')` vira `mesa01+NN@…`. */
export function isolado(n: keyof typeof ISOLADOS) {
	return { sigla: `${ISOLADOS[n]}-${n}`, conta: (email: string) => email.replace('@', `+${n}@`) };
}
