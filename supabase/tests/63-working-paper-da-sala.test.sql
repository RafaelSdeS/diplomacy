-- Passo 63 (lote 1): o working paper de cada item da agenda, de toda a sala, e o projeto do tópico.
-- Os redatores (ou a delegação sem bloco) propõem, todas marcam posição, quem preside decide; a
-- mesa transforma em projeto (preâmbulos primeiro, assinaturas sem as das observadoras).
begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

-- Cenário: d1 a d6 são membros e d7 é observadora; a8 é a mesa. Sem sessão aberta, quem preside é a mesa.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial, topicos) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1', array['Sahel', 'Ciber']);
insert into public.delegacao (id, comite_id, nome, nome_oficial, situacao)
select ('00000000-0000-0000-0000-0000000000d' || n)::uuid, '00000000-0000-0000-0000-0000000000c1', 'D' || n, 'Delegação ' || n,
	(case when n = 7 then 'observadora' else 'membro' end)::public.situacao_delegacao
from generate_series(1, 7) as n;
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'a' || n || '@exemplo.test', json_build_object('nome', 'A' || n)
from generate_series(1, 8) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, '00000000-0000-0000-0000-0000000000e1', 'delegado',
	'00000000-0000-0000-0000-0000000000c1', ('00000000-0000-0000-0000-0000000000d' || n)::uuid
from generate_series(1, 7) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id) values
	('00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1');

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
create function pg_temp.id(p_nome text) returns uuid language sql as $$ select id from ids where nome = p_nome $$;
create function pg_temp.wp(p_titulo text) returns uuid language sql as $$
	select id from public.documento where titulo = p_titulo and tipo = 'working_paper' and bloco_id is null and comite_id = '00000000-0000-0000-0000-0000000000c1'
$$;
create function pg_temp.clausula(p_texto text) returns uuid language sql as $$
	select id from public.clausula where texto = p_texto order by atualizado_em desc limit 1
$$;
create function pg_temp.textos(p_documento uuid) returns setof text language sql as $$
	select texto from public.clausula where documento_id = p_documento and pai_id is null order by ordem
$$;

