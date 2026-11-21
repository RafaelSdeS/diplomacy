// Dados do evento de demonstração (passo 20): os 6 comitês do UFRGSMUN 2026 com
// listas plausíveis de delegações e tópicos ilustrativos. Só dados, sem lógica.
// Pessoas são fictícias. Trocar pelas listas oficiais quando existirem.

export type Situacao = 'membro' | 'observadora' | 'suspensa';
/** Nome curto, nome oficial (em inglês, como nos documentos), código do flag-icons e situação. */
export type Delegacao = readonly [nome: string, nomeOficial: string, bandeira: string | null, situacao?: Situacao];

export type Comite = {
	sigla: string;
	nome: string;
	nome_oficial: string;
	idioma: 'pt' | 'en';
	crise: boolean;
	tecnologia_restrita: boolean;
	regras: Record<string, unknown>;
	topicos: string[];
	veiculo: { nome: string; linha_editorial: string };
	delegacoes: readonly Delegacao[];
};

export const EVENTO = { nome: 'UFRGSMUN Demonstração', ano: 2027 } as const;

export const COMITES: Comite[] = [
	{
		sigla: 'CSNU',
		nome: 'Conselho de Segurança',
		nome_oficial: 'O Conselho de Segurança',
		idioma: 'pt',
		crise: true,
		tecnologia_restrita: false,
		regras: {
			votacao_substantiva: 'csnu',
			membros_permanentes: ['China', 'Estados Unidos', 'França', 'Reino Unido', 'Rússia']
		},
		topicos: ['A situação no Sahel', 'Segurança marítima no Mar Vermelho'],
		veiculo: { nome: 'The New York Times', linha_editorial: 'Jornal norte-americano de referência, com cobertura internacional.' },
		delegacoes: [
			['China', "People's Republic of China", 'cn'],
			['Estados Unidos', 'United States of America', 'us'],
			['França', 'French Republic', 'fr'],
			['Reino Unido', 'United Kingdom of Great Britain and Northern Ireland', 'gb'],
			['Rússia', 'Russian Federation', 'ru'],
			['Bahrein', 'Kingdom of Bahrain', 'bh'],
			['Colômbia', 'Republic of Colombia', 'co'],
			['Dinamarca', 'Kingdom of Denmark', 'dk'],
			['Grécia', 'Hellenic Republic', 'gr'],
			['Letônia', 'Republic of Latvia', 'lv'],
			['Libéria', 'Republic of Liberia', 'lr'],
			['Paquistão', 'Islamic Republic of Pakistan', 'pk'],
			['Panamá', 'Republic of Panama', 'pa'],
			['República Democrática do Congo', 'Democratic Republic of the Congo', 'cd'],
			['Somália', 'Federal Republic of Somalia', 'so']
		]
	},
	{
		sigla: 'ARF',
		nome: 'Fórum Regional da ASEAN',
		nome_oficial: 'O Fórum Regional da ASEAN',
		idioma: 'pt',
		crise: false,
		tecnologia_restrita: false,
		regras: {},
		topicos: ['Disputas no Mar do Sul da China', 'Cibersegurança e infraestrutura crítica'],
		veiculo: { nome: 'Asia News Network', linha_editorial: 'Rede de jornais asiáticos, com cobertura regional.' },
		delegacoes: [
			['Brunei', 'Brunei Darussalam', 'bn'],
			['Camboja', 'Kingdom of Cambodia', 'kh'],
			['Filipinas', 'Republic of the Philippines', 'ph'],
			['Indonésia', 'Republic of Indonesia', 'id'],
			['Laos', "Lao People's Democratic Republic", 'la'],
			['Malásia', 'Malaysia', 'my'],
			['Mianmar', 'Republic of the Union of Myanmar', 'mm'],
			['Singapura', 'Republic of Singapore', 'sg'],
			['Tailândia', 'Kingdom of Thailand', 'th'],
			['Vietnã', 'Socialist Republic of Viet Nam', 'vn'],
			['Austrália', 'Commonwealth of Australia', 'au'],
			['Bangladesh', "People's Republic of Bangladesh", 'bd'],
			['Canadá', 'Canada', 'ca'],
			['China', "People's Republic of China", 'cn'],
			['Coreia do Norte', "Democratic People's Republic of Korea", 'kp'],
			['Coreia do Sul', 'Republic of Korea', 'kr'],
			['Estados Unidos', 'United States of America', 'us'],
			['Índia', 'Republic of India', 'in'],
			['Japão', 'Japan', 'jp'],
			['Nova Zelândia', 'New Zealand', 'nz'],
			['Paquistão', 'Islamic Republic of Pakistan', 'pk'],
			['Rússia', 'Russian Federation', 'ru'],
			['Timor-Leste', 'Democratic Republic of Timor-Leste', 'tl'],
			['União Europeia', 'European Union', 'eu']
		]
	},
	{
		sigla: 'OEA',
		nome: 'Organização dos Estados Americanos (1962)',
		nome_oficial: 'A Organização dos Estados Americanos',
		idioma: 'pt',
		crise: false,
		tecnologia_restrita: true,
		regras: {},
		topicos: ['A instalação de mísseis em Cuba (outubro de 1962)', 'A Aliança para o Progresso'],
		veiculo: { nome: 'Clarín', linha_editorial: 'Jornal argentino, com a cobertura da época.' },
		delegacoes: [
			['Argentina', 'Argentine Republic', 'ar'],
			['Bolívia', 'Republic of Bolivia', 'bo'],
			['Brasil', 'United States of Brazil', 'br'],
			['Chile', 'Republic of Chile', 'cl'],
			['Colômbia', 'Republic of Colombia', 'co'],
			['Costa Rica', 'Republic of Costa Rica', 'cr'],
			['Cuba', 'Republic of Cuba', 'cu', 'suspensa'],
			['Equador', 'Republic of Ecuador', 'ec'],
			['El Salvador', 'Republic of El Salvador', 'sv'],
			['Estados Unidos', 'United States of America', 'us'],
			['Guatemala', 'Republic of Guatemala', 'gt'],
			['Haiti', 'Republic of Haiti', 'ht'],
			['Honduras', 'Republic of Honduras', 'hn'],
			['México', 'United Mexican States', 'mx'],
			['Nicarágua', 'Republic of Nicaragua', 'ni'],
			['Panamá', 'Republic of Panama', 'pa'],
			['Paraguai', 'Republic of Paraguay', 'py'],
			['Peru', 'Republic of Peru', 'pe'],
			['República Dominicana', 'Dominican Republic', 'do'],
			['Uruguai', 'Oriental Republic of Uruguay', 'uy'],
			['Venezuela', 'Republic of Venezuela', 've'],
			['Canadá', 'Canada', 'ca', 'observadora'],
			['Espanha', 'Spanish State', 'es', 'observadora'],
			['Jamaica', 'Jamaica', 'jm', 'observadora'],
			['Trinidad e Tobago', 'Trinidad and Tobago', 'tt', 'observadora'],
			// O flag-icons não tem a bandeira da URSS: fica sem bandeira.
			['União Soviética', 'Union of Soviet Socialist Republics', null, 'observadora']
		]
	},
	{
		sigla: 'CEUE',
		nome: 'Conselho Europeu',
		nome_oficial: 'O Conselho Europeu',
		idioma: 'pt',
		crise: true,
		tecnologia_restrita: false,
		regras: { votacao_substantiva: 'unanimidade' },
		topicos: ['Defesa comum europeia', 'O Pacto de Migração e Asilo'],
		veiculo: { nome: 'El País', linha_editorial: 'Jornal espanhol, com cobertura europeia.' },
		delegacoes: [
			['Alemanha', 'Federal Republic of Germany', 'de'],
			['Áustria', 'Republic of Austria', 'at'],
			['Bélgica', 'Kingdom of Belgium', 'be'],
			['Bulgária', 'Republic of Bulgaria', 'bg'],
			['Chipre', 'Republic of Cyprus', 'cy'],
			['Croácia', 'Republic of Croatia', 'hr'],
			['Dinamarca', 'Kingdom of Denmark', 'dk'],
			['Eslováquia', 'Slovak Republic', 'sk'],
			['Eslovênia', 'Republic of Slovenia', 'si'],
			['Espanha', 'Kingdom of Spain', 'es'],
			['Estônia', 'Republic of Estonia', 'ee'],
			['Finlândia', 'Republic of Finland', 'fi'],
			['França', 'French Republic', 'fr'],
			['Grécia', 'Hellenic Republic', 'gr'],
			['Hungria', 'Hungary', 'hu'],
			['Irlanda', 'Ireland', 'ie'],
			['Itália', 'Italian Republic', 'it'],
			['Letônia', 'Republic of Latvia', 'lv'],
			['Lituânia', 'Republic of Lithuania', 'lt'],
			['Luxemburgo', 'Grand Duchy of Luxembourg', 'lu'],
			['Malta', 'Republic of Malta', 'mt'],
			['Países Baixos', 'Kingdom of the Netherlands', 'nl'],
			['Polônia', 'Republic of Poland', 'pl'],
			['Portugal', 'Portuguese Republic', 'pt'],
			['República Tcheca', 'Czech Republic', 'cz'],
			['Romênia', 'Romania', 'ro'],
			['Suécia', 'Kingdom of Sweden', 'se']
		]
	},
	{
		sigla: 'ACEG-UA',
		nome: 'Assembleia de Chefes de Estado e de Governo da União Africana',
		nome_oficial: 'A Assembleia da União Africana',
		idioma: 'pt',
		crise: false,
		tecnologia_restrita: false,
		regras: {},
		topicos: ['Mudanças inconstitucionais de governo', 'A Zona de Livre Comércio Continental Africana'],
		veiculo: { nome: 'Al-Ahram', linha_editorial: 'Jornal egípcio, com cobertura africana e árabe.' },
		delegacoes: [
			['África do Sul', 'Republic of South Africa', 'za'],
			['Angola', 'Republic of Angola', 'ao'],
			['Argélia', "People's Democratic Republic of Algeria", 'dz'],
			['Burkina Faso', 'Burkina Faso', 'bf', 'suspensa'],
			['Camarões', 'Republic of Cameroon', 'cm'],
			['Chade', 'Republic of Chad', 'td'],
			['Costa do Marfim', "Republic of Côte d'Ivoire", 'ci'],
			['Egito', 'Arab Republic of Egypt', 'eg'],
			['Etiópia', 'Federal Democratic Republic of Ethiopia', 'et'],
			['Gana', 'Republic of Ghana', 'gh'],
			['Mali', 'Republic of Mali', 'ml', 'suspensa'],
			['Marrocos', 'Kingdom of Morocco', 'ma'],
			['Moçambique', 'Republic of Mozambique', 'mz'],
			['Níger', 'Republic of the Niger', 'ne', 'suspensa'],
			['Nigéria', 'Federal Republic of Nigeria', 'ng'],
			['Quênia', 'Republic of Kenya', 'ke'],
			['República Democrática do Congo', 'Democratic Republic of the Congo', 'cd'],
			['Ruanda', 'Republic of Rwanda', 'rw'],
			['Senegal', 'Republic of Senegal', 'sn'],
			['Somália', 'Federal Republic of Somalia', 'so'],
			['Sudão', 'Republic of the Sudan', 'sd'],
			['Sudão do Sul', 'Republic of South Sudan', 'ss'],
			['Tanzânia', 'United Republic of Tanzania', 'tz'],
			['Tunísia', 'Republic of Tunisia', 'tn'],
			['Uganda', 'Republic of Uganda', 'ug'],
			['Zâmbia', 'Republic of Zambia', 'zm'],
			['Zimbábue', 'Republic of Zimbabwe', 'zw']
		]
	},
	{
		sigla: 'UNOCT',
		nome: 'United Nations Office of Counter-Terrorism',
		nome_oficial: 'The United Nations Office of Counter-Terrorism',
		idioma: 'en',
		crise: true,
		tecnologia_restrita: false,
		regras: {},
		topicos: ['Terrorism in the Sahel and private military companies', 'Countering online radicalisation'],
		veiculo: { nome: 'Al Jazeera', linha_editorial: 'Rede do Catar, com cobertura do Oriente Médio e do Sul Global.' },
		delegacoes: [
			['Afghanistan', 'Islamic Republic of Afghanistan', 'af'],
			['Algeria', "People's Democratic Republic of Algeria", 'dz'],
			['Brazil', 'Federative Republic of Brazil', 'br'],
			['Burkina Faso', 'Burkina Faso', 'bf'],
			['Canada', 'Canada', 'ca'],
			['China', "People's Republic of China", 'cn'],
			['Colombia', 'Republic of Colombia', 'co'],
			['Egypt', 'Arab Republic of Egypt', 'eg'],
			['France', 'French Republic', 'fr'],
			['Germany', 'Federal Republic of Germany', 'de'],
			['India', 'Republic of India', 'in'],
			['Indonesia', 'Republic of Indonesia', 'id'],
			['Iran', 'Islamic Republic of Iran', 'ir'],
			['Iraq', 'Republic of Iraq', 'iq'],
			['Israel', 'State of Israel', 'il'],
			['Japan', 'Japan', 'jp'],
			['Mali', 'Republic of Mali', 'ml'],
			['Morocco', 'Kingdom of Morocco', 'ma'],
			['Niger', 'Republic of the Niger', 'ne'],
			['Nigeria', 'Federal Republic of Nigeria', 'ng'],
			['Pakistan', 'Islamic Republic of Pakistan', 'pk'],
			['Qatar', 'State of Qatar', 'qa'],
			['Russian Federation', 'Russian Federation', 'ru'],
			['Saudi Arabia', 'Kingdom of Saudi Arabia', 'sa'],
			['Somalia', 'Federal Republic of Somalia', 'so'],
			['Türkiye', 'Republic of Türkiye', 'tr'],
			['United Kingdom', 'United Kingdom of Great Britain and Northern Ireland', 'gb'],
			['United States', 'United States of America', 'us']
		]
	}
];

