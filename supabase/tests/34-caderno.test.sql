-- Passo 34: o caderno é da delegação; compartilhar dá leitura a quem recebe; a mesa nunca lê.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Cenário: C1 com d1 (a1 e a2), d2 (a3) e d3 (a4); a5 é a mesa de C1; C2 com d9 (a6).
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1'),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'C2', 'O Comitê 2');
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'Delegação 1'),
	('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'D2', 'Delegação 2'),
	('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'D3', 'Delegação 3'),
	('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000c2', 'D9', 'Delegação 9');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'pessoa' || n || '@exemplo.test', '{"nome": "Pessoa"}'
from generate_series(1, 6) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2'),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d3'),
	('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d9');

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.vistas() returns int language sql as $$
	select count(*)::int from public.anotacao where id = '00000000-0000-0000-0000-0000000000f1'
$$;

select pg_temp.entrar(1);
select lives_ok($$select public.salvar_anotacao('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1',
	'sobre', 'Aliado provável no tópico 1', null, '00000000-0000-0000-0000-0000000000d2')$$, 'a delegação anota sobre outra');

select pg_temp.entrar(2);
select is(pg_temp.vistas(), 1, 'o outro delegado da mesma delegação lê');
select lives_ok($$select public.salvar_anotacao('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1',
	'sobre', 'Aliado certo no tópico 1', null, '00000000-0000-0000-0000-0000000000d2')$$, 'e edita');

select pg_temp.entrar(3);
select is(pg_temp.vistas(), 0, 'outra delegação não lê');
select pg_temp.entrar(5);
select is(pg_temp.vistas(), 0, 'a mesa não lê');

-- Compartilhar com D2: só leitura

select pg_temp.entrar(1);
select public.compartilhar_anotacao('00000000-0000-0000-0000-0000000000f1', array['00000000-0000-0000-0000-0000000000d2']::uuid[]);
select pg_temp.entrar(3);
select is(pg_temp.vistas(), 1, 'D2 lê o que foi compartilhado com ela');
select throws_ok($$select public.salvar_anotacao('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'sobre', 'Mudei')$$,
	'42501', null, 'mas não edita');
select pg_temp.entrar(4);
select is(pg_temp.vistas(), 0, 'D3, que não recebeu, não lê');
select pg_temp.entrar(5);
select is(pg_temp.vistas(), 0, 'a mesa continua sem ler');

select pg_temp.entrar(1);
select throws_ok($$select public.compartilhar_anotacao('00000000-0000-0000-0000-0000000000f1', array['00000000-0000-0000-0000-0000000000d9']::uuid[])$$,
	'22023', null, 'não compartilha com delegação de outro comitê');
select public.compartilhar_anotacao('00000000-0000-0000-0000-0000000000f1', '{}');
select pg_temp.entrar(3);
select is(pg_temp.vistas(), 0, 'desfeito o compartilhamento, D2 deixa de ler');

-- Regras do tipo, LGPD e apagar

select pg_temp.entrar(1);
select throws_ok($$select public.salvar_anotacao(gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', 'sobre', 'Sem a delegação')$$,
	'23514', null, 'anotação "sobre" precisa dizer sobre quem');
select ok(jsonb_array_length(public.meus_dados() -> 'anotacoes') = 1, '"meus dados" traz as anotações da pessoa');
select public.apagar_anotacao('00000000-0000-0000-0000-0000000000f1');
select is(pg_temp.vistas(), 0, 'a dona apaga');

select * from finish();
rollback;