-- A agenda do tópico 1: dois itens grandes, o primeiro com um subitem.
insert into public.proposta_agenda (id, comite_id, topico) values
	('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 1);
insert into public.ponto_pauta (id, proposta_id, comite_id, pai_id, texto, ordem) values
	('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', null, 'Segurança regional', 1),
	('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', null, 'Causas da radicalização', 2),
	('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'Fronteiras', 1);

-- Os working papers nascem com a agenda
select is_empty($$select 1 from public.documento where bloco_id is null and comite_id = '00000000-0000-0000-0000-0000000000c1'$$, 'sem agenda adotada, não há working paper da sala');
select pg_temp.entrar(8);
select public.adotar_proposta('00000000-0000-0000-0000-0000000000b1');
select results_eq(
	$$select titulo from public.documento where tipo = 'working_paper' and bloco_id is null and comite_id = '00000000-0000-0000-0000-0000000000c1' order by titulo$$,
	$$values ('Causas da radicalização'::text), ('Segurança regional')$$,
	'adotada a agenda, cada item grande ganha o seu working paper (o subitem não)');
select public.adotar_proposta('00000000-0000-0000-0000-0000000000b1');
select results_eq($$select count(*)::int from public.documento where bloco_id is null and comite_id = '00000000-0000-0000-0000-0000000000c1'$$, array[2], 'adotar de novo não duplica');
select pg_temp.entrar(6);
select isnt_empty($$select 1 from public.documento where id = pg_temp.wp('Segurança regional')$$, 'toda a sala vê o working paper');

-- Quem propõe: d1 é redatora do bloco, d2 é membro; d3, d4 e a observadora d7 não têm bloco.
select pg_temp.entrar(1);
insert into ids values ('bloco', public.criar_bloco('00000000-0000-0000-0000-0000000000c1', 'Bloco'));
select pg_temp.entrar(2); select public.entrar_bloco(pg_temp.id('bloco'));
select throws_ok($$select public.propor_no_documento(pg_temp.wp('Segurança regional'), 'incluir', null, 'Decide B', 'operativa')$$,
	'42501', null, 'o membro do bloco não propõe (quem propõe é o redator)');
select pg_temp.entrar(1);
insert into ids values ('p1', public.propor_no_documento(pg_temp.wp('Segurança regional'), 'incluir', null, 'Decide A', 'operativa', null, 'O centro do texto'));
select results_eq($$select bloco_id, delegacao_id from public.proposta_alteracao where id = pg_temp.id('p1')$$,
	$$values (pg_temp.id('bloco'), '00000000-0000-0000-0000-0000000000d1'::uuid)$$, 'a redatora propõe em nome do bloco');
select pg_temp.entrar(3);
insert into ids values ('p2', public.propor_no_documento(pg_temp.wp('Segurança regional'), 'incluir', null, 'Recordando X', 'preambular'));
select results_eq($$select bloco_id from public.proposta_alteracao where id = pg_temp.id('p2')$$, array[null::uuid],
	'a delegação sem bloco é a própria redatora');
select pg_temp.entrar(7);
insert into ids values ('p3', public.propor_no_documento(pg_temp.wp('Causas da radicalização'), 'incluir', null, 'Sugere B', 'operativa'));
select isnt_empty($$select 1 from public.proposta_alteracao where id = pg_temp.id('p3')$$, 'a observadora também propõe');
select pg_temp.entrar(8);
select throws_ok($$select public.propor_no_documento(pg_temp.wp('Segurança regional'), 'incluir', null, 'Da mesa', 'operativa')$$,
	'42501', 'Só as delegações do comitê propõem.', 'a mesa não propõe');
select pg_temp.entrar(1);
select lives_ok($$select public.propor_no_documento(pg_temp.wp('Segurança regional'), 'incluir', null, 'Decide A', 'operativa', null, null, pg_temp.id('p1'))$$,
	'a caixa de saída reenvia sem duplicar');
select results_eq($$select count(*)::int from public.proposta_alteracao where texto_novo = 'Decide A'$$, array[1], 'e não duplica');

-- Posições: toda delegação marca; a mesa não.
select pg_temp.entrar(4);
select lives_ok($$select public.marcar_posicao_proposta(pg_temp.id('p1'), 'apoio')$$, 'uma delegação sem bloco marca apoio');
select pg_temp.entrar(7);
select lives_ok($$select public.marcar_posicao_proposta(pg_temp.id('p1'), 'contra')$$, 'a observadora marca contra');
select lives_ok($$select public.marcar_posicao_proposta(pg_temp.id('p1'), 'ressalva')$$, 'e muda de ideia');
select results_eq($$select posicao from public.posicao_proposta where proposta_id = pg_temp.id('p1') order by posicao$$,
	$$values ('apoio'::text), ('ressalva')$$, 'uma posição por delegação');
select pg_temp.entrar(8);
select throws_ok($$select public.marcar_posicao_proposta(pg_temp.id('p1'), 'apoio')$$, '42501', null, 'a mesa não marca posição');

-- Quem decide é quem preside (sem sessão, a mesa).
select pg_temp.entrar(4);
select throws_ok($$select public.decidir_proposta(pg_temp.id('p1'), true)$$, '42501', null, 'quem não preside não decide');
select pg_temp.entrar(8);
select lives_ok($$select public.decidir_proposta(pg_temp.id('p1'), true)$$, 'quem preside aceita');
select public.decidir_proposta(pg_temp.id('p2'), true);
select public.decidir_proposta(pg_temp.id('p3'), true);
select results_eq($$select pg_temp.textos(pg_temp.wp('Segurança regional'))$$, $$values ('Recordando X'::text), ('Decide A')$$,
	'incluída, a preambular nova vem antes das operativas');
select throws_ok($$select public.decidir_proposta(pg_temp.id('p1'), false)$$, '22023', 'Esta proposta já foi decidida.', 'decidida, não muda');
select pg_temp.entrar(4);
select throws_ok($$select public.marcar_posicao_proposta(pg_temp.id('p1'), 'contra')$$, '22023', null, 'nem recebe posição');

-- Alterar, mover e retirar.
select pg_temp.entrar(1);
insert into ids values ('alterar', public.propor_no_documento(pg_temp.wp('Segurança regional'), 'alterar', pg_temp.clausula('Decide A'), 'Decide A e B'));
insert into ids values ('incluir', public.propor_no_documento(pg_temp.wp('Segurança regional'), 'incluir', null, 'Decide C', 'operativa'));
insert into ids values ('sem objeto', public.propor_no_documento(pg_temp.wp('Segurança regional'), 'alterar', pg_temp.clausula('Recordando X'), 'Recordando Y'));
select pg_temp.entrar(3);
insert into ids values ('retirar', public.propor_no_documento(pg_temp.wp('Segurança regional'), 'retirar', pg_temp.clausula('Recordando X')));
select pg_temp.entrar(8);
select public.decidir_proposta(pg_temp.id('alterar'), true);
select public.decidir_proposta(pg_temp.id('incluir'), true);
select pg_temp.entrar(1);
insert into ids values ('mover', public.propor_no_documento(pg_temp.wp('Segurança regional'), 'mover', pg_temp.clausula('Decide C')));
select pg_temp.entrar(8);
select public.decidir_proposta(pg_temp.id('mover'), true);
select lives_ok($$select public.decidir_proposta(pg_temp.id('retirar'), true)$$, 'aceita a retirada');
select results_eq($$select pg_temp.textos(pg_temp.wp('Segurança regional'))$$, $$values ('Decide C'::text), ('Decide A e B')$$,
	'alterada, movida para o começo das operativas e retirada');
select results_eq($$select status from public.proposta_alteracao where id = pg_temp.id('sem objeto')$$, array['recusada'::text],
	'a proposta sobre a cláusula retirada perde o objeto');
select results_eq($$select count(*)::int from public.proposta_alteracao where documento_id = pg_temp.wp('Segurança regional') and status = 'aceita'$$,
	array[6], 'as decididas ficam no histórico');

-- Assinaturas no working paper: qualquer delegação, até a observadora.
select pg_temp.entrar(7);
insert into ids values ('p4', public.propor_no_documento(pg_temp.wp('Causas da radicalização'), 'incluir', null, 'Lembrando Z', 'preambular'));
select lives_ok($$select public.assinar(pg_temp.wp('Causas da radicalização'), true)$$, 'a observadora assina o working paper');
select pg_temp.entrar(1); select public.assinar(pg_temp.wp('Segurança regional'), true);
select pg_temp.entrar(4); select public.assinar(pg_temp.wp('Segurança regional'), true);
select pg_temp.entrar(8);
select public.decidir_proposta(pg_temp.id('p4'), true);

-- Do working paper ao projeto.
select pg_temp.entrar(1);
select throws_ok($$select public.transformar_em_projeto('00000000-0000-0000-0000-0000000000c1', 1)$$, '42501', null, 'só a mesa transforma em projeto');
select pg_temp.entrar(8);
insert into ids values ('projeto', public.transformar_em_projeto('00000000-0000-0000-0000-0000000000c1', 1));
select results_eq($$select titulo, status from public.documento where id = pg_temp.id('projeto')$$, $$values ('Sahel'::text, 'enviado'::text)$$,
	'o projeto leva o nome do tópico e nasce fechado');
select results_eq($$select pg_temp.textos(pg_temp.id('projeto'))$$,
	$$values ('Lembrando Z'::text), ('Decide C'), ('Decide A e B'), ('Sugere B')$$,
	'preâmbulos primeiro, depois as operativas, na ordem dos itens');
select results_eq($$select delegacao_id from public.assinatura where documento_id = pg_temp.id('projeto') order by delegacao_id$$,
	$$values ('00000000-0000-0000-0000-0000000000d1'::uuid), ('00000000-0000-0000-0000-0000000000d4'::uuid)$$,
	'as assinaturas passam, menos as das observadoras');
select throws_ok($$select public.transformar_em_projeto('00000000-0000-0000-0000-0000000000c1', 1)$$, '23505', null, 'um projeto por tópico');
select pg_temp.entrar(1);
select throws_ok($$select public.propor_no_documento(pg_temp.wp('Segurança regional'), 'incluir', null, 'Tarde', 'operativa')$$,
	'22023', null, 'os working papers ficam só para leitura');

-- O projeto: assinaturas até a fase de ação; correções de forma pela mesa.
select pg_temp.entrar(7);
select throws_ok($$select public.assinar(pg_temp.id('projeto'), true)$$, 'P0001', 'Delegação observadora não assina o projeto.',
	'a observadora não assina o projeto');
select pg_temp.entrar(5);
select lives_ok($$select public.assinar(pg_temp.id('projeto'), true)$$, 'quem não assinou assina o projeto');
select pg_temp.entrar(8);
select throws_ok($$select public.aprovar_documento(pg_temp.id('projeto'), true)$$, 'P0001', 'O projeto precisa de pelo menos 5 signatários.',
	'sem o mínimo, não vai à fase de ação');
select throws_ok($$select public.aprovar_documento(pg_temp.id('projeto'), false)$$, '22023', null, 'o projeto do tópico não volta a rascunho');
select lives_ok($$select public.corrigir_clausula((select id from public.clausula where documento_id = pg_temp.id('projeto') and texto = 'Sugere B'), 'Sugere B.', 1)$$,
	'a mesa faz a correção de forma');
select pg_temp.entrar(1);
select throws_ok($$select public.corrigir_clausula(pg_temp.clausula('Sugere B.'), 'Sugere C', 2)$$, '42501', null, 'a delegação não corrige');
reset role;
update public.comite set regras = '{"assinaturas_projeto_min": 3}' where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.entrar(8);
select lives_ok($$select public.aprovar_documento(pg_temp.id('projeto'), true)$$, 'com o mínimo, vai à fase de ação');
select pg_temp.entrar(6);
select throws_ok($$select public.assinar(pg_temp.id('projeto'), true)$$, 'P0001', null, 'na fase de ação, as assinaturas não mudam');

-- Rejeitado, os working papers reabrem, e cabe um projeto novo.
reset role;
update public.documento set status = 'rejeitado' where id = pg_temp.id('projeto');
select results_eq($$select distinct status from public.documento where tipo = 'working_paper' and bloco_id is null and comite_id = '00000000-0000-0000-0000-0000000000c1'$$, array['rascunho'::text],
	'rejeitado o projeto, os working papers reabrem');
select pg_temp.entrar(8);
select lives_ok($$select public.transformar_em_projeto('00000000-0000-0000-0000-0000000000c1', 1)$$, 'e a mesa pode transformar de novo');

select * from finish();
rollback;
