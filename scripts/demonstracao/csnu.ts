// Passo 43: o CSNU completo da demonstração, para ver documentos e DPOs de verdade.
// Textos fictícios e plausíveis (posições de cada país no tema), sem pessoas reais.
// Só dados: scripts/demonstracao.ts os grava pelas mesmas funções que o app usa.

// Passo 53: sem aprovação; a mesa só comenta.
type Situacao = 'enviado' | 'comentado' | 'nao_enviado';
export type Dpo = { texto: string; referencias: string[]; situacao: Situacao; comentario?: string };

const REF_CARTA = 'Carta das Nações Unidas, capítulos VI e VII (1945)';
const REF_1325 = 'Conselho de Segurança. Resolução 1325 (2000), mulheres, paz e segurança';
const REF_2719 = 'Conselho de Segurança. Resolução 2719 (2023), operações de paz lideradas pela União Africana';
const REF_OCHA = 'Escritório de Coordenação de Assuntos Humanitários. Panorama humanitário do Sahel (2026)';

/** Tópico 1, A situação no Sahel: um DPO por delegação. */
export const DPOS: Record<string, Dpo> = {
	China: {
		texto:
			'A República Popular da China acompanha com atenção a situação no Sahel e reafirma o respeito à soberania e à integridade territorial dos Estados da região.\n\nA China entende que a segurança duradoura depende do desenvolvimento: infraestrutura, energia e emprego reduzem o espaço dos grupos armados. Soluções impostas de fora tendem a agravar as tensões.\n\nA delegação apoiará textos que reforcem a cooperação Sul-Sul, o diálogo com os governos de transição e o financiamento previsível de iniciativas africanas, sem condicionalidades políticas.',
		referencias: [REF_CARTA, REF_2719],
		situacao: 'enviado'
	},
	'Estados Unidos': {
		texto:
			'Os Estados Unidos expressam profunda preocupação com o aumento de ataques contra civis no Sahel central e com o avanço de grupos ligados ao Estado Islâmico e à Al-Qaeda.\n\nA delegação defende o acesso humanitário pleno, a responsabilização por violações de direitos humanos e o apoio a forças regionais que respeitem o direito internacional humanitário.\n\nOs Estados Unidos estão dispostos a apoiar um relatório do Secretário-Geral sobre opções de proteção de civis e a financiar a mediação local, desde que haja transparência no uso dos recursos.',
		referencias: [REF_CARTA, REF_OCHA, REF_1325],
		situacao: 'enviado'
	},
	França: {
		texto:
			'A República Francesa acompanha com grave preocupação a deterioração da segurança no Sahel central, onde os ataques contra civis e trabalhadores humanitários aumentaram de forma contínua.\n\nA França reconhece as críticas à sua presença militar passada na região e defende que qualquer nova presença tenha mandato claro deste Conselho, comando regional e prestação de contas periódica.\n\nA delegação propõe três linhas de ação: acesso humanitário seguro, uma presença regional de proteção de civis construída com a União Africana e o financiamento estável da mediação local.',
		referencias: [REF_CARTA, REF_2719, REF_OCHA],
		situacao: 'enviado'
	},
	'Reino Unido': {
		texto:
			'O Reino Unido considera a crise no Sahel uma das mais graves emergências de proteção de civis da atualidade, com milhões de deslocados e escolas fechadas.\n\nA delegação defende sanções direcionadas a quem ataca civis e comboios humanitários, e a ampliação do mandato de monitoramento de direitos humanos na região.\n\nO Reino Unido apoiará a participação efetiva de mulheres nos processos de paz e a criação de mecanismos de alerta precoce com as comunidades locais.',
		referencias: [REF_1325, REF_OCHA],
		situacao: 'enviado'
	},
	Rússia: {
		texto:
			'A Federação Russa reafirma que a responsabilidade primária pela segurança cabe aos Estados soberanos do Sahel e às suas autoridades legítimas.\n\nA delegação rejeita o uso da proteção de civis como pretexto para intervenção e lembra os efeitos desestabilizadores de operações estrangeiras anteriores na região.\n\nA Rússia apoia a cooperação técnico-militar a pedido dos governos, o combate ao terrorismo e o levantamento de medidas que prejudiquem as economias locais.',
		referencias: [REF_CARTA],
		situacao: 'enviado'
	},
	Bahrein: {
		texto:
			'O Reino do Bahrein condena o terrorismo em todas as suas formas e expressa solidariedade aos povos do Sahel.\n\nA delegação defende o combate ao financiamento de grupos armados, inclusive por meio do tráfico de ouro e de pessoas, e a cooperação de inteligência entre Estados.\n\nO Bahrein apoiará textos que equilibrem segurança e assistência humanitária, com respeito à soberania dos Estados da região.',
		referencias: [REF_CARTA],
		situacao: 'enviado'
	},
	Colômbia: {
		texto:
			'A República da Colômbia traz ao debate sua experiência com processos de paz construídos a partir dos territórios.\n\nA delegação defende que a mediação local, a reintegração de ex-combatentes e a participação das vítimas sejam o centro de qualquer resposta do Conselho.\n\nA Colômbia apoiará o financiamento previsível de mecanismos de diálogo comunitário e a proteção de defensores de direitos humanos.',
		referencias: [REF_1325],
		situacao: 'enviado'
	},
	Dinamarca: {
		texto:
			'O Reino da Dinamarca, que preside o debate de hoje, considera urgente uma resposta coordenada entre segurança, desenvolvimento e ação humanitária no Sahel.\n\nA delegação defende o acesso humanitário desimpedido, a proteção de escolas e hospitais e o combate aos efeitos da mudança do clima sobre a disputa por terra e água.\n\nA Dinamarca coescreve com a França um projeto de resolução e convida todas as delegações a contribuir com o texto.',
		referencias: [REF_OCHA, REF_1325],
		situacao: 'enviado'
	},
	Grécia: {
		texto:
			'A República Helênica acompanha a crise no Sahel também pela sua dimensão migratória e humanitária no Mediterrâneo.\n\nA delegação defende rotas seguras, apoio aos países de trânsito e o combate às redes de tráfico de pessoas.\n\nA Grécia apoiará o projeto de resolução sobre proteção de civis e propõe uma cláusula sobre o apoio aos deslocados internos.',
		referencias: [REF_OCHA],
		situacao: 'enviado'
	},
	Letônia: {
		texto:
			'A República da Letônia reafirma seu compromisso com o direito internacional e com a proteção de civis em conflitos armados.\n\nA delegação chama atenção para a desinformação, que alimenta a violência contra comunidades e trabalhadores humanitários no Sahel.',
		referencias: [REF_CARTA],
		situacao: 'comentado',
		comentario: 'O DPO precisa de uma proposta concreta e de mais referências.'
	},
	Libéria: {
		texto:
			'A República da Libéria fala ao Conselho com a experiência de quem viveu a guerra e a reconstrução.\n\nA delegação defende que soluções africanas para problemas africanos tenham financiamento previsível, como prevê a resolução 2719, e que a reconciliação nacional caminhe junto com a segurança.\n\nA Libéria apoiará textos que fortaleçam a União Africana e a CEDEAO na mediação dos conflitos do Sahel.',
		referencias: [REF_2719, REF_CARTA],
		situacao: 'enviado'
	},
	Paquistão: {
		texto:
			'A República Islâmica do Paquistão, um dos maiores contribuintes de tropas para operações de paz, defende mandatos claros, realistas e com recursos adequados.\n\nA delegação lembra que nenhuma operação tem êxito sem o consentimento do Estado anfitrião e sem atacar as causas da violência: pobreza, exclusão e falta de serviços.\n\nO Paquistão apoiará o fortalecimento das capacidades nacionais e o diálogo político inclusivo.',
		referencias: [REF_CARTA, REF_2719],
		situacao: 'enviado'
	},
	Panamá: {
		texto:
			'A República do Panamá defende o multilateralismo e a proteção de civis como prioridade deste Conselho.\n\nA delegação apoia o acesso humanitário seguro e a responsabilização por ataques a civis, e propõe atenção especial às crianças recrutadas por grupos armados.',
		referencias: [REF_1325],
		situacao: 'comentado',
		comentario: 'Falta a posição sobre uma presença regional de proteção de civis.'
	},
	'República Democrática do Congo': {
		texto:
			'A República Democrática do Congo conhece de perto o custo humano dos conflitos prolongados e das operações de paz que se arrastam sem estratégia de saída.\n\nA delegação defende que qualquer presença internacional no Sahel tenha prazos, metas e transferência gradual de responsabilidades às forças nacionais.\n\nA RDC apoiará textos que priorizem a proteção de mulheres e meninas e a reparação às vítimas.',
		referencias: [REF_1325, REF_2719],
		situacao: 'enviado'
	},
	Somália: {
		texto: 'A República Federal da Somália (rascunho): experiência com a missão da União Africana; financiamento previsível; reconciliação local.',
		referencias: [REF_2719],
		situacao: 'nao_enviado'
	}
};

