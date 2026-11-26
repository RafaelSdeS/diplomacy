-- Passo 16: procedimento completo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Cenário: C1 no formato do CSNU (15 delegações, P1 a P5 permanentes) e C2 com
-- unanimidade (U1 a U3). a1 é a mesa de C1; a2, delegado de D06 (C1); a3, a mesa de
-- C2; a4, delegado de U1 (C2). Os votos entram pela mesa (votos de placa).
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial, topicos, regras) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Conselho 1', array['T1', 'T2'],
		'{"votacao_substantiva": "csnu", "membros_permanentes": ["P1", "P2", "P3", "P4", "P5"]}'),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'C2', 'O Conselho 2', array['T1'],
		'{"votacao_substantiva": "unanimidade"}');
insert into public.delegacao (comite_id, nome, nome_oficial)
select '00000000-0000-0000-0000-0000000000c1', n, n
from unnest(array['P1', 'P2', 'P3', 'P4', 'P5', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15']) n;
insert into public.delegacao (comite_id, nome, nome_oficial)
select '00000000-0000-0000-0000-0000000000c2', n, n from unnest(array['U1', 'U2', 'U3']) n;
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'a' || n || '@exemplo.test', json_build_object('nome', 'A' || n)
from generate_series(1, 4) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1',
		(select id from public.delegacao where nome = 'D06')),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c2', null),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c2',
		(select id from public.delegacao where nome = 'U1'));

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text,
		true
	);
end $$;
create temp table ids (nome text primary key, id uuid);
grant all on ids to authenticated;
create function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where nome = p $$;
create function pg_temp.d(p text) returns uuid language sql as $$ select id from public.delegacao where nome = p $$;
-- A mesa registra os votos de placa das delegações.
create function pg_temp.votos(p_votacao uuid, p_nomes text[], p_escolha public.escolha_voto) returns void language plpgsql as $$
begin
	perform public.registrar_voto(p_votacao, pg_temp.d(n), p_escolha) from unnest(p_nomes) n;
end $$;
-- Abre uma sessão com as delegações presentes (como postgres) e devolve à mesa n.
create function pg_temp.sessao(p_comite uuid, p_mesa int, p_presentes text[]) returns void language plpgsql as $$
begin
	perform pg_temp.entrar(p_mesa);
	perform public.abrir_sessao(p_comite);
	perform set_config('role', 'postgres', true);
	insert into public.presenca (sessao_id, comite_id, delegacao_id)
	select public.sessao_atual(p_comite), p_comite, pg_temp.d(n) from unnest(p_presentes) n;
	perform pg_temp.entrar(p_mesa);
end $$;
create function pg_temp.abrir(p_comite uuid) returns uuid language sql as $$
	select public.abrir_votacao_livre(p_comite, 'Questão substantiva', 'substantiva')
$$;
create function pg_temp.aprovada(p_votacao uuid) returns boolean language plpgsql as $$
begin
	perform public.encerrar_votacao(p_votacao);
	return (select aprovada from public.votacao where id = p_votacao);
end $$;

-- CSNU

