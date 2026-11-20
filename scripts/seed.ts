// Dados fictícios para desenvolver e testar: o evento "UFRGSMUN Teste", o comitê
// CSNU-T com as 15 delegações do CSNU de 2026, o comitê de treino TREINO (cenário
// fictício, para o "mock" do primeiro dia) e contas @exemplo.test.
// Usa o fluxo real: cria os convites e depois as contas; o gatilho nova_conta
// cria a pessoa e as participações. Pode rodar várias vezes sem duplicar nada.
// Só roda no Supabase local, a menos que SEED_PERMITIR_REMOTO=1 (para um projeto
// de teste, nunca o de produção).
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { DELEGACOES, DELEGACOES_TREINO, TOPICOS_TREINO } from './delegacoes.ts';

const SENHA = 'senha-de-teste';

function credenciais(): { url: string; chave: string } {
	if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
		return { url: process.env.SUPABASE_URL, chave: process.env.SUPABASE_SERVICE_ROLE_KEY };
	}
	const saida = execFileSync('npx', ['supabase', 'status', '-o', 'json'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'ignore']
	});
	const status = JSON.parse(saida);
	return { url: status.API_URL, chave: status.SERVICE_ROLE_KEY };
}

const { url, chave } = credenciais();
const local = ['127.0.0.1', 'localhost'].includes(new URL(url).hostname);
if (!local && process.env.SEED_PERMITIR_REMOTO !== '1') {
	throw new Error(`Recusado: ${url} não é o Supabase local. Use SEED_PERMITIR_REMOTO=1 só num projeto de teste.`);
}

const db = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });

// Logo depois de `db reset`, a API ainda se reconecta ao banco por alguns segundos.
for (let tentativa = 1; ; tentativa++) {
	const { error } = await db.from('evento').select('id').limit(1);
	if (!error) break;
	if (tentativa === 30) throw new Error(`A API do Supabase não respondeu: ${error.message}`);
	await new Promise((pronto) => setTimeout(pronto, 500));
}

function verificar<T>(resposta: { data: T; error: { message: string } | null }, onde: string) {
	if (resposta.error) throw new Error(`${onde}: ${resposta.error.message}`);
	return resposta.data as NonNullable<T>;
}

const evento = verificar(
	await db
		.from('evento')
		.upsert({ nome: 'UFRGSMUN Teste', ano: 2027 }, { onConflict: 'nome,ano' })
		.select()
		.single(),
	'evento'
);

const comite = verificar(
	await db
		.from('comite')
		.upsert(
			{
				evento_id: evento.id,
				sigla: 'CSNU-T',
				nome: 'Conselho de Segurança (teste)',
				nome_oficial: 'O Conselho de Segurança',
				idioma: 'pt',
				crise_ligada: true,
				topicos: [
					'Crime organizado transnacional, narcotráfico e instabilidade política: desafios na América Latina',
					'Conflito no Iêmen: ataques no Mar Vermelho e no Golfo de Áden'
				],
				guia_url: 'https://www.ufrgs.br/ufrgsmun/',
				// As outras regras vêm do Guia de Regras (regras_do_guia no banco).
				regras: {
					votacao_substantiva: 'csnu',
					membros_permanentes: ['China', 'EUA', 'França', 'Reino Unido', 'Rússia']
				}
			},
			{ onConflict: 'evento_id,sigla' }
		)
		.select()
		.single(),
	'comitê'
);

const delegacoes = verificar(
	await db
		.from('delegacao')
		.upsert(
			DELEGACOES.map(([nome, nome_oficial, bandeira]) => ({ comite_id: comite.id, nome, nome_oficial, bandeira })),
			{ onConflict: 'comite_id,nome' }
		)
		.select(),
	'delegações'
);
const delegacaoPorNome = new Map(delegacoes.map((d) => [d.nome, d.id]));

const treino = verificar(
	await db
		.from('comite')
		.upsert(
			{
				evento_id: evento.id,
				sigla: 'TREINO',
				nome: 'Comitê de treino',
				nome_oficial: 'O Conselho de Treino',
				idioma: 'pt',
				crise_ligada: true,
				topicos: TOPICOS_TREINO
			},
			{ onConflict: 'evento_id,sigla' }
		)
		.select()
		.single(),
	'comitê de treino'
);
const delegacoesTreino = verificar(
	await db
		.from('delegacao')
		.upsert(
			DELEGACOES_TREINO.map(([nome, nome_oficial, bandeira]) => ({ comite_id: treino.id, nome, nome_oficial, bandeira })),
			{ onConflict: 'comite_id,nome' }
		)
		.select(),
	'delegações do treino'
);
const delegacaoDoTreino = new Map(delegacoesTreino.map((d) => [d.nome, d.id]));