/** Tópico 2, Segurança marítima no Mar Vermelho: só algumas delegações já escreveram. */
export const DPOS_T2: Record<string, Dpo> = {
	'Estados Unidos': {
		texto: 'Os Estados Unidos defendem a liberdade de navegação no Mar Vermelho e a proteção das tripulações contra ataques a navios comerciais.',
		referencias: ['Convenção das Nações Unidas sobre o Direito do Mar (1982)'],
		situacao: 'enviado'
	},
	China: {
		texto: 'A China defende a segurança das rotas marítimas por meio do diálogo regional e da desescalada no Oriente Médio.',
		referencias: ['Convenção das Nações Unidas sobre o Direito do Mar (1982)'],
		situacao: 'nao_enviado'
	},
	Somália: {
		texto: 'A Somália lembra que a pirataria no Golfo de Áden diminuiu com cooperação regional e apoio às guardas costeiras locais.',
		referencias: ['Convenção das Nações Unidas sobre o Direito do Mar (1982)'],
		situacao: 'enviado'
	},
	Paquistão: {
		texto: 'O Paquistão defende escoltas coordenadas e a proteção dos marítimos de países em desenvolvimento.',
		referencias: ['Convenção das Nações Unidas sobre o Direito do Mar (1982)'],
		situacao: 'nao_enviado'
	}
};

