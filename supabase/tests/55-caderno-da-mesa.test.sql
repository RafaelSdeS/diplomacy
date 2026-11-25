-- Passo 55 (parte B): a mesa tem o seu caderno; a delegação não o lê; a mesa continua sem
-- ler o caderno das delegações.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- Cenário: C1 com d1 (a1) e d2; a2 e a3 são a mesa de C1; a4 é a mesa de C2.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1'),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'C2', 'O Comitê 2');
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'Delegação 1'),
	('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'D2', 'Delegação 2');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'pessoa' || n || '@exemplo.test', '{"nome": "Pessoa"}'
from generate_series(1, 4) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c2', null);

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.vistas(p_id uuid) returns int language sql as $$
	select count(*)::int from public.anotacao where id = p_id
$$;

select pg_temp.entrar(2);
select lives_ok($$select public.salvar_anotacao('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1',
	'sobre', 'Discurso firme e bem preparado', null, '00000000-0000-0000-0000-0000000000d2')$$, 'a mesa anota sobre uma delegação');

select pg_temp.entrar(3);
select is(pg_temp.vistas('00000000-0000-0000-0000-0000000000f1'), 1, 'a outra pessoa da mesa lê');
select lives_ok($$select public.salvar_anotacao('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1',
	'sobre', 'Discurso firme; melhor do tópico 1', null, '00000000-0000-0000-0000-0000000000d2')$$, 'e edita');
select throws_ok($$select public.compartilhar_anotacao('00000000-0000-0000-0000-0000000000f1', array['00000000-0000-0000-0000-0000000000d1']::uuid[])$$,
	'22023', null, 'as notas da mesa não se compartilham');

select pg_temp.entrar(1);
select is(pg_temp.vistas('00000000-0000-0000-0000-0000000000f1'), 0, 'a delegação não lê o caderno da mesa');
select throws_ok($$select public.apagar_anotacao('00000000-0000-0000-0000-0000000000f1')$$, '42501', null, 'nem apaga');

select pg_temp.entrar(4);
select is(pg_temp.vistas('00000000-0000-0000-0000-0000000000f1'), 0, 'a mesa de outro comitê não lê');

-- A delegação anota; a mesa continua sem ler.
select pg_temp.entrar(1);
select public.salvar_anotacao('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', 'sobre', 'Aliado', null,
	'00000000-0000-0000-0000-0000000000d2');
select pg_temp.entrar(2);
select is(pg_temp.vistas('00000000-0000-0000-0000-0000000000f2'), 0, 'a mesa não lê o caderno da delegação');

select * from finish();
rollback;
