-- Passo 31: a mesa assume a delegação de quem faltou, e o que faz fica marcado.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Cenário: C1 com d1 (a1) e d2 (sem ninguém, faltou); a3 é a mesa.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1');
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'Delegação 1'),
	('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'D2', 'Delegação 2');
insert into auth.users (id, email, raw_user_meta_data) values
	('00000000-0000-0000-0000-0000000000a1', 'delegado1@exemplo.test', '{"nome": "Delegado 1"}'),
	('00000000-0000-0000-0000-0000000000a3', 'mesa@exemplo.test', '{"nome": "Mesa"}');
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1', null);

create function pg_temp.entrar(p_usuario uuid) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
end $$;

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.abrir_sessao('00000000-0000-0000-0000-0000000000c1');
select throws_ok($$select public.levantar_placa('00000000-0000-0000-0000-0000000000c1')$$,
	'42501', null, 'sem assumir, a mesa não levanta placa');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$select public.representar('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2')$$,
	'42501', null, 'delegado não assume outra delegação');

-- A mesa assume D2

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.representar('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2');
select public.levantar_placa('00000000-0000-0000-0000-0000000000c1');
select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'ponto_duvida', 'Qual é o tempo?');
select results_eq($$select delegacao_id, pela_mesa from public.pedido_fala where comite_id = '00000000-0000-0000-0000-0000000000c1'$$,
	$$values ('00000000-0000-0000-0000-0000000000d2'::uuid, true)$$, 'a placa é de D2, marcada "pela mesa"');
select results_eq($$select delegacao_id, pela_mesa from public.ponto_mocao where comite_id = '00000000-0000-0000-0000-0000000000c1'$$,
	$$values ('00000000-0000-0000-0000-0000000000d2'::uuid, true)$$, 'o ponto também');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select public.levantar_placa('00000000-0000-0000-0000-0000000000c1');
select results_eq($$select pela_mesa from public.pedido_fala where delegacao_id = '00000000-0000-0000-0000-0000000000d1'$$,
	array[false], 'a placa do próprio delegado não leva a marca');
select results_eq($$select count(*)::int from public.representacao$$, array[1], 'o comitê vê que a mesa assumiu D2');

-- Deixar a delegação

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.representar('00000000-0000-0000-0000-0000000000c1', null);
select results_eq($$select count(*)::int from public.representacao where comite_id = '00000000-0000-0000-0000-0000000000c1'$$,
	array[0], 'a mesa deixa a delegação');
select throws_ok($$select public.baixar_placa('00000000-0000-0000-0000-0000000000c1')$$,
	'42501', null, 'depois de deixar, volta a não agir pela delegação');
reset role;
select results_eq(
	$$select acao from public.registro where evento_id = '00000000-0000-0000-0000-0000000000e1' and acao like '%representar' order by id$$,
	array['representar', 'parar de representar'], 'o registro guarda o começo e o fim');

select * from finish();
rollback;
