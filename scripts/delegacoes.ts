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