export const BLOCOS = [
	{
		nome: 'Proteção de civis',
		membros: ['França', 'Dinamarca', 'Estados Unidos', 'Reino Unido', 'Grécia', 'Letônia', 'Panamá']
	},
	{ nome: 'Soluções africanas', membros: ['Libéria', 'República Democrática do Congo', 'Somália', 'Paquistão', 'China', 'Colômbia', 'Bahrein'] }
];

export const WORKING_PAPERS = [
	{
		bloco: 0,
		titulo: 'Notas sobre acesso humanitário (item A.2)',
		texto: [
			'Corredores humanitários: condições mínimas (aviso prévio, rotas, escolta).',
			'Dados do OCHA sobre ataques a comboios em 2026.',
			'Pendente: posição sobre escolta armada.'
		]
	},
	{
		bloco: 1,
		titulo: 'Financiamento de operações africanas (item B.2)',
		texto: [
			'Resolução 2719: até 75% do orçamento por contribuições obrigatórias.',
			'Proposta: fundo de mediação local gerido pela União Africana.',
			'Ouvir a CEDEAO antes de fechar o texto.'
		]
	}
];

/** Projeto A: do bloco da proteção de civis, aprovado pela mesa e pronto para votar. */
export const PROJETO_A = {
	bloco: 0,
	titulo: 'Proteção de civis no Sahel',
	preambulares: [
		'Reafirmando seu compromisso com a soberania, a independência e a integridade territorial dos Estados do Sahel,',
		'Profundamente preocupado com o aumento de ataques contra civis e trabalhadores humanitários na região do Liptako-Gourma,',
		'Recordando suas resoluções 1325 (2000) e 2719 (2023),',
		'Reconhecendo o papel da União Africana e da CEDEAO na mediação dos conflitos da região,',
		'Alarmado com os efeitos da mudança do clima sobre a disputa por terra e água,',
		'Destacando que não há solução militar duradoura sem desenvolvimento e diálogo político,'
	],
	operativas: [
		'Exige que todas as partes cessem imediatamente os ataques contra civis e permitam o acesso humanitário seguro e desimpedido;',
		'Solicita ao Secretário-Geral que apresente, em 90 dias, um relatório sobre opções para uma presença regional de proteção de civis;',
		'Encoraja os Estados-membros a apoiar financeiramente mecanismos regionais de mediação, com participação efetiva de mulheres;',
		'Convida a União Africana a coordenar a resposta regional, com apoio técnico das Nações Unidas;',
		'Insta os Estados a combater o financiamento de grupos armados, inclusive pelo tráfico de ouro e de pessoas;',
		'Pede proteção especial a escolas e hospitais e o fim do recrutamento de crianças;',
		'Solicita relatórios trimestrais sobre a situação humanitária;',
		'Decide permanecer ativamente ocupado da questão.'
	],
	signatarios: ['França', 'Dinamarca', 'Estados Unidos', 'Reino Unido', 'Grécia', 'Panamá']
};

/** Projeto B: do bloco das soluções africanas, em rodada de revisão. */
export const PROJETO_B = {
	bloco: 1,
	titulo: 'Soluções africanas para a segurança no Sahel',
	preambulares: [
		'Reafirmando que a responsabilidade primária pela segurança cabe aos Estados do Sahel,',
		'Recordando sua resolução 2719 (2023) sobre o financiamento de operações lideradas pela União Africana,',
		'Reconhecendo que pobreza e exclusão alimentam a violência,'
	],
	operativas: [
		'Apoia o fortalecimento das forças nacionais e regionais, a pedido dos Estados interessados;',
		'Decide que operações lideradas pela União Africana possam receber contribuições obrigatórias;',
		'Encoraja projetos de infraestrutura, energia e emprego nas regiões afetadas;',
		'Pede diálogo político inclusivo com os governos de transição;',
		'Decide permanecer ativamente ocupado da questão.'
	],
	acordadas: [0, 1],
	propostas: [
		{ de: 'Colômbia', operativa: 3, texto: 'Pede diálogo político inclusivo com os governos de transição e com as vítimas, com mediação local;' },
		{ de: 'Bahrein', operativa: 2, texto: 'Encoraja projetos de infraestrutura, energia e emprego, com transparência no uso dos recursos;' }
	],
	comentarios: [
		{ de: 'China', operativa: 1, texto: 'Sem contribuições obrigatórias o fundo não se sustenta.' },
		{ de: 'Paquistão', operativa: 0, texto: 'Incluir o consentimento do Estado anfitrião.' },
		{ de: 'Libéria', operativa: 4, texto: 'De acordo.' }
	]
};

