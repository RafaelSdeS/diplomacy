// Evento de demonstração (passo 20): os 6 comitês do UFRGSMUN 2026, com 147
// delegações, mesas, press, crise, cronograma de 4 dias e conteúdo para as telas
// não ficarem vazias. Serve para testar o app à mão; os testes automáticos usam o
// evento do seed.
//
// Usa o fluxo real: convites, depois as contas (o gatilho nova_conta liga cada
// uma); o conteúdo é criado entrando com as contas, porque as funções do banco
// conferem quem chama. Pode rodar de novo sem duplicar nada.
// Só roda no Supabase local, a menos que DEMO_PERMITIR_REMOTO=1 (num projeto de
// teste, com SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_ANON_KEY).
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { conectarAdmin, criarContas, SENHA, tipoDoItem, usuariosPorEmail, verificar } from './admin.ts';
import { bioFicticia, COM_DOIS_DELEGADOS, COMITES, CRONOGRAMA, EVENTO, nomeFicticio, type Comite } from './demonstracao/dados.ts';
import { BLOCOS, CARTAS, CRISE, DPOS, DPOS_T2, NOTICIAS, PROJETO_A, PROJETO_B, WORKING_PAPERS, type Dpo } from './demonstracao/csnu.ts';

const inicio = Date.now();
const { db, url, chavePublica } = await conectarAdmin('DEMO_PERMITIR_REMOTO');
if (!chavePublica) throw new Error('Defina SUPABASE_ANON_KEY: o conteúdo é criado entrando com as contas.');

const evento = verificar(await db.from('evento').upsert(EVENTO, { onConflict: 'nome,ano' }).select().single(), 'evento');

const doisDigitos = (i: number) => String(i + 1).padStart(2, '0');
const email = (sigla: string, parte: string) => `demo.${sigla.toLowerCase()}.${parte}@exemplo.test`;
const situacaoDe = (d: Comite['delegacoes'][number]) => d[3] ?? 'membro';

type Conta = { email: string; nome: string; papel: string; sigla: string | null; delegacao?: string };
type Ids = { comite: string; veiculo: string; delegacoes: Map<string, string> };
const contas: Conta[] = [];
const idsDe = new Map<string, Ids>();
let pessoa = 0;

for (const c of COMITES) {
	const comite = verificar(
		await db
			.from('comite')
			.upsert(
				{
					evento_id: evento.id,
					sigla: c.sigla,
					nome: c.nome,
					nome_oficial: c.nome_oficial,
					idioma: c.idioma,
					crise_ligada: c.crise,
					tecnologia_restrita: c.tecnologia_restrita,
					regras: c.regras,
					topicos: c.topicos
				},
				{ onConflict: 'evento_id,sigla' }
			)
			.select()
			.single(),
		c.sigla
	);
	const delegacoes = verificar(
		await db
			.from('delegacao')
			.upsert(
				c.delegacoes.map((d) => ({ comite_id: comite.id, nome: d[0], nome_oficial: d[1], bandeira: d[2], situacao: situacaoDe(d) })),
				{ onConflict: 'comite_id,nome' }
			)
			.select(),
		`delegações de ${c.sigla}`
	);
	const veiculo = verificar(
		await db
			.from('veiculo')
			.upsert({ comite_id: comite.id, ...c.veiculo }, { onConflict: 'comite_id' })
			.select()
			.single(),
		`veículo de ${c.sigla}`
	);
	idsDe.set(c.sigla, { comite: comite.id, veiculo: veiculo.id, delegacoes: new Map(delegacoes.map((d) => [d.nome, d.id])) });

	c.delegacoes.forEach(([nome], i) => {
		contas.push({ email: email(c.sigla, doisDigitos(i)), nome: nomeFicticio(pessoa++), papel: 'delegado', sigla: c.sigla, delegacao: nome });
		if ((COM_DOIS_DELEGADOS as readonly number[]).includes(i)) {
			contas.push({ email: email(c.sigla, `${doisDigitos(i)}b`), nome: nomeFicticio(pessoa++), papel: 'delegado', sigla: c.sigla, delegacao: nome });
		}
	});
	for (const n of [1, 2, 3]) contas.push({ email: email(c.sigla, `mesa${n}`), nome: nomeFicticio(pessoa++), papel: 'mesa', sigla: c.sigla });
	contas.push({ email: email(c.sigla, 'press'), nome: nomeFicticio(pessoa++), papel: 'press', sigla: c.sigla });
	if (c.crise) for (const n of [1, 2]) contas.push({ email: email(c.sigla, `crise${n}`), nome: nomeFicticio(pessoa++), papel: 'crise', sigla: c.sigla });
}
contas.push({ email: 'demo.secretaria@exemplo.test', nome: nomeFicticio(pessoa++), papel: 'secretaria', sigla: null });
contas.push({ email: 'demo.diretoria-press@exemplo.test', nome: nomeFicticio(pessoa++), papel: 'diretoria_press', sigla: null });

