-- Passo 24: uma delegação bloqueia os bilhetes de outra, e a bloqueada fica sabendo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- Cenário: C1 com d1 (a1), d2 (a2) e d3 (a3); a4 é a mesa de C1.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1');
insert into public.delegacao (id, comite_id, nome, nome_oficial)
select ('00000000-0000-0000-0000-0000000000d' || n)::uuid, '00000000-0000-0000-0000-0000000000c1', 'D' || n, 'Delegação ' || n
from generate_series(1, 3) as n;
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'pessoa' || n || '@exemplo.test', '{"nome": "Pessoa"}'
from generate_series(1, 4) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, '00000000-0000-0000-0000-0000000000e1', 'delegado',
	'00000000-0000-0000-0000-0000000000c1', ('00000000-0000-0000-0000-0000000000d' || n)::uuid
from generate_series(1, 3) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id) values
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1');

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.bilhete(p_para int) returns void language sql as $$
	select public.enviar_mensagem(gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', 'bilhete', 'Olá',
		('00000000-0000-0000-0000-0000000000d' || p_para)::uuid)
$$;

select pg_temp.entrar(1);
select lives_ok($$select public.bloquear_bilhetes('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2', true)$$,
	'D1 bloqueia os bilhetes de D2');
select throws_ok($$select public.bloquear_bilhetes('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', true)$$,
	'22023', null, 'ninguém bloqueia a si mesmo');
select lives_ok($$select pg_temp.bilhete(2)$$, 'quem bloqueia continua escrevendo para a bloqueada');

select pg_temp.entrar(2);
select throws_ok($$select pg_temp.bilhete(1)$$,
	'P0001', 'A delegação de D1 não aceita bilhetes da sua delegação.', 'o bilhete da bloqueada é recusado, e ela fica sabendo');
select results_eq($$select count(*)::int from public.bloqueio_bilhete$$, array[1], 'a bloqueada vê o bloqueio');
select public.bloquear_bilhetes('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', false);

select pg_temp.entrar(3);
select lives_ok($$select pg_temp.bilhete(1)$$, 'outra delegação continua escrevendo para D1');
select results_eq($$select count(*)::int from public.bloqueio_bilhete$$, array[0], 'uma terceira delegação não vê o bloqueio');

select pg_temp.entrar(4);
select results_eq($$select count(*)::int from public.bloqueio_bilhete$$, array[1],
	'a mesa vê o bloqueio, que a bloqueada não consegue desfazer');
select throws_ok($$select public.bloquear_bilhetes('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2', true)$$,
	'42501', null, 'a mesa não bloqueia em nome de delegação');

select pg_temp.entrar(1);
select public.bloquear_bilhetes('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2', false);
select results_eq($$select count(*)::int from public.bloqueio_bilhete$$, array[0], 'D1 desbloqueia');
select pg_temp.entrar(2);
select lives_ok($$select pg_temp.bilhete(1)$$, 'desbloqueada, D2 volta a escrever para D1');

select * from finish();
rollback;
