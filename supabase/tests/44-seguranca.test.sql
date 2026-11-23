-- Passo 44: nenhuma conta enxerga dados de outra; revogar a participação tira o acesso na
-- hora, encerra as sessões e as notificações; o Storage recusa pasta errada; as respostas
-- sensíveis da API saem sem cache.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- Cenário: E1 com C1 (d1: a1; d2: a2) e C2 (d3: a3); E2 com C9 (d9: a9).
insert into public.evento (id, nome, ano) values
	('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027),
	('00000000-0000-0000-0000-0000000000e2', 'Evento 2', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1'),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'C2', 'O Comitê 2'),
	('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000e2', 'C9', 'C9', 'O Comitê 9');
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'Delegação 1'),
	('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'D2', 'Delegação 2'),
	('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c2', 'D3', 'Delegação 3'),
	('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000c9', 'D9', 'Delegação 9');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'pessoa' || n || '@exemplo.test', '{"nome": "Pessoa"}'
from unnest(array[1, 2, 3, 9]) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d3'),
	('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000e2', 'delegado', '00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000d9');
insert into auth.sessions (id, user_id) values ('00000000-0000-0000-0000-0000000005e1', '00000000-0000-0000-0000-0000000000a1');
insert into public.assinatura_push (endpoint, pessoa_id, p256dh, auth)
values ('https://push.exemplo.test/a1', '00000000-0000-0000-0000-0000000000a1', 'chave', 'segredo');

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.sair() returns void language plpgsql as $$
begin
	perform set_config('role', 'postgres', true);
	perform set_config('request.jwt.claims', '', true);
end $$;
create function pg_temp.participacoes_de_c1() returns int language sql as $$
	select count(*)::int from public.participacao where comite_id = '00000000-0000-0000-0000-0000000000c1'
$$;

-- Outro evento e outro comitê
select pg_temp.entrar(9);
select is((select count(*)::int from public.comite where evento_id = '00000000-0000-0000-0000-0000000000e1'), 0,
	'quem é de outro evento não vê os comitês');
select is((select count(*)::int from public.delegacao where comite_id = '00000000-0000-0000-0000-0000000000c1'), 0,
	'quem é de outro evento não vê as delegações');
select is(pg_temp.participacoes_de_c1(), 0, 'quem é de outro evento não vê quem participa');
select pg_temp.entrar(3);
select is(pg_temp.participacoes_de_c1(), 0, 'quem é de outro comitê não vê as participações dele');

-- Storage: pasta errada é recusada
select pg_temp.entrar(1);
select throws_ok(
	$$ insert into storage.objects (bucket_id, name) values ('fotos', '00000000-0000-0000-0000-0000000000a2/foto') $$,
	'42501', null, 'ninguém envia foto na pasta de outra pessoa');
select throws_ok(
	$$ insert into storage.objects (bucket_id, name) values ('press', '00000000-0000-0000-0000-0000000000c1/imagem.webp') $$,
	'42501', null, 'quem não é da press não envia imagem de matéria');

-- Revogação
select is(pg_temp.participacoes_de_c1(), 2, 'antes de perder o acesso, a delegação vê o comitê');
select pg_temp.sair();
delete from public.participacao where pessoa_id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.entrar(1);
select is(pg_temp.participacoes_de_c1(), 0, 'participação revogada perde o acesso na hora');
select is((select count(*)::int from public.comite), 0, 'sem participação, nada do evento aparece');
select pg_temp.sair();
select is((select count(*)::int from auth.sessions where user_id = '00000000-0000-0000-0000-0000000000a1'), 0,
	'revogar encerra as sessões da conta');
select is((select count(*)::int from public.assinatura_push where pessoa_id = '00000000-0000-0000-0000-0000000000a1'), 0,
	'revogar remove as notificações da conta');

-- Cabeçalhos das respostas sensíveis
select set_config('request.path', '/nota_crise', true);
select public.cabecalhos_do_pedido();
select is(current_setting('response.headers', true), '[{"Cache-Control": "private, no-store"}]',
	'nota de crise sai sem cache');
select set_config('response.headers', '', true);
select set_config('request.path', '/cronograma_item', true);
select public.cabecalhos_do_pedido();
select is(current_setting('response.headers', true), '', 'o resto não muda');

select * from finish();
rollback;
