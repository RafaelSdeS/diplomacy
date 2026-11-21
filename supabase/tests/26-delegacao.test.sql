-- Passo 26: a página da delegação mostra os delegados só para quem é do comitê.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

-- Cenário: C1 com d1 (a1 e a2, dois delegados) e d3 (a4); C2 com d2 (a3).
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1'),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'C2', 'O Comitê 2');
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'Delegação 1'),
	('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'D3', 'Delegação 3'),
	('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', 'D2', 'Delegação 2');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'pessoa' || n || '@exemplo.test', '{"nome": "Pessoa"}'
from generate_series(1, 4) as n;
update public.pessoa set bio = 'Estudante' where id = '00000000-0000-0000-0000-0000000000a1';
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d2'),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d3');

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text, true);
end $$;

select pg_temp.entrar(4);
select results_eq($$select count(*)::int from public.participacao where delegacao_id = '00000000-0000-0000-0000-0000000000d1'$$,
	array[2], 'quem é do comitê vê os dois delegados da delegação');
select results_eq($$select bio from public.pessoa where id = '00000000-0000-0000-0000-0000000000a1'$$,
	array['Estudante'], 'e a minibiografia deles');

select pg_temp.entrar(3);
select results_eq($$select count(*)::int from public.participacao where delegacao_id = '00000000-0000-0000-0000-0000000000d1'$$,
	array[0], 'quem é de outro comitê não vê os delegados');
select is_empty($$select 1 from public.pessoa where id = '00000000-0000-0000-0000-0000000000a1'$$,
	'nem a pessoa');

select * from finish();
rollback;
