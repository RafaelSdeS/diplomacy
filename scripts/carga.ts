// Teste de carga do tempo real (passo 13): vários clientes nos canais de 6 comitês,
// com placas, votos, notas de crise e cláusulas ao mesmo tempo. Mede o tempo entre a
// ação e a chegada do aviso em cada cliente que ouve o canal.
//
//   node scripts/carga.ts preparar   cria o evento "Teste de carga": 6 comitês com 25
//                                    delegações, a mesa, a crise e as contas
//   node scripts/carga.ts rodar      abre CARGA_CLIENTES clientes (300 por padrão) e mede
//
// Por padrão, no Supabase local, que limita o tempo real a 100 mensagens por segundo,
// como o plano gratuito: localmente, rode com poucos clientes (CARGA_CLIENTES=30). A
// meta de 300 clientes é para um projeto de TESTE no plano Pro, nunca a produção:
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... CARGA_PERMITIR_REMOTO=1 CARGA_PROJETO_REF=<ref> node scripts/carga.ts preparar
//   SUPABASE_URL=... SUPABASE_CHAVE=<chave pública> CARGA_PERMITIR_REMOTO=1 CARGA_PROJETO_REF=<ref> node scripts/carga.ts rodar
//
// No projeto de teste, aumente antes o limite de logins (Authentication → Rate Limits).
import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { recusaDoAlvo } from './admin.ts';

const SENHA = 'senha-de-carga';
const COMITES = 6;
const DELEGACOES = 25;
const RODADAS = Number(process.env.CARGA_RODADAS ?? 20);
const CLIENTES = Number(process.env.CARGA_CLIENTES ?? 300);
const ESPERA_MS = 5_000; // depois disso, o aviso conta como perdido
const META_MS = 1_000;
const BLOCO = 5; // delegações no bloco que escreve o working paper

const sigla = (c: number) => `CARGA${c}`;
const dd = (n: number) => String(n).padStart(2, '0');
const contaDelegado = (c: number, d: number) => `carga-c${c}-d${dd(d)}@exemplo.test`;
const contaMesa = (c: number) => `carga-c${c}-mesa@exemplo.test`;
const contaCrise = (c: number) => `carga-c${c}-crise@exemplo.test`;

function local() {
	const status = JSON.parse(
		execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
	);
	return { url: status.API_URL as string, servico: status.SERVICE_ROLE_KEY as string, publica: status.ANON_KEY as string };
}

function destino() {
	const url = process.env.SUPABASE_URL ?? local().url;
	const recusa = recusaDoAlvo(url, 'CARGA_PERMITIR_REMOTO', process.env);
	if (recusa) throw new Error(recusa);
	return url;
}

const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };

async function verificar<T>(resposta: PromiseLike<{ data: T; error: { message: string } | null }>, onde: string) {
	const { data, error } = await resposta;
	if (error) throw new Error(`${onde}: ${error.message}`);
	return data as NonNullable<T>;
}

// Preparar: dados e contas, pelo fluxo real (convite, depois a conta).

