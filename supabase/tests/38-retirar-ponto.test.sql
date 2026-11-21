-- Passo 38: só a delegação autora retira o ponto, e só enquanto ele espera.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- Cenário: C1 em sessão, com d1 (a1) e d2 (a2); a4 é a mesa.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1');
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'Delegação 1'),
	('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'D2', 'Delegação 2');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'pessoa' || n || '@exemplo.test', '{"nome": "Pessoa"}'
from generate_series(1, 4) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2'),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1', null);

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.ponto(p_tipo text) returns uuid language sql as $$
	select id from public.ponto_mocao where comite_id = '00000000-0000-0000-0000-0000000000c1' and tipo = p_tipo
$$;

select pg_temp.entrar(4);
select public.abrir_sessao('00000000-0000-0000-0000-0000000000c1');
insert into public.presenca (sessao_id, comite_id, delegacao_id)
select public.sessao_atual('00000000-0000-0000-0000-0000000000c1'), '00000000-0000-0000-0000-0000000000c1', d
from unnest(array['00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2']::uuid[]) as d;

select pg_temp.entrar(1);
select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'ponto_duvida');
select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'ponto_ordem');

select pg_temp.entrar(2);
select throws_ok($$select public.retirar_ponto(pg_temp.ponto('ponto_duvida'))$$, '42501', null, 'outra delegação não retira');

select pg_temp.entrar(1);
select lives_ok($$select public.retirar_ponto(pg_temp.ponto('ponto_duvida'))$$, 'a autora retira o pedido que espera');
select is((select status from public.ponto_mocao where id = pg_temp.ponto('ponto_duvida')), 'retirado', 'e ele fica "retirado"');

select pg_temp.entrar(4);
select public.responder_ponto(pg_temp.ponto('ponto_ordem'), 'aceito');
select pg_temp.entrar(1);
select throws_ok($$select public.retirar_ponto(pg_temp.ponto('ponto_ordem'))$$, 'P0001',
	'O pedido já foi atendido e não pode mais ser retirado.', 'atendido, não se retira');
select throws_ok($$select public.retirar_ponto(pg_temp.ponto('ponto_duvida'))$$, 'P0001',
	'O pedido já foi atendido e não pode mais ser retirado.', 'nem duas vezes');

select * from finish();
rollback;
