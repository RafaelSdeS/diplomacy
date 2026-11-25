-- Passo 58: a mesa escreve e publica; o comitê lê só o publicado (e não o rascunho); outro
-- comitê não lê; salvar com a versão antiga é recusado; publicar guarda a versão e avisa.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1'),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'C2', 'O Comitê 2');
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'Delegação 1'),
	('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000c2', 'D9', 'Delegação 9');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'pessoa' || n || '@exemplo.test', '{"nome": "Pessoa"}'
from generate_series(1, 4) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d9');

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text, true);
end $$;
create temp table doc (id uuid);
grant all on doc to authenticated;

select pg_temp.entrar(1);
select throws_ok($$ select public.criar_documento_mesa('00000000-0000-0000-0000-0000000000c1', 'Roteiro') $$, '42501', null, 'a delegação não cria documento da mesa');

select pg_temp.entrar(2);
insert into doc select public.criar_documento_mesa('00000000-0000-0000-0000-0000000000c1', 'Roteiro do dia');
select is(public.salvar_documento_mesa((select id from doc), 'Roteiro do dia', 'Manhã: tópico 1', 1), 2, 'a mesa salva o rascunho');

select pg_temp.entrar(1);
select is((select count(*)::int from public.documento_mesa), 0, 'antes de publicado, a delegação não vê o documento');

select pg_temp.entrar(2);
select public.publicar_documento_mesa((select id from doc));
select public.salvar_documento_mesa((select id from doc), 'Roteiro do dia', 'Manhã: tópico 2', 2);

select pg_temp.entrar(1);
select is((select corpo from public.documento_mesa), 'Manhã: tópico 1', 'publicado, a delegação lê a publicação, não o rascunho novo');
select is((select count(*)::int from public.documento_mesa_rascunho), 0, 'a delegação não lê o rascunho');
select is((select texto from public.aviso where comite_id = '00000000-0000-0000-0000-0000000000c1'), 'A mesa publicou: Roteiro do dia', 'publicar avisa o comitê');

select pg_temp.entrar(4);
select is((select count(*)::int from public.documento_mesa) + (select count(*)::int from public.documento_mesa_versao), 0, 'outro comitê não lê');

-- Duas pessoas da mesa: a segunda salva com a versão que tinha (2), mas a primeira já salvou (3).
select pg_temp.entrar(3);
select throws_ok(format($$ select public.salvar_documento_mesa(%L, 'Roteiro', 'Outro texto', 2) $$, (select id from doc)), 'DM409', null, 'salvar com a versão antiga é recusado');

select pg_temp.entrar(2);
select public.publicar_documento_mesa((select id from doc), false);
select pg_temp.entrar(1);
select results_eq('select numero, corpo from public.documento_mesa_versao order by numero',
	$$ values (1, 'Manhã: tópico 1'), (2, 'Manhã: tópico 2') $$, 'cada publicação fica guardada, para ver as alterações');

select * from finish();
rollback;