/** Em cada comitê, as delegações destas posições têm um segundo delegado. */
export const COM_DOIS_DELEGADOS = [0, 1] as const;

// Nomes fictícios: a combinação fixa das duas listas dá sempre as mesmas pessoas.
const PRIMEIROS = [
	'Ana', 'Bruno', 'Camila', 'Daniel', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique', 'Isabela', 'João',
	'Júlia', 'Lucas', 'Luiza', 'Mateus', 'Natália', 'Otávio', 'Paula', 'Rafaela', 'Rodrigo', 'Sofia',
	'Thiago', 'Valentina', 'Vinícius', 'Yasmin', 'Caio', 'Beatriz', 'Gustavo', 'Helena', 'Leonardo', 'Marina'
];
const SOBRENOMES = [
	'Almeida', 'Barbosa', 'Cardoso', 'Carvalho', 'Costa', 'Dias', 'Fernandes', 'Ferreira', 'Gomes', 'Lima',
	'Machado', 'Martins', 'Melo', 'Moreira', 'Nunes', 'Oliveira', 'Pereira', 'Pinto', 'Ramos', 'Ribeiro',
	'Rocha', 'Santos', 'Silva', 'Soares', 'Souza', 'Teixeira', 'Vieira', 'Azevedo', 'Campos', 'Freitas'
];
const BIOS = [
	'Estudante de Relações Internacionais.',
	'Estudante de Direito, na segunda simulação.',
	'Estudante de Economia, primeira vez no UFRGSMUN.',
	'Estudante de Ciências Sociais.',
	'Estudante do ensino médio, na primeira simulação.',
	'Estudante de Jornalismo e de História.'
];