// Comitês nos formatos especiais (passo 16): a OEA histórica, com tecnologia restrita
// (sem aparelhos nas sessões; a mesa opera o app), Cuba suspensa e uma observadora; e o
// Conselho Europeu, que decide por unanimidade.
const ESPECIAIS = [
	{
		sigla: 'OEA-T',
		nome: 'Organização dos Estados Americanos (teste)',
		nome_oficial: 'A Organização dos Estados Americanos',
		tecnologia_restrita: true,
		regras: {},
		delegacoes: [
			['Argentina', 'Argentine Republic', 'ar', 'membro'],
			['Brasil', 'Federative Republic of Brazil', 'br', 'membro'],
			['Chile', 'Republic of Chile', 'cl', 'membro'],
			['Estados Unidos', 'United States of America', 'us', 'membro'],
			['México', 'United Mexican States', 'mx', 'membro'],
			['Cuba', 'Republic of Cuba', 'cu', 'suspensa'],
			['Espanha', 'Kingdom of Spain', 'es', 'observadora']
		]
	},
	{
		sigla: 'CE-T',
		nome: 'Conselho Europeu (teste)',
		nome_oficial: 'O Conselho Europeu',
		tecnologia_restrita: false,
		regras: { votacao_substantiva: 'unanimidade' },
		delegacoes: [
			['Alemanha', 'Federal Republic of Germany', 'de', 'membro'],
			['França', 'French Republic', 'fr', 'membro'],
			['Itália', 'Italian Republic', 'it', 'membro'],
			['Espanha', 'Kingdom of Spain', 'es', 'membro'],
			['Portugal', 'Portuguese Republic', 'pt', 'membro']
		]
	}
] as const;
const delegacaoDoEspecial = new Map<string, Map<string, string>>();
const comiteEspecial = new Map<string, string>();
for (const especial of ESPECIAIS) {
	const c = verificar(
		await db
			.from('comite')
			.upsert(
				{
					evento_id: evento.id,
					sigla: especial.sigla,
					nome: especial.nome,
					nome_oficial: especial.nome_oficial,
					idioma: 'pt',
					tecnologia_restrita: especial.tecnologia_restrita,
					regras: especial.regras,
					topicos: ['A crise dos mísseis (cenário de teste)', 'Cooperação regional (cenário de teste)']
				},
				{ onConflict: 'evento_id,sigla' }
			)
			.select()
			.single(),
		especial.sigla
	);
	comiteEspecial.set(especial.sigla, c.id);
	const ds = verificar(
		await db
			.from('delegacao')
			.upsert(
				especial.delegacoes.map(([nome, nome_oficial, bandeira, situacao]) => ({ comite_id: c.id, nome, nome_oficial, bandeira, situacao })),
				{ onConflict: 'comite_id,nome' }
			)
			.select(),
		`delegações de ${especial.sigla}`
	);
	delegacaoDoEspecial.set(especial.sigla, new Map(ds.map((d) => [d.nome, d.id])));
}

// Os veículos da press de cada comitê (nomes de veículos reais, só o nome).
verificar(
	await db
		.from('veiculo')
		.upsert(
			[
				{ comite_id: comite.id, nome: 'Al Jazeera', linha_editorial: 'Cobertura do Oriente Médio e do Sul Global.' },
				{ comite_id: treino.id, nome: 'Reuters', linha_editorial: 'Notícias rápidas e factuais.' }
			],
			{ onConflict: 'comite_id' }
		)
		.select(),
	'veículos'
);

// Contas: um delegado por delegação, um segundo delegado dos EUA (delegação com
// dois), uma conta por papel e uma conta sem convite (tela "sem acesso").
type Conta = { email: string; nome: string; papel?: string; delegacao?: string; treino?: boolean; especial?: string };
const contas: Conta[] = [
	...DELEGACOES.map(([nome], i) => {
		const n = String(i + 1).padStart(2, '0');
		return { email: `delegado${n}@exemplo.test`, nome: `Delegado ${n}`, papel: 'delegado', delegacao: nome };
	}),
	{ email: 'delegado16@exemplo.test', nome: 'Delegado 16', papel: 'delegado', delegacao: 'EUA' },
	{ email: 'mesa01@exemplo.test', nome: 'Mesa 01', papel: 'mesa' },
	{ email: 'crise01@exemplo.test', nome: 'Crise 01', papel: 'crise' },
	{ email: 'press01@exemplo.test', nome: 'Press 01', papel: 'press' },
	{ email: 'secretaria01@exemplo.test', nome: 'Secretaria 01', papel: 'secretaria' },
	{ email: 'diretoria-press@exemplo.test', nome: 'Diretoria da Press', papel: 'diretoria_press' },
	{ email: 'semconvite@exemplo.test', nome: 'Sem Convite' },
	// O comitê de treino: uma conta por delegação e uma da mesa.
	...DELEGACOES_TREINO.map(([nome], i) => {
		const n = String(i + 1).padStart(2, '0');
		return { email: `treino${n}@exemplo.test`, nome: `Treino ${n}`, papel: 'delegado', delegacao: nome, treino: true };
	}),
	{ email: 'mesa-treino@exemplo.test', nome: 'Mesa do Treino', papel: 'mesa', treino: true },
	{ email: 'crise-treino@exemplo.test', nome: 'Crise do Treino', papel: 'crise', treino: true },
	// A OEA de teste, com tecnologia restrita: a mesa e um delegado.
	{ email: 'mesa-oea@exemplo.test', nome: 'Mesa da OEA', papel: 'mesa', especial: 'OEA-T' },
	{ email: 'oea-brasil@exemplo.test', nome: 'Delegado da OEA', papel: 'delegado', delegacao: 'Brasil', especial: 'OEA-T' }
];

