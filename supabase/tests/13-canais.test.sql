-- Passo 13: canais privados do Broadcast.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Cenário: C1 (d1, d2) e C2 (d3) no evento E1. a1 e a2 delegados de d1 e d2, a3 de d3,
-- a4 da crise de C1, a5 secretaria. E2 é outro evento.
insert into public.evento (id, nome, ano) values
	('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027),
	('00000000-0000-0000-0000-0000000000e2', 'Evento 2', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1'),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'C2', 'O Comitê 2');
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'Delegação 1'),
	('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'D2', 'Delegação 2'),
	('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c2', 'D3', 'Delegação 3');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'a' || n || '@exemplo.test', json_build_object('nome', 'A' || n)
from generate_series(1, 5) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d3'),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'crise', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000e1', 'secretaria', null, null);

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text,
		true
	);
end $$;

-- Quem entra em cada canal

select pg_temp.entrar(1);
select ok(public.pode_ouvir('comite:00000000-0000-0000-0000-0000000000c1'), 'o delegado ouve o canal do próprio comitê');
select ok(not public.pode_ouvir('comite:00000000-0000-0000-0000-0000000000c2'), 'mas não o de outro comitê');
select ok(public.pode_ouvir('delegacao:00000000-0000-0000-0000-0000000000d1'), 'ouve o canal da própria delegação');
select ok(not public.pode_ouvir('delegacao:00000000-0000-0000-0000-0000000000d2'), 'mas não o de outra delegação do comitê');
select ok(not public.pode_ouvir('crise:00000000-0000-0000-0000-0000000000c1'), 'delegados não ouvem o canal da crise');
select ok(public.pode_ouvir('evento:00000000-0000-0000-0000-0000000000e1'), 'ouve o canal do próprio evento');
select ok(not public.pode_ouvir('evento:00000000-0000-0000-0000-0000000000e2'), 'mas não o de outro evento');
select ok(
	not public.pode_ouvir('comite:nao-e-uuid') and not public.pode_ouvir('comite:00000000-0000-0000-0000-0000000000c1:x')
		and not public.pode_ouvir('outro:00000000-0000-0000-0000-0000000000c1'),
	'tópicos malformados ou desconhecidos ficam fechados');
select pg_temp.entrar(4);
select ok(public.pode_ouvir('crise:00000000-0000-0000-0000-0000000000c1'), 'a crise do comitê ouve o canal da crise');
select ok(not public.pode_ouvir('crise:00000000-0000-0000-0000-0000000000c2'), 'mas não o da crise de outro comitê');

-- A política de realtime.messages usa o tópico da conexão.
select pg_temp.entrar(3);
select set_config('realtime.topic', 'comite:00000000-0000-0000-0000-0000000000c1', true);
reset role;
select realtime.send('{"tabela": "teste"}', 'mudou', 'comite:00000000-0000-0000-0000-0000000000c1', true);
select pg_temp.entrar(3);
select set_config('realtime.topic', 'comite:00000000-0000-0000-0000-0000000000c1', true);
select is_empty($$select 1 from realtime.messages where topic = 'comite:00000000-0000-0000-0000-0000000000c1'$$,
	'a política barra o delegado de outro comitê no canal');
select pg_temp.entrar(2);
select set_config('realtime.topic', 'comite:00000000-0000-0000-0000-0000000000c1', true);
select isnt_empty($$select 1 from realtime.messages where topic = 'comite:00000000-0000-0000-0000-0000000000c1'$$,
	'e deixa entrar quem é do comitê');

-- O que os gatilhos mandam

reset role;
delete from realtime.messages where topic like '%00000000-0000-0000-0000-0000000000%';
insert into public.nota_crise (id, comite_id, delegacao_id, tipo, titulo, texto) values
	(gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', 'nota', 'T', 'X');
select set_eq(
	$$select topic from realtime.messages where payload ->> 'tabela' = 'nota_crise' and topic like '%-0000000000%'$$,
	array['crise:00000000-0000-0000-0000-0000000000c1', 'delegacao:00000000-0000-0000-0000-0000000000d1'],
	'a nota de crise avisa a crise e a própria delegação, não o comitê inteiro');
select is(
	(select payload - 'id' from realtime.messages where payload ->> 'tabela' = 'nota_crise' and topic like '%-0000000000%' limit 1),
	'{"tabela": "nota_crise"}'::jsonb,
	'o aviso não leva os dados da linha');

insert into public.sessao (id, comite_id, numero) values
	('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 1);
insert into public.presenca (sessao_id, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2');
select results_eq(
	$$select count(*)::int from realtime.messages where payload ->> 'tabela' = 'presenca' and topic like '%-0000000000%'$$,
	array[1],
	'várias linhas na mesma transação: um aviso só por canal e tabela');

select is_empty($$select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'$$,
	'Postgres Changes não publica mais as tabelas do app');

select * from finish();
rollback;