export const nomeFicticio = (i: number) =>
	`${PRIMEIROS[i % PRIMEIROS.length]} ${SOBRENOMES[(i * 7 + Math.floor(i / PRIMEIROS.length)) % SOBRENOMES.length]}`;
export const bioFicticia = (i: number) => BIOS[i % BIOS.length];

/** Cronograma dos 4 dias: [dia (0 a 3), início, fim, título, local, do comitê?]. */
export const CRONOGRAMA: readonly [number, string, string, string, string, boolean][] = [
	[0, '08:00', '09:00', 'Credenciamento', 'Saguão', false],
	[0, '09:00', '10:00', 'Cerimônia de abertura', 'Salão de Atos', false],
	[0, '10:00', '11:30', 'Mock and rules: o app e as regras', 'Salão de Atos', false],
	[0, '11:30', '13:30', 'Almoço', 'Restaurante Universitário', false],
	[0, '13:30', '17:30', 'Sessão 1', 'Sala', true],
	[1, '09:00', '12:00', 'Sessão 2', 'Sala', true],
	[1, '12:00', '13:30', 'Almoço', 'Restaurante Universitário', false],
	[1, '13:30', '17:30', 'Sessão 3', 'Sala', true],
	[2, '09:00', '12:00', 'Sessão 4', 'Sala', true],
	[2, '12:00', '13:00', 'Coletiva de imprensa', 'Auditório', false],
	[2, '14:00', '17:30', 'Sessão 5', 'Sala', true],
	[3, '09:00', '12:00', 'Sessão 6', 'Sala', true],
	[3, '15:00', '16:30', 'Cerimônia de encerramento', 'Salão de Atos', false]
];