verificar(
	await db.from('convite').upsert(
		contas
			.filter((c) => c.papel)
			.map((c) => ({
				email: c.email,
				evento_id: evento.id,
				papel: c.papel,
				comite_id:
					c.papel === 'secretaria' || c.papel === 'diretoria_press' ? null : c.especial ? comiteEspecial.get(c.especial)! : c.treino ? treino.id : comite.id,
				delegacao_id: c.delegacao
					? (c.especial ? delegacaoDoEspecial.get(c.especial)! : c.treino ? delegacaoDoTreino : delegacaoPorNome).get(c.delegacao)
					: null
			})),
		{ onConflict: 'email,evento_id,papel,comite_id', ignoreDuplicates: true }
	),
	'convites'
);

const lista = await db.auth.admin.listUsers({ perPage: 1000 });
if (lista.error) throw new Error(`usuários: ${lista.error.message}`);
const existentes = new Set(lista.data.users.map((u) => u.email));

for (const conta of contas) {
	if (existentes.has(conta.email)) continue;
	const { error } = await db.auth.admin.createUser({
		email: conta.email,
		password: SENHA,
		email_confirm: true,
		user_metadata: { nome: conta.nome }
	});
	if (error) throw new Error(`conta ${conta.email}: ${error.message}`);
}

// Cronograma de dois dias fictícios do evento (horário de Brasília). As datas ficam
// no passado de propósito: os testes congelam o relógio nelas, e um relógio antes
// do vencimento da sessão não força a renovação do login.
const geral = null;
const csnu = comite.id;
const CRONOGRAMA: [string, string, string, string, string | null][] = [
	['Credenciamento', 'Saguão', '2026-11-10T08:30', '2026-11-10T09:30', geral],
	['Cerimônia de abertura', 'Salão de Atos', '2026-11-10T09:30', '2026-11-10T10:30', geral],
	['Sessão 1', 'Sala 204', '2026-11-10T10:30', '2026-11-10T12:30', csnu],
	['Almoço', 'Restaurante Universitário', '2026-11-10T12:30', '2026-11-10T14:00', geral],
	['Sessão 2', 'Sala 204', '2026-11-10T14:00', '2026-11-10T17:30', csnu],
	['Sessão 3', 'Sala 204', '2026-11-11T09:00', '2026-11-11T12:00', csnu]
];
verificar(
	await db.from('cronograma_item').upsert(
		CRONOGRAMA.map(([titulo, local, inicio, fim, comite_id]) => ({
			evento_id: evento.id,
			comite_id,
			titulo,
			local,
			inicio: `${inicio}-03:00`,
			fim: `${fim}-03:00`
		})),
		{ onConflict: 'evento_id,comite_id,inicio,titulo', ignoreDuplicates: true }
	),
	'cronograma'
);

// Um aviso de boas-vindas da secretaria, só na primeira vez.
const avisos = await db.from('aviso').select('id', { count: 'exact', head: true }).eq('evento_id', evento.id);
if (avisos.error) throw new Error(`avisos: ${avisos.error.message}`);
if (!avisos.count) {
	const secretaria = verificar(
		await db.from('pessoa').select('id').eq('nome', 'Secretaria 01').single(),
		'secretaria'
	);
	verificar(
		await db.from('aviso').insert({
			evento_id: evento.id,
			texto: 'Bem-vindos ao UFRGSMUN Teste! O credenciamento começa às 8h30, no saguão.',
			autor_id: secretaria.id
		}),
		'aviso'
	);
}

console.log(
	`Seed pronto: ${delegacoes.length + delegacoesTreino.length} delegações e ${contas.length} contas @exemplo.test (senha "${SENHA}") em ${url}.`
);