export const CARTAS = [
	{ de: 'França', para: ['Dinamarca'], publica: false, titulo: 'Coautoria do projeto', corpo: 'Excelentíssima delegação da Dinamarca,\n\nPropomos escrever juntos o projeto sobre proteção de civis, com a França como redatora das cláusulas operativas.\n\nDelegação da França' },
	{ de: 'Rússia', para: [], publica: true, titulo: 'Sobre a soberania dos Estados do Sahel', corpo: 'Às delegações do Conselho,\n\nA Federação Russa não apoiará textos que autorizem presença estrangeira sem o pedido dos governos da região.\n\nDelegação da Rússia' },
	{ de: 'Libéria', para: ['República Democrática do Congo', 'Somália'], publica: false, titulo: 'Bloco das soluções africanas', corpo: 'Caras delegações,\n\nProponho reunirmos o A3 e os parceiros em torno do financiamento previsível previsto na resolução 2719.\n\nDelegação da Libéria' },
	{ de: 'Estados Unidos', para: ['China'], publica: false, titulo: 'Financiamento e transparência', corpo: 'Delegação da China,\n\nPodemos apoiar contribuições obrigatórias se houver auditoria independente. Gostaríamos de conversar antes da sessão 2.\n\nDelegação dos Estados Unidos' },
	{ de: 'Colômbia', para: [], publica: true, titulo: 'Experiência de paz territorial', corpo: 'Às delegações do Conselho,\n\nA Colômbia oferece sua experiência de mediação local e reintegração. Estamos à disposição dos dois blocos.\n\nDelegação da Colômbia' }
];

export const CRISE = {
	atualizacao: 'Comboio humanitário é atacado perto de Ménaka; três trabalhadores humanitários estão desaparecidos.',
	notas: [
		{ de: 'França', titulo: 'Paradeiro do comboio', texto: 'Solicitamos informações sobre o paradeiro do comboio e autorizamos, em caráter reservado, uma equipe de inteligência em Gao.', resposta: 'A equipe chega a Gao às 15h. Fontes locais indicam que o comboio foi levado para o norte.' },
		{ de: 'Rússia', titulo: 'Apoio ao governo de transição', texto: 'Oferecemos apoio logístico ao governo de transição para as buscas, a pedido dele.', resposta: 'O governo de transição aceita o apoio, mas pede discrição.' },
		{ de: 'Somália', titulo: 'Reunião reservada', texto: 'Pedimos uma reunião reservada com o Reino Unido e a Dinamarca sobre a segurança dos corredores.', resposta: 'A reunião foi marcada para o intervalo.' },
		{ de: 'Paquistão', titulo: 'Observadores militares', texto: 'Propomos enviar observadores militares para acompanhar a rota dos comboios.' },
		{ de: 'Estados Unidos', titulo: 'Imagens de satélite', texto: 'Perguntamos se há imagens de satélite da rota do comboio nas últimas 48 horas.' }
	]
};

export const NOTICIAS = [
	{ titulo: 'França pede corredor humanitário e isola Moscou no debate sobre o Sahel', texto: 'Em discurso de 90 segundos, a delegação francesa defendeu uma presença regional de proteção de civis; a Rússia promete resistir a "soluções impostas".', citadas: ['França', 'Rússia'] },
	{ titulo: 'Bloco africano quer financiamento previsível para operações da UA', texto: 'Libéria, RD Congo e Somália articulam um projeto apoiado por China e Paquistão.', citadas: ['Libéria', 'República Democrática do Congo', 'Somália'] },
	{ titulo: 'Comboio atacado em Ménaka muda o tom do Conselho', texto: 'A notícia chegou no meio da sessão e acelerou as conversas sobre acesso humanitário.', citadas: ['França', 'Estados Unidos'] },
	{ titulo: 'Colômbia se oferece como ponte entre os dois blocos', texto: 'A delegação colombiana enviou carta pública às demais e diz estar à disposição para mediar.', citadas: ['Colômbia'] }
];
