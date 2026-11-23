-- Passo 45, parte A: a pauta da coletiva não tem o texto da pergunta; o texto fica numa
-- tabela que só a press do veículo e a Diretoria da Press leem.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Cenário: E1 com C1 (veículo V1, press a3; d1: a1) e C2 (veículo V2, press a4; d2: a2);
-- a5 é a Diretoria da Press; a9 é de outro evento (E2).
insert into public.evento (id, nome, ano) values
	('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027),
	('00000000-0000-0000-0000-0000000000e2', 'Evento 2', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1'),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'C2', 'O Comitê 2'),
	('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000e2', 'C9', 'C9', 'O Comitê 9');
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'Delegação 1'),
	('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', 'D2', 'Delegação 2'),
	('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000c9', 'D9', 'Delegação 9');
insert into public.veiculo (id, comite_id, nome) values
	('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'V1'),
	('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c2', 'V2');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'pessoa' || n || '@exemplo.test', '{"nome": "Pessoa"}'
from unnest(array[1, 2, 3, 4, 5, 9]) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d2'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'press', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'press', '00000000-0000-0000-0000-0000000000c2', null),
	('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000e1', 'diretoria_press', null, null),
	('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000e2', 'delegado', '00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000d9');

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.textos() returns int language sql as $$
	select count(*)::int from public.coletiva_pergunta_texto
$$;

select hasnt_column('public', 'coletiva_pergunta', 'pergunta', 'a pauta não tem o texto da pergunta');

select pg_temp.entrar(5);
select public.abrir_coletiva('00000000-0000-0000-0000-0000000000e1', 'Coletiva');
select pg_temp.entrar(3);
select public.perguntar_na_coletiva((select id from public.coletiva), '00000000-0000-0000-0000-0000000000d1', '  Qual o plano?  ');

select is(pg_temp.textos(), 1, 'a press do veículo lê a própria pergunta');
select is((select texto from public.coletiva_pergunta_texto), 'Qual o plano?', 'o texto é gravado sem espaços nas pontas');
select pg_temp.entrar(5);
select is(pg_temp.textos(), 1, 'a Diretoria da Press lê a pergunta');
select pg_temp.entrar(1);
select is((select count(*)::int from public.coletiva_pergunta), 1, 'a delegação chamada vê a pauta');
select is(pg_temp.textos(), 0, 'a delegação chamada não lê a pergunta antes de ouvi-la');
select pg_temp.entrar(4);
select is(pg_temp.textos(), 0, 'a press de outro veículo não lê a pergunta');
select pg_temp.entrar(9);
select is(pg_temp.textos(), 0, 'quem é de outro evento não lê a pergunta');
select pg_temp.entrar(3);
select throws_ok(
	$$ insert into public.coletiva_pergunta_texto (pergunta_id, texto) select id, 'Outra' from public.coletiva_pergunta $$,
	'42501', null, 'ninguém escreve o texto direto, só pela função');

select * from finish();
rollback;