async function preparar() {
	const url = destino();
	const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? local().servico, opcoes);
	const evento = await verificar(
		db.from('evento').upsert({ nome: 'Teste de carga', ano: 2027 }, { onConflict: 'nome,ano' }).select().single(),
		'evento'
	);
	const convites = [];
	for (let c = 1; c <= COMITES; c++) {
		const comite = await verificar(
			db
				.from('comite')
				.upsert(
					{
						evento_id: evento.id,
						sigla: sigla(c),
						nome: `Comitê de carga ${c}`,
						nome_oficial: `O Comitê de Carga ${c}`,
						crise_ligada: true,
						topicos: ['Tópico de carga']
					},
					{ onConflict: 'evento_id,sigla' }
				)
				.select()
				.single(),
			'comitê'
		);
		const delegacoes = await verificar(
			db
				.from('delegacao')
				.upsert(
					Array.from({ length: DELEGACOES }, (_, i) => ({
						comite_id: comite.id,
						nome: `Delegação ${dd(i + 1)}`,
						nome_oficial: `Delegação ${dd(i + 1)}`
					})),
					{ onConflict: 'comite_id,nome' }
				)
				.select('id, nome'),
			'delegações'
		);
		const porNome = new Map(delegacoes.map((d) => [d.nome, d.id]));
		convites.push(
			{ email: contaMesa(c), evento_id: evento.id, papel: 'mesa', comite_id: comite.id, delegacao_id: null },
			{ email: contaCrise(c), evento_id: evento.id, papel: 'crise', comite_id: comite.id, delegacao_id: null },
			...Array.from({ length: DELEGACOES }, (_, i) => ({
				email: contaDelegado(c, i + 1),
				evento_id: evento.id,
				papel: 'delegado',
				comite_id: comite.id,
				delegacao_id: porNome.get(`Delegação ${dd(i + 1)}`)!
			}))
		);
	}
	await verificar(
		db.from('convite').upsert(convites, { onConflict: 'email,evento_id,papel,comite_id', ignoreDuplicates: true }),
		'convites'
	);
	const existentes = new Set<string>();
	for (let pagina = 1; ; pagina++) {
		const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: 1000 });
		if (error) throw new Error(`usuários: ${error.message}`);
		for (const u of data.users) if (u.email) existentes.add(u.email);
		if (data.users.length < 1000) break;
	}
	for (const { email } of convites.filter((c) => !existentes.has(c.email))) {
		const { error } = await db.auth.admin.createUser({ email, password: SENHA, email_confirm: true });
		if (error) throw new Error(`conta ${email}: ${error.message}`);
	}
	console.log(`Pronto: ${COMITES} comitês com ${DELEGACOES} delegações e ${convites.length} contas de carga em ${url}.`);
}

// Rodar

type Papel = 'mesa' | 'crise' | 'delegado';
type Cliente = { db: SupabaseClient; conta: string; papel: Papel; c: number; d: number; topicos: string[] };
type Espera = { topico: string; tabela: string; t0: number; faltam: Set<number> };

function percentil(valores: number[], p: number) {
	if (!valores.length) return NaN;
	const ordenados = [...valores].sort((a, b) => a - b);
	return Math.round(ordenados[Math.min(ordenados.length - 1, Math.floor((p / 100) * ordenados.length))]);
}

async function emLotes<T, R>(itens: T[], tamanho: number, fazer: (item: T, i: number) => Promise<R>) {
	const saida: R[] = [];
	for (let i = 0; i < itens.length; i += tamanho) {
		saida.push(...(await Promise.all(itens.slice(i, i + tamanho).map((item, j) => fazer(item, i + j)))));
	}
	return saida;
}

