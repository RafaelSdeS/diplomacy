-- Passo 62 (lote 1, reduzido pelo passo 63): as regras do bloco. Um bloco por vez no comitê
-- (entrar em outro, ou criar um, tira do atual), e o bloco nunca fica sem redator.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Cenário: d1, d2 e d3 são delegações do comitê.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial, topicos) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1', array['T1', 'T2']);
insert into public.delegacao (id, comite_id, nome, nome_oficial, situacao)
select ('00000000-0000-0000-0000-0000000000d' || n)::uuid, '00000000-0000-0000-0000-0000000000c1', 'D' || n, 'Delegação ' || n, 'membro'
from generate_series(1, 3) as n;
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'a' || n || '@exemplo.test', json_build_object('nome', 'A' || n)
from generate_series(1, 3) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, '00000000-0000-0000-0000-0000000000e1', 'delegado',
	'00000000-0000-0000-0000-0000000000c1', ('00000000-0000-0000-0000-0000000000d' || n)::uuid
from generate_series(1, 3) as n;

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text,
		true
	);
end $$;
create temp table ids (nome text primary key, id uuid);
grant all on ids to authenticated;
create function pg_temp.id(p_nome text) returns uuid language sql as $$ select id from ids where nome = p_nome $$;
create function pg_temp.blocos_de(n int) returns setof uuid language sql as $$
	select bloco_id from public.bloco_membro where delegacao_id = ('00000000-0000-0000-0000-0000000000d' || n)::uuid
$$;

-- d1 cria o bloco A (redatora); d2 e d3 entram, nessa ordem.
select pg_temp.entrar(1);
insert into ids values ('a', public.criar_bloco('00000000-0000-0000-0000-0000000000c1', 'A'));
select pg_temp.entrar(2); select public.entrar_bloco(pg_temp.id('a'));
select pg_temp.entrar(3); select public.entrar_bloco(pg_temp.id('a'));

-- Um bloco por vez: criar outro tira do atual.
select pg_temp.entrar(3);
insert into ids values ('b', public.criar_bloco('00000000-0000-0000-0000-0000000000c1', 'B'));
select results_eq($$select pg_temp.blocos_de(3)$$, $$values (pg_temp.id('b'))$$, 'quem cria um bloco sai do atual');
select results_eq($$select public.meu_bloco('00000000-0000-0000-0000-0000000000c1')$$, $$values (pg_temp.id('b'))$$,
	'meu_bloco diz o bloco atual');

-- A única redatora muda de bloco: a redação passa a quem está no bloco há mais tempo (d2).
select pg_temp.entrar(1);
select lives_ok($$select public.entrar_bloco(pg_temp.id('b'))$$, 'a única redatora entra em outro bloco');
select results_eq($$select pg_temp.blocos_de(1)$$, $$values (pg_temp.id('b'))$$, 'entrar em outro bloco tira do atual');
select results_eq(
	$$select redator from public.bloco_membro where bloco_id = pg_temp.id('a') and delegacao_id = '00000000-0000-0000-0000-0000000000d2'$$,
	array[true], 'o bloco que ela deixou não fica sem redator');
select results_eq($$select count(*)::int from public.bloco_membro where bloco_id = pg_temp.id('b') and redator$$,
	array[1], 'no bloco novo, ela entra como membro');

-- Entrar de novo no próprio bloco não muda nada.
select lives_ok($$select public.entrar_bloco(pg_temp.id('b'))$$, 'entrar no próprio bloco não dá erro');
select results_eq($$select count(*)::int from public.bloco_membro where delegacao_id = '00000000-0000-0000-0000-0000000000d1'$$,
	array[1], 'e não duplica');

-- O banco recusa uma delegação em dois blocos.
reset role;
select throws_ok(
	$$insert into public.bloco_membro (bloco_id, comite_id, delegacao_id)
		values (pg_temp.id('a'), '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1')$$,
	'23505', null, 'uma delegação não fica em dois blocos do mesmo comitê');

select * from finish();
rollback;
