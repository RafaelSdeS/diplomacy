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