verificar(
	await db.from('convite').upsert(
		contas.map((c) => ({
			email: c.email,
			nome: c.nome,
			evento_id: evento.id,
			papel: c.papel,
			comite_id: c.sigla ? idsDe.get(c.sigla)!.comite : null,
			delegacao_id: c.delegacao ? idsDe.get(c.sigla!)!.delegacoes.get(c.delegacao)! : null
		})),
		{ onConflict: 'email,evento_id,papel,comite_id', ignoreDuplicates: true }
	),
	'convites'
);
await criarContas(db, contas);

// Minibiografias, só onde ainda não há.
const idPorEmail = await usuariosPorEmail(db);
const semBio = new Set(
	verificar(
		await db
			.from('pessoa')
			.select('id')
			.in('id', contas.map((c) => idPorEmail.get(c.email)!))
			.is('bio', null),
		'pessoas sem minibiografia'
	).map((p) => p.id)
);
const bios = contas
	.map((c, i) => ({ id: idPorEmail.get(c.email)!, nome: c.nome, bio: bioFicticia(i) }))
	.filter((p) => semBio.has(p.id));
if (bios.length) verificar(await db.from('pessoa').upsert(bios, { onConflict: 'id' }), 'minibiografias');

// Cronograma de 4 dias, a partir do dia da primeira execução (horário de Brasília).
const itens = await db.from('cronograma_item').select('id', { count: 'exact', head: true }).eq('evento_id', evento.id);
if (itens.error) throw new Error(`cronograma: ${itens.error.message}`);
if (!itens.count) {
	const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
	const dia = (d: number) => new Date(Date.parse(`${hoje}T12:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10);
	const quando = (d: number, hora: string) => `${dia(d)}T${hora}:00-03:00`;
	verificar(
		await db.from('cronograma_item').insert(
			CRONOGRAMA.flatMap(([d, de, ate, titulo, local, doComite]): Record<string, string | null>[] =>
				doComite
					? COMITES.map((c, i) => ({
							evento_id: evento.id,
							comite_id: idsDe.get(c.sigla)!.comite,
							titulo,
							tipo: tipoDoItem(titulo),
							local: `${local} ${101 + i}`,
							inicio: quando(d, de),
							fim: quando(d, ate)
						}))
					: [{ evento_id: evento.id, comite_id: null, titulo, tipo: tipoDoItem(titulo), local, inicio: quando(d, de), fim: quando(d, ate) }]
			)
		),
		'cronograma'
	);
}

const avisos = await db.from('aviso').select('id', { count: 'exact', head: true }).eq('evento_id', evento.id);
if (avisos.error) throw new Error(`avisos: ${avisos.error.message}`);
if (!avisos.count) {
	const autor_id = idPorEmail.get('demo.secretaria@exemplo.test')!;
	verificar(
		await db.from('aviso').insert([
			{ evento_id: evento.id, autor_id, texto: 'Bem-vindos ao UFRGSMUN! O credenciamento começa às 8h, no saguão.' },
			{ evento_id: evento.id, autor_id, texto: 'O mock and rules, às 10h no Salão de Atos, mostra o app e as regras de procedimento.' }
		]),
		'avisos'
	);
}

// --- Conteúdo de cada comitê, só na primeira vez (antes da primeira sessão) ---

async function como(conta: string) {
	const cliente = createClient(url, chavePublica, { auth: { persistSession: false, autoRefreshToken: false } });
	const { error } = await cliente.auth.signInWithPassword({ email: conta, password: SENHA });
	if (error) throw new Error(`entrar como ${conta}: ${error.message}`);
	return cliente;
}

async function chamar<T = unknown>(cliente: SupabaseClient, funcao: string, args: Record<string, unknown>): Promise<T> {
	const { data, error } = await cliente.rpc(funcao, args);
	if (error) throw new Error(`${funcao}: ${error.message}`);
	return data as T;
}

async function conteudo(c: Comite) {
	const ids = idsDe.get(c.sigla)!;
	const en = c.idioma === 'en';
	const tx = (pt: string, ingles: string) => (en ? ingles : pt);
	// Só delegações membros escrevem os documentos de exemplo; o índice dá a conta.
	const membros = c.delegacoes.flatMap((d, i) => (situacaoDe(d) === 'membro' ? [{ nome: d[0], id: ids.delegacoes.get(d[0])!, conta: email(c.sigla, doisDigitos(i)) }] : []));
	const [abre, a, b, d3] = membros;
	const topico = c.topicos[0];
	const mesa = await como(email(c.sigla, 'mesa1'));

	const ca = await como(a.conta);
	const cb = await como(b.conta);
	// Passo 43: o CSNU tem conteúdo completo e realista (scripts/demonstracao/csnu.ts).
	if (c.sigla !== 'CSNU') {
		// DPOs: um aprovado, um enviado e um rascunho.
		const dpos: string[] = [];
		for (const [k, m] of [a, b, d3].entries()) {
			const cliente = await como(m.conta);
			const texto = tx(
				`A delegação de ${m.nome} acompanha com preocupação "${topico}".\n\nDefendemos soluções construídas em conjunto, com respeito à soberania dos Estados e ao direito internacional.\n\nPropomos cooperação regional, troca de informações e apoio às populações afetadas.`,
				`The delegation of ${m.nome} follows "${topico}" with concern.\n\nWe support jointly built solutions that respect the sovereignty of States and international law.\n\nWe propose regional cooperation, information sharing and support for affected populations.`
			);
			const id = await chamar<string>(cliente, 'salvar_dpo', { p_comite: ids.comite, p_topico: 1, p_texto: texto, p_referencias: ['Carta das Nações Unidas (1945)'] });
			if (k < 2) await chamar(cliente, 'enviar_dpo', { p_dpo: id });
			dpos.push(id);
		}
		await chamar(mesa, 'avaliar_dpo', { p_dpo: dpos[0], p_status: 'aprovado', p_comentario: tx('Bem fundamentado.', 'Well argued.') });

		// Cartas: uma pública e uma privada.
		await chamar(ca, 'enviar_carta', {
			p_comite: ids.comite,
			p_titulo: tx('Proposta de cooperação', 'Proposal for cooperation'),
			p_corpo: tx(
				`Excelentíssima delegação de ${b.nome},\n\nPropomos trabalharmos juntos em "${topico}", começando pela troca de informações.\n\nCom os melhores votos,\nDelegação de ${a.nome}`,
				`Distinguished delegation of ${b.nome},\n\nWe propose working together on "${topico}", starting with information sharing.\n\nWith our best regards,\nDelegation of ${a.nome}`
			),
			p_publica: true,
			p_destinatarios: [b.id]
		});
		await chamar(cb, 'enviar_carta', {
			p_comite: ids.comite,
			p_titulo: tx('Resposta reservada', 'Confidential reply'),
			p_corpo: tx(
				`Excelentíssima delegação de ${a.nome},\n\nAceitamos conversar antes da próxima sessão.\n\nDelegação de ${b.nome}`,
				`Distinguished delegation of ${a.nome},\n\nWe agree to talk before the next session.\n\nDelegation of ${b.nome}`
			),
			p_publica: false,
			p_destinatarios: [a.id]
		});

	}

	// Agenda do tópico 1, proposta por uma delegação e adotada pela mesa.
	await chamar(ca, 'salvar_proposta_agenda', {
		p_comite: ids.comite,
		p_topico: 1,
		p_itens: [
			{ texto: tx('A. Causas e contexto', 'A. Causes and context'), nivel: 0 },
			{ texto: tx('A.1 Atores envolvidos', 'A.1 Actors involved'), nivel: 1 },
			{ texto: tx('A.2 Impactos humanitários', 'A.2 Humanitarian impact'), nivel: 1 },
			{ texto: tx('B. Resposta internacional', 'B. International response'), nivel: 0 },
			{ texto: tx('B.1 Cooperação regional', 'B.1 Regional cooperation'), nivel: 1 },
			{ texto: tx('B.2 Financiamento e capacitação', 'B.2 Funding and capacity-building'), nivel: 1 }
		]
	});
	const proposta = verificar(
		await mesa.from('proposta_agenda').select('id').eq('comite_id', ids.comite).eq('topico', 1).limit(1).single(),
		'proposta de agenda'
	);
	await chamar(mesa, 'adotar_proposta', { p_proposta: proposta.id });

	if (c.sigla === 'CSNU') await csnuCompleto(c, ids, mesa);
	else {
		// Um bloco com working paper e um projeto em rodada de revisão.
		const bloco = await chamar<string>(ca, 'criar_bloco', { p_comite: ids.comite, p_nome: tx('Bloco da cooperação', 'Cooperation bloc') });
		await chamar(cb, 'entrar_bloco', { p_bloco: bloco });
		const wp = await chamar<string>(ca, 'criar_documento', { p_bloco: bloco, p_tipo: 'working_paper', p_titulo: tx('Notas sobre o item A.1', 'Notes on item A.1'), p_topico: 1 });
		await chamar(ca, 'adicionar_clausula', { p_documento: wp, p_tipo: 'texto', p_texto: tx('Levantamento dos atores e das resoluções anteriores.', 'Survey of the actors and previous resolutions.') });
		const projeto = await chamar<string>(ca, 'criar_documento', { p_bloco: bloco, p_tipo: 'projeto', p_titulo: topico, p_topico: 1 });
		for (const [tipo, texto] of [
			['preambular', tx('Reconhecendo a gravidade da situação,', 'Recognising the gravity of the situation,')],
			['preambular', tx('Recordando as resoluções anteriores sobre o tema,', 'Recalling previous resolutions on the matter,')],
			['operativa', tx('Exorta os Estados a ampliar a cooperação regional;', 'Urges States to expand regional cooperation;')],
			['operativa', tx('Solicita ao Secretariado um relatório sobre o andamento das medidas;', 'Requests the Secretariat to report on progress;')],
			['operativa', tx('Decide continuar ocupando-se ativamente da questão.', 'Decides to remain actively seized of the matter.')]
		]) {
			await chamar(ca, 'adicionar_clausula', { p_documento: projeto, p_tipo: tipo, p_texto: texto });
		}
		await chamar(ca, 'abrir_rodada', { p_documento: projeto, p_minutos: 120 });

		// Duas notícias publicadas, citando delegações.
		const press = await como(email(c.sigla, 'press'));
		for (const [titulo, texto, citadas] of [
			[
				tx(`Comitê começa a debater "${topico}"`, `Committee starts debating "${topico}"`),
				tx('As delegações apresentaram as primeiras posições e adotaram a agenda do tópico.', 'Delegations presented their first positions and adopted the agenda for the topic.'),
				[a.id]
			],
			[
				tx(`${a.nome} e ${b.nome} trocam cartas antes da sessão`, `${a.nome} and ${b.nome} exchange letters before the session`),
				tx('A correspondência sugere um bloco em formação.', 'The correspondence hints at a bloc in the making.'),
				[a.id, b.id]
			]
		] as const) {
			await chamar(press, 'publicar_noticia', {
				p_id: randomUUID(),
				p_veiculo: ids.veiculo,
				p_tipo: 'reportagem',
				p_titulo: titulo,
				p_texto: texto,
				p_citadas: citadas
			});
		}

	}

	// A sessão 1: chamada, plenária de abertura e a votação do tópico no topo.
	// Com tecnologia restrita (OEA), o delegado não envia moções durante a sessão:
	// fica só a chamada.
	await chamar(mesa, 'sortear_presidencia', { p_comite: ids.comite });
	const sessao = await chamar<string>(mesa, 'abrir_sessao', { p_comite: ids.comite });
	const presentes = c.delegacoes.filter((d) => situacaoDe(d) !== 'suspensa').map((d) => ids.delegacoes.get(d[0])!);
	verificar(
		await mesa.from('presenca').upsert(presentes.map((delegacao_id) => ({ sessao_id: sessao, comite_id: ids.comite, delegacao_id }))),
		'chamada'
	);
	if (!c.tecnologia_restrita) {
		await chamar(mesa, 'avancar_plenaria', { p_comite: ids.comite });
		await chamar(mesa, 'avancar_plenaria', { p_comite: ids.comite });
		await chamar(await como(abre.conta), 'enviar_ponto', { p_comite: ids.comite, p_tipo: 'topico_no_topo', p_topico: 1 });
		const ponto = verificar(
			await mesa.from('ponto_mocao').select('id').eq('sessao_id', sessao).eq('tipo', 'topico_no_topo').limit(1).single(),
			'moção do tópico no topo'
		);
		await chamar(mesa, 'abrir_votacao', { p_ponto: ponto.id });
		const votacao = verificar(await mesa.from('votacao').select('id').eq('sessao_id', sessao).eq('aberta', true).single(), 'votação');
		for (const [i, delegacao] of presentes.entries()) {
			await chamar(mesa, 'registrar_voto', { p_votacao: votacao.id, p_delegacao: delegacao, p_escolha: i % 5 === 4 ? 'contra' : 'a_favor' });
		}
		await chamar(mesa, 'encerrar_votacao', { p_votacao: votacao.id });
	}
	await chamar(mesa, 'encerrar_sessao', { p_comite: ids.comite });
}

// Passo 43: o CSNU completo. 19 DPOs em situações diferentes, dois blocos com working
// papers, um projeto aprovado pela mesa e outro em rodada (com propostas, comentários e
// cláusulas acordadas), cartas, crise com notas e notícias. Nada vai a votação.
async function csnuCompleto(c: Comite, ids: { comite: string; veiculo: string; delegacoes: Map<string, string> }, mesa: SupabaseClient) {
	const indice = new Map(c.delegacoes.map((d, i) => [d[0], i]));
	const clientes = new Map<string, SupabaseClient>();
	const de = async (nome: string) => {
		if (!clientes.has(nome)) clientes.set(nome, await como(email(c.sigla, doisDigitos(indice.get(nome)!))));
		return clientes.get(nome)!;
	};
	const id = (nome: string) => ids.delegacoes.get(nome)!;

	for (const [topico, dpos] of [[1, DPOS], [2, DPOS_T2]] as [number, Record<string, Dpo>][]) {
		for (const [nome, dpo] of Object.entries(dpos)) {
			const cliente = await de(nome);
			const dpoId = await chamar<string>(cliente, 'salvar_dpo', { p_comite: ids.comite, p_topico: topico, p_texto: dpo.texto, p_referencias: dpo.referencias });
			if (dpo.situacao === 'rascunho') continue;
			await chamar(cliente, 'enviar_dpo', { p_dpo: dpoId });
			if (dpo.situacao === 'aprovado') await chamar(mesa, 'avaliar_dpo', { p_dpo: dpoId, p_status: 'aprovado' });
			if (dpo.situacao === 'pede_ajustes') await chamar(mesa, 'avaliar_dpo', { p_dpo: dpoId, p_status: 'pede_ajustes', p_comentario: dpo.comentario });
		}
	}

	for (const carta of CARTAS) {
		await chamar(await de(carta.de), 'enviar_carta', {
			p_comite: ids.comite,
			p_titulo: carta.titulo,
			p_corpo: carta.corpo,
			p_publica: carta.publica,
			p_destinatarios: carta.para.map(id)
		});
	}

	const blocos: string[] = [];
	for (const b of BLOCOS) {
		const bloco = await chamar<string>(await de(b.membros[0]), 'criar_bloco', { p_comite: ids.comite, p_nome: b.nome });
		for (const m of b.membros.slice(1)) await chamar(await de(m), 'entrar_bloco', { p_bloco: bloco });
		blocos.push(bloco);
	}
	for (const wp of WORKING_PAPERS) {
		const autor = await de(BLOCOS[wp.bloco].membros[0]);
		const doc = await chamar<string>(autor, 'criar_documento', { p_bloco: blocos[wp.bloco], p_tipo: 'working_paper', p_titulo: wp.titulo, p_topico: 1 });
		for (const texto of wp.texto) await chamar(autor, 'adicionar_clausula', { p_documento: doc, p_tipo: 'texto', p_texto: texto });
	}
	const projeto = async (p: typeof PROJETO_A | typeof PROJETO_B) => {
		const autor = await de(BLOCOS[p.bloco].membros[0]);
		const doc = await chamar<string>(autor, 'criar_documento', { p_bloco: blocos[p.bloco], p_tipo: 'projeto', p_titulo: p.titulo, p_topico: 1 });
		for (const texto of p.preambulares) await chamar(autor, 'adicionar_clausula', { p_documento: doc, p_tipo: 'preambular', p_texto: texto });
		const operativas: string[] = [];
		for (const texto of p.operativas) operativas.push(await chamar<string>(autor, 'adicionar_clausula', { p_documento: doc, p_tipo: 'operativa', p_texto: texto }));
		return { autor, doc, operativas };
	};

	const a = await projeto(PROJETO_A);
	for (const nome of PROJETO_A.signatarios) await chamar(await de(nome), 'assinar', { p_documento: a.doc, p_assinar: true });
	await chamar(a.autor, 'enviar_documento', { p_documento: a.doc, p_aprovacao: 'votacao' });
	await chamar(mesa, 'aprovar_documento', { p_documento: a.doc, p_aprovar: true });

	const b = await projeto(PROJETO_B);
	await chamar(b.autor, 'abrir_rodada', { p_documento: b.doc, p_minutos: 120 });
	for (const i of PROJETO_B.acordadas) await chamar(b.autor, 'marcar_clausula', { p_clausula: b.operativas[i], p_status: 'acordada' });
	for (const p of PROJETO_B.propostas) await chamar(await de(p.de), 'propor_alteracao', { p_clausula: b.operativas[p.operativa], p_texto: p.texto });
	for (const x of PROJETO_B.comentarios) await chamar(await de(x.de), 'comentar', { p_clausula: b.operativas[x.operativa], p_texto: x.texto });

	const crise = await como(email(c.sigla, 'crise1'));
	await chamar(crise, 'publicar_atualizacao', { p_comites: [ids.comite], p_texto: CRISE.atualizacao });
	for (const n of CRISE.notas) {
		const notaId = randomUUID();
		await chamar(await de(n.de), 'enviar_nota', { p_id: notaId, p_comite: ids.comite, p_tipo: 'nota', p_titulo: n.titulo, p_texto: n.texto });
		if (!n.resposta) continue;
		await chamar(crise, 'assumir_nota', { p_id: notaId });
		await chamar(crise, 'responder_notas', { p_ids: [notaId], p_status: 'aprovada', p_resposta: n.resposta });
	}

	const press = await como(email(c.sigla, 'press'));
	for (const n of NOTICIAS) {
		await chamar(press, 'publicar_noticia', {
			p_id: randomUUID(),
			p_veiculo: ids.veiculo,
			p_tipo: 'reportagem',
			p_titulo: n.titulo,
			p_texto: n.texto,
			p_citadas: n.citadas.map(id)
		});
	}
}

for (const c of COMITES) {
	const sessoes = await db.from('sessao').select('id', { count: 'exact', head: true }).eq('comite_id', idsDe.get(c.sigla)!.comite);
	if (sessoes.error) throw new Error(`sessões de ${c.sigla}: ${sessoes.error.message}`);
	if (!sessoes.count) await conteudo(c);
}

console.log(
	`Demonstração pronta em ${Math.round((Date.now() - inicio) / 1000)} s: ${COMITES.length} comitês, ` +
		`${COMITES.reduce((n, c) => n + c.delegacoes.length, 0)} delegações e ${contas.length} contas demo.*@exemplo.test (senha "${SENHA}") em ${url}.`
);
