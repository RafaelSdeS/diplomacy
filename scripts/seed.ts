// Dados fictícios para desenvolver e testar: o evento "UFRGSMUN Teste", o comitê
// CSNU-T com as 15 delegações do CSNU de 2026 e contas @exemplo.test.
// Usa o fluxo real: cria os convites e depois as contas; o gatilho nova_conta
// cria a pessoa e as participações. Pode rodar várias vezes sem duplicar nada.
// Só roda no Supabase local, a menos que SEED_PERMITIR_REMOTO=1 (para um projeto
// de teste, nunca o de produção).
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

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

// [nome, nome oficial, código da bandeira no flag-icons]
const DELEGACOES = [
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
];

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
				crise_ligada: true
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

// Contas: um delegado por delegação, um segundo delegado dos EUA (delegação com
// dois), uma conta por papel e uma conta sem convite (tela "sem acesso").
type Conta = { email: string; nome: string; papel?: string; delegacao?: string };
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
	{ email: 'semconvite@exemplo.test', nome: 'Sem Convite' }
];

verificar(
	await db.from('convite').upsert(
		contas
			.filter((c) => c.papel)
			.map((c) => ({
				email: c.email,
				evento_id: evento.id,
				papel: c.papel,
				comite_id: c.papel === 'secretaria' ? null : comite.id,
				delegacao_id: c.delegacao ? delegacaoPorNome.get(c.delegacao) : null
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

console.log(
	`Seed pronto: ${delegacoes.length} delegações e ${contas.length} contas @exemplo.test (senha "${SENHA}") em ${url}.`
);