select pg_temp.sessao('00000000-0000-0000-0000-0000000000c1', 1,
	array['P1', 'P2', 'P3', 'P4', 'P5', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15']);
insert into ids values ('v', pg_temp.abrir('00000000-0000-0000-0000-0000000000c1'));
select pg_temp.votos(pg_temp.id('v'), array['D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14'], 'a_favor');
select pg_temp.votos(pg_temp.id('v'), array['P1'], 'contra');
select is(pg_temp.aprovada(pg_temp.id('v')), false, 'CSNU: 9 a favor com o voto contra de um permanente reprova');
delete from ids where nome = 'v';
insert into ids values ('v', pg_temp.abrir('00000000-0000-0000-0000-0000000000c1'));
select pg_temp.votos(pg_temp.id('v'), array['D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14'], 'a_favor');
select pg_temp.votos(pg_temp.id('v'), array['P1'], 'abstencao');
select pg_temp.votos(pg_temp.id('v'), array['D15'], 'contra');
select is(pg_temp.aprovada(pg_temp.id('v')), true, 'CSNU: 9 a favor com a abstenção de um permanente (e um contra comum) aprova');
delete from ids where nome = 'v';
insert into ids values ('v', pg_temp.abrir('00000000-0000-0000-0000-0000000000c1'));
select pg_temp.votos(pg_temp.id('v'), array['D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13'], 'a_favor');
select is(pg_temp.aprovada(pg_temp.id('v')), false, 'CSNU: 8 a favor reprova');

delete from ids where nome = 'v';
insert into ids values ('v', pg_temp.abrir('00000000-0000-0000-0000-0000000000c1'));
select public.marcar_parte(pg_temp.id('v'), pg_temp.d('D06'), true);
select throws_ok($$select pg_temp.votos(pg_temp.id('v'), array['D06'], 'a_favor')$$, 'P0001', null,
	'CSNU: a parte na disputa não vota a favor');
select throws_ok($$select pg_temp.votos(pg_temp.id('v'), array['D06'], 'contra')$$, 'P0001', null, 'nem contra');
select lives_ok($$select pg_temp.votos(pg_temp.id('v'), array['D06'], 'abstencao')$$, 'mas se abstém');

-- Votação nominal: passar a vez uma vez só, e quem passou não se abstém
reset role;
update public.votacao set nominal = true where id = pg_temp.id('v');
select pg_temp.entrar(1);
select lives_ok($$select public.passar_vez(pg_temp.id('v'), pg_temp.d('D07'))$$, 'nominal: a delegação passa a vez');
select throws_ok($$select public.passar_vez(pg_temp.id('v'), pg_temp.d('D07'))$$, '23505', null, 'ninguém passa duas vezes');
select throws_ok($$select pg_temp.votos(pg_temp.id('v'), array['D07'], 'abstencao')$$, 'P0001', null,
	'quem passou a vez não se abstém');
select lives_ok($$select pg_temp.votos(pg_temp.id('v'), array['D07'], 'a_favor')$$, 'mas vota a favor ou contra');
select throws_ok($$select public.passar_vez(pg_temp.id('v'), pg_temp.d('D06'))$$, 'P0001', null, 'quem já votou não passa');
select public.encerrar_votacao(pg_temp.id('v'));

-- Unanimidade (Conselho Europeu)

select pg_temp.sessao('00000000-0000-0000-0000-0000000000c2', 3, array['U1', 'U2']);
insert into ids values ('u1', pg_temp.abrir('00000000-0000-0000-0000-0000000000c2'));
select pg_temp.votos(pg_temp.id('u1'), array['U1', 'U2'], 'a_favor');
select is(pg_temp.aprovada(pg_temp.id('u1')), false, 'unanimidade: uma delegação ausente impede a aprovação');
select pg_temp.sessao('00000000-0000-0000-0000-0000000000c2', 3, array['U1', 'U2', 'U3']);
insert into ids values ('u2', pg_temp.abrir('00000000-0000-0000-0000-0000000000c2'));
select pg_temp.votos(pg_temp.id('u2'), array['U1', 'U2'], 'a_favor');
select pg_temp.votos(pg_temp.id('u2'), array['U3'], 'contra');
select is(pg_temp.aprovada(pg_temp.id('u2')), false, 'unanimidade: um voto contra impede');
insert into ids values ('u3', pg_temp.abrir('00000000-0000-0000-0000-0000000000c2'));
select pg_temp.votos(pg_temp.id('u3'), array['U1', 'U2', 'U3'], 'a_favor');
select is(pg_temp.aprovada(pg_temp.id('u3')), true, 'unanimidade: todas a favor aprova');

-- Tecnologia restrita (C2): durante a sessão, a mesa opera o app
reset role;
update public.comite set tecnologia_restrita = true where id = '00000000-0000-0000-0000-0000000000c2';
select pg_temp.entrar(4);
select throws_ok($$select public.levantar_placa('00000000-0000-0000-0000-0000000000c2')$$, '42501', null,
	'tecnologia restrita: o delegado não levanta a placa durante a sessão');
select pg_temp.entrar(3);
select lives_ok($$select public.registrar_pedido_fala('00000000-0000-0000-0000-0000000000c2', pg_temp.d('U1'))$$,
	'a mesa registra o pedido de fala pela delegação');

-- Projeto em C1: sala fechada, divisão da questão e uma resolução por tópico (as emendas saíram no passo 63)
reset role;
insert into public.bloco (id, comite_id, nome) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Bloco');
insert into public.documento (id, comite_id, bloco_id, tipo, titulo, topico, status, numero) values
	('00000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1',
		'projeto', 'Projeto 1', 1, 'aprovado_mesa', 1);
insert into public.clausula (documento_id, comite_id, tipo, texto, ordem) values
	('00000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-0000000000c1', 'preambular', 'Recordando', 1),
	('00000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-0000000000c1', 'operativa', 'Decide A', 2),
	('00000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-0000000000c1', 'operativa', 'Decide B', 3);
select pg_temp.sessao('00000000-0000-0000-0000-0000000000c1', 1,
	array['P1', 'P2', 'P3', 'P4', 'P5', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15']);

select public.iniciar_votacao_projeto('00000000-0000-0000-0000-000000000d01');
select pg_temp.entrar(2);
select throws_ok($$select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'adiamento_sessao')$$, 'P0001',
	'Durante a votação de um projeto, só estão em ordem a divisão da questão e a votação nominal.',
	'sala fechada: outras moções não estão em ordem');
select lives_ok($$select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'votacao_nominal')$$,
	'a votação nominal está em ordem');
select pg_temp.entrar(1);
select throws_ok(
	$$select public.abrir_votacao_parte('00000000-0000-0000-0000-000000000d01',
		array(select id from public.clausula where texto = 'Recordando'))$$,
	'22023', null, 'a divisão da questão só separa operativas');
insert into ids values ('vp', public.abrir_votacao_parte('00000000-0000-0000-0000-000000000d01',
	array(select id from public.clausula where documento_id = '00000000-0000-0000-0000-000000000d01' and tipo = 'operativa')));
select pg_temp.votos(pg_temp.id('vp'), array['D06', 'D07', 'D08'], 'a_favor');
select public.encerrar_votacao(pg_temp.id('vp'));
select results_eq($$select status from public.documento where id = '00000000-0000-0000-0000-000000000d01'$$,
	array['rejeitado'], 'sem nenhuma operativa, o projeto é rejeitado');

-- Sessão encerrada no meio do procedimento: o projeto volta à mesa.
reset role;
insert into public.documento (id, comite_id, bloco_id, tipo, titulo, topico, status) values
	('00000000-0000-0000-0000-000000000d04', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'projeto', 'P4', null, 'aprovado_mesa');
select pg_temp.entrar(1);
select public.iniciar_votacao_projeto('00000000-0000-0000-0000-000000000d04');
select public.encerrar_sessao('00000000-0000-0000-0000-0000000000c1');
select results_eq($$select status from public.documento where id = '00000000-0000-0000-0000-000000000d04'$$,
	array['aprovado_mesa'], 'sessão encerrada no meio da votação: o projeto volta à mesa');
select pg_temp.sessao('00000000-0000-0000-0000-0000000000c1', 1, array['D06', 'D07', 'D08']);

reset role;
insert into public.documento (id, comite_id, bloco_id, tipo, titulo, topico, status) values
	('00000000-0000-0000-0000-000000000d02', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'projeto', 'P2', 2, 'aprovado'),
	('00000000-0000-0000-0000-000000000d03', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'projeto', 'P3', 2, 'aprovado_mesa');
select pg_temp.entrar(1);
select throws_ok($$select public.aprovar_por_consenso('00000000-0000-0000-0000-000000000d03')$$, 'P0001',
	'Este tópico já tem uma resolução aprovada.', 'uma resolução aprovada por tópico');

-- Não-confiança: só com as assinaturas de 1/5 das previstas (3 de 15)
reset role;
update public.estado_sessao set fase = 'debate', mesa_assumiu = true where comite_id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.entrar(2);
select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'voto_desconfianca');
insert into ids values ('pm', (select id from public.ponto_mocao where tipo = 'voto_desconfianca'));
select public.assinar_mocao(pg_temp.id('pm'));
select pg_temp.entrar(1);
select throws_ok($$select public.abrir_votacao(pg_temp.id('pm'))$$, 'P0001', null,
	'a não-confiança não vai a voto sem as assinaturas');
reset role;
insert into public.assinatura_mocao (ponto_mocao_id, comite_id, delegacao_id) values
	(pg_temp.id('pm'), '00000000-0000-0000-0000-0000000000c1', pg_temp.d('D07')),
	(pg_temp.id('pm'), '00000000-0000-0000-0000-0000000000c1', pg_temp.d('D08'));
select pg_temp.entrar(1);
select lives_ok($$select public.abrir_votacao(pg_temp.id('pm'))$$, 'com 3 assinaturas, vai a voto');
reset role;

select * from finish();
rollback;
