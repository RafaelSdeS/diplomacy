-- Passo 29: pontos e moções passam pelo bureau antes da presidência.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- Cenário: C1 em debate, presidido pela delegação d2 (a2); a1 é delegado de d1; a3 é a mesa.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1');
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'Delegação 1'),
	('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'D2', 'Delegação 2');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'pessoa' || n || '@exemplo.test', '{"nome": "Pessoa"}'
from generate_series(1, 3) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1', null);

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text, true);
end $$;
-- Pelo tipo: dentro de uma transação, now() é o mesmo para todos os pedidos.
create function pg_temp.ponto(p_tipo text) returns uuid language sql as $$
	select id from public.ponto_mocao where comite_id = '00000000-0000-0000-0000-0000000000c1' and tipo = p_tipo
$$;

select pg_temp.entrar(3);
select public.abrir_sessao('00000000-0000-0000-0000-0000000000c1');
reset role;
update public.estado_sessao set fase = 'debate' where comite_id = '00000000-0000-0000-0000-0000000000c1';
update public.sessao set presidencia_delegacao_id = '00000000-0000-0000-0000-0000000000d2' where comite_id = '00000000-0000-0000-0000-0000000000c1';
insert into public.presenca (sessao_id, comite_id, delegacao_id)
select id, comite_id, d from public.sessao, unnest(array['00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2']::uuid[]) as d
where sessao.comite_id = '00000000-0000-0000-0000-0000000000c1';
select ok(not public.bureau_preside('00000000-0000-0000-0000-0000000000c1'), 'com uma delegação presidindo, o bureau não preside');

-- Sem o bureau, a presidência não concede nem recusa

select pg_temp.entrar(1);
select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'ponto_duvida', 'Qual é o tempo?');
select pg_temp.entrar(2);
select throws_ok($$select public.responder_ponto(pg_temp.ponto('ponto_duvida'), 'aceito')$$,
	'P0001', 'O bureau ainda não aprovou este pedido.', 'a presidência não concede antes do bureau');
select throws_ok($$select public.responder_ponto(pg_temp.ponto('ponto_duvida'), 'recusado')$$,
	'P0001', 'O bureau ainda não aprovou este pedido.', 'nem recusa no lugar do bureau');
select pg_temp.entrar(1);
select throws_ok($$select public.julgar_ponto(pg_temp.ponto('ponto_duvida'), true)$$, '42501', null, 'delegado não julga');

-- O bureau aprova, a presidência concede

select pg_temp.entrar(3);
select public.julgar_ponto(pg_temp.ponto('ponto_duvida'), true);
select results_eq($$select status, aprovado_bureau from public.ponto_mocao where id = pg_temp.ponto('ponto_duvida')$$,
	$$values ('aberto', true)$$, 'em ordem, o pedido espera a presidência');
select throws_ok($$select public.julgar_ponto(pg_temp.ponto('ponto_duvida'), false)$$,
	'P0001', 'Este pedido já foi julgado.', 'o julgamento não se repete');
select pg_temp.entrar(2);
select lives_ok($$select public.responder_ponto(pg_temp.ponto('ponto_duvida'), 'aceito')$$, 'aprovado, a presidência concede');

-- Fora de ordem, com motivo que o autor lê

select pg_temp.entrar(1);
select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'informal_informal', null, null, 10);
select pg_temp.entrar(3);
select public.julgar_ponto(pg_temp.ponto('informal_informal'), false, 'Fora de hora');
select pg_temp.entrar(1);
select results_eq($$select status, motivo from public.ponto_mocao where id = pg_temp.ponto('informal_informal')$$,
	$$values ('recusado', 'Fora de hora')$$, 'fora de ordem, o autor vê o motivo');

-- A mesa concedendo direto, ou o bureau presidindo, é um toque só

select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'ponto_ordem');
-- Passo 59: com a delegação presidindo, a mesa só conduz se assumir (caso excepcional).
reset role;
update public.estado_sessao set mesa_assumiu = true where comite_id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.entrar(3);
select lives_ok($$select public.responder_ponto(pg_temp.ponto('ponto_ordem'), 'aceito')$$, 'a mesa que assumiu concede direto: o julgamento está implícito');

reset role;
update public.estado_sessao set mesa_assumiu = true where comite_id = '00000000-0000-0000-0000-0000000000c1';
select ok(public.bureau_preside('00000000-0000-0000-0000-0000000000c1'), 'com a mesa assumindo, o bureau preside');
update public.estado_sessao set mesa_assumiu = false, fase = 'plenaria' where comite_id = '00000000-0000-0000-0000-0000000000c1';
select ok(public.bureau_preside('00000000-0000-0000-0000-0000000000c1'), 'na plenária, o bureau preside');
update public.estado_sessao set fase = 'debate' where comite_id = '00000000-0000-0000-0000-0000000000c1';
update public.sessao set presidencia_delegacao_id = null where comite_id = '00000000-0000-0000-0000-0000000000c1';
select ok(public.bureau_preside('00000000-0000-0000-0000-0000000000c1'), 'sem delegação na presidência, o bureau preside');

select * from finish();
rollback;