async function rodar() {
	const url = destino();
	const chave = process.env.SUPABASE_CHAVE ?? local().publica;
	const entrar = async (conta: string) => {
		const db = createClient(url, chave, opcoes);
		const { error } = await db.auth.signInWithPassword({ email: conta, password: SENHA });
		if (error) throw new Error(`login ${conta}: ${error.message}`);
		return db;
	};

	// Os ids, pela conta da mesa de cada comitê.
	const mesas = await Promise.all(Array.from({ length: COMITES }, (_, i) => entrar(contaMesa(i + 1))));
	const comites: { id: string; delegacoes: string[]; documento?: string; votacao?: string }[] = [];
	for (const [i, mesa] of mesas.entries()) {
		const comite = await verificar(mesa.from('comite').select('id').eq('sigla', sigla(i + 1)).single(), 'comitê');
		const delegacoes = await verificar(
			mesa.from('delegacao').select('id, nome').eq('comite_id', comite.id).order('nome'),
			'delegações'
		);
		comites.push({ id: comite.id, delegacoes: delegacoes.map((d) => d.id) });
	}

	// Cenário de cada comitê: sessão nova com todos presentes, notas antigas respondidas,
	// uma votação aberta e um working paper de um bloco das delegações 01 a 05 (o
	// redator é a 01). Só o bloco ouve o canal do rascunho.
	await Promise.all(
		comites.map(async (comite, i) => {
			const c = i + 1;
			const mesa = mesas[i];
			const sessao = await verificar(mesa.rpc('abrir_sessao', { p_comite: comite.id }), 'sessão');
			await verificar(
				mesa.from('presenca').insert(comite.delegacoes.map((d) => ({ sessao_id: sessao, comite_id: comite.id, delegacao_id: d }))),
				'presença'
			);
			comite.votacao = await verificar(
				mesa.rpc('abrir_votacao_livre', { p_comite: comite.id, p_objeto: `Votação de carga ${Date.now()}` }),
				'votação'
			);
			const crise = await entrar(contaCrise(c));
			const pendentes = await verificar(
				crise.from('nota_crise').select('id').eq('comite_id', comite.id).in('status', ['pendente', 'em_analise']),
				'notas'
			);
			if (pendentes.length) {
				await verificar(
					crise.rpc('responder_notas', { p_ids: pendentes.map((n) => n.id), p_status: 'aprovada', p_resposta: 'Ok.' }),
					'responder'
				);
			}
			const redator = await entrar(contaDelegado(c, 1));
			const existente = await verificar(
				redator.from('documento').select('id').eq('comite_id', comite.id).eq('titulo', 'Working paper de carga').maybeSingle(),
				'documento'
			);
			if (existente) comite.documento = existente.id;
			else {
				const bloco = await verificar(redator.rpc('criar_bloco', { p_comite: comite.id, p_nome: 'Bloco de carga' }), 'bloco');
				comite.documento = await verificar(
					redator.rpc('criar_documento', { p_bloco: bloco, p_tipo: 'working_paper', p_titulo: 'Working paper de carga' }),
					'working paper'
				);
				for (let d = 2; d <= BLOCO; d++) {
					const membro = await entrar(contaDelegado(c, d));
					await verificar(membro.rpc('entrar_bloco', { p_bloco: bloco }), 'bloco');
				}
			}
		})
	);

	// Os clientes: em cada comitê, a mesa, a crise e as delegações; acima de 162,
	// as contas se repetem (como quem abre o app em dois aparelhos).
	const papeis: Omit<Cliente, 'db' | 'topicos'>[] = [];
	for (let c = 1; c <= COMITES; c++) {
		papeis.push({ conta: contaMesa(c), papel: 'mesa', c, d: 0 }, { conta: contaCrise(c), papel: 'crise', c, d: 0 });
		for (let d = 1; d <= DELEGACOES; d++) papeis.push({ conta: contaDelegado(c, d), papel: 'delegado', c, d });
	}
	const erros = new Map<string, number>();
	const anotarErro = (tipo: string) => erros.set(tipo, (erros.get(tipo) ?? 0) + 1);
	const esperas: Espera[] = [];
	const latencias: number[] = [];

	console.log(`Abrindo ${CLIENTES} clientes...`);
	const clientes = (
		await emLotes(Array.from({ length: CLIENTES }, (_, i) => papeis[i % papeis.length]), 20, async (p, i) => {
			try {
				const comite = comites[p.c - 1];
				const topicos = [`comite:${comite.id}`];
				if (p.papel === 'delegado' && p.d <= BLOCO) topicos.push(`documento:${comite.documento}`);
				if (p.papel === 'crise') topicos.push(`crise:${comite.id}`);
				if (p.papel === 'delegado') topicos.push(`delegacao:${comite.delegacoes[p.d - 1]}`);
				const cliente: Cliente = { ...p, db: await entrar(p.conta), topicos };
				await Promise.all(
					topicos.map(
						(topico) =>
							new Promise<void>((pronto) => {
								cliente.db
									.channel(topico, { config: { private: true } })
									.on('broadcast', { event: 'mudou' }, ({ payload }) => {
										const agora = performance.now();
										const espera = esperas.find((e) => e.topico === topico && e.tabela === payload?.tabela && e.faltam.has(i));
										if (!espera) return;
										espera.faltam.delete(i);
										latencias.push(agora - espera.t0);
									})
									.subscribe((status, erro) => {
										if (status === 'SUBSCRIBED') pronto();
										else if (status !== 'CLOSED') {
											anotarErro(`canal ${status}${erro ? `: ${erro.message}` : ''}`);
											pronto();
										}
									});
							})
					)
				);
				return [i, cliente] as const;
			} catch (e) {
				anotarErro((e as Error).message.replace(/carga-\S+/, '<conta>'));
				return null;
			}
		})
	).filter((c) => c !== null);
	const porIndice = new Map(clientes);
	console.log(`${porIndice.size} de ${CLIENTES} clientes conectados.`);

	const ouvintes = (topico: string) => new Set([...porIndice].filter(([, c]) => c.topicos.includes(topico)).map(([i]) => i));
	const acoes: Promise<void>[] = [];
	const agir = (topico: string, tabela: string, conta: string, fazer: (db: SupabaseClient) => PromiseLike<{ error: unknown }>) => {
		const ator = [...porIndice.values()].find((c) => c.conta === conta);
		if (!ator) return;
		const espera: Espera = { topico, tabela, t0: performance.now(), faltam: ouvintes(topico) };
		esperas.push(espera);
		acoes.push(
			Promise.resolve(fazer(ator.db)).then(({ error }) => {
				if (error) {
					anotarErro(`ação ${tabela}: ${(error as { message?: string }).message}`);
					espera.faltam.clear();
				}
			})
		);
	};

	console.log(`${RODADAS} rodadas, uma por segundo...`);
	for (let r = 0; r < RODADAS; r++) {
		for (const [i, comite] of comites.entries()) {
			const c = i + 1;
			const delegado = (r % DELEGACOES) + 1;
			agir(`comite:${comite.id}`, 'pedido_fala', contaDelegado(c, delegado), (db) =>
				db.rpc('levantar_placa', { p_comite: comite.id })
			);
			agir(`comite:${comite.id}`, 'voto', contaDelegado(c, ((r + 12) % DELEGACOES) + 1), (db) =>
				db.rpc('votar', { p_votacao: comite.votacao!, p_escolha: r % 2 ? 'a_favor' : 'contra' })
			);
			agir(`crise:${comite.id}`, 'nota_crise', contaDelegado(c, delegado), (db) =>
				db.rpc('enviar_nota', {
					p_id: crypto.randomUUID(),
					p_comite: comite.id,
					p_tipo: 'nota',
					p_titulo: `Nota de carga ${r}`,
					p_texto: 'Teste de carga.'
				})
			);
			agir(`documento:${comite.documento}`, 'clausula', contaDelegado(c, 1), (db) =>
				db.rpc('adicionar_clausula', { p_documento: comite.documento!, p_tipo: 'operativa', p_texto: `Cláusula de carga ${r}` })
			);
		}
		await new Promise((pronto) => setTimeout(pronto, 1_000));
	}
	await Promise.all(acoes);
	await new Promise((pronto) => setTimeout(pronto, ESPERA_MS));

	const perdidos = esperas.reduce((soma, e) => soma + e.faltam.size, 0);
	const entregues = latencias.length;
	const naMeta = latencias.filter((l) => l <= META_MS).length;
	console.log('\nResultado');
	console.log(`  clientes conectados: ${porIndice.size} de ${CLIENTES}`);
	console.log(`  ações: ${esperas.length}; avisos entregues: ${entregues}; perdidos: ${perdidos}`);
	console.log(
		`  latência (ms): mediana ${percentil(latencias, 50)}, p95 ${percentil(latencias, 95)}, p99 ${percentil(latencias, 99)}, máxima ${percentil(latencias, 100)}`
	);
	console.log(`  em menos de ${META_MS} ms: ${entregues ? ((100 * naMeta) / entregues).toFixed(1) : 0}%`);
	if (erros.size) {
		console.log('  erros:');
		for (const [tipo, n] of erros) console.log(`    ${n} × ${tipo}`);
	}
	for (const c of porIndice.values()) c.db.realtime.disconnect();
	process.exit(perdidos || erros.size ? 1 : 0);
}

const comando = process.argv[2];
if (comando === 'preparar') await preparar();
else if (comando === 'rodar') await rodar();
else {
	console.error('Use: node scripts/carga.ts preparar | rodar');
	process.exit(2);
}
