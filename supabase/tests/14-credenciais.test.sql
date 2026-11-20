-- Passo 14: credenciais (crachá e código da secretaria), check-in e certificados.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- Cenário: evento E1 com o comitê C1 e a delegação D1. Convites de x (delegado de D1)
-- e y (mesa). a1 é da secretaria; a2 é um delegado.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'Comitê 1', 'O Comitê 1');
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'Delegação 1');
insert into public.convite (email, evento_id, papel, comite_id, delegacao_id, nome) values
	('x@exemplo.test', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', 'Xis da Silva'),
	('y@exemplo.test', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1', null, null);
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'a' || n || '@exemplo.test', json_build_object('nome', 'A' || n)
from generate_series(1, 2) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'secretaria', null, null),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1');

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text,
		true
	);
end $$;
create temp table codigos (nome text primary key, codigo text);
grant all on codigos to authenticated, service_role, anon;
create function pg_temp.codigo(p text) returns text language sql as $$ select codigo from codigos where nome = p $$;
-- O que a Edge Function faria, com o service role.
create function pg_temp.login(p_codigo text) returns text language plpgsql as $$
declare v text;
begin
	perform set_config('role', 'service_role', true);
	select email into v from public.entrar_com_codigo(p_codigo, 'origem-de-teste');
	perform set_config('role', 'postgres', true);
	return v;
end $$;

-- Crachás

select pg_temp.entrar(2);
select throws_ok($$select public.emitir_crachas('00000000-0000-0000-0000-0000000000e1')$$, '42501', null,
	'só a secretaria emite crachás');
select pg_temp.entrar(1);
insert into codigos select 'x', codigo from public.emitir_crachas('00000000-0000-0000-0000-0000000000e1') where email = 'x@exemplo.test';
select results_eq($$select count(*)::int from public.credencial where tipo = 'cracha' and not revogada$$, array[2],
	'um crachá para cada convidado');
select is((select nome from public.emitir_crachas('00000000-0000-0000-0000-0000000000e1', array['y@exemplo.test'])),
	'y', 'sem nome no convite nem conta, o crachá usa o começo do e-mail');
select is_empty($$select 1 from public.credencial where hash = pg_temp.codigo('x') or hash like '%' || pg_temp.codigo('x') || '%'$$,
	'o banco não guarda o código, só o hash');
select pg_temp.entrar(2);
select is_empty($$select 1 from public.credencial$$, 'delegados não leem as credenciais');

reset role;
select is(pg_temp.login(pg_temp.codigo('x')), 'x@exemplo.test', 'o crachá válido dá o e-mail da conta');
select is(pg_temp.login('codigo-que-nao-existe'), null, 'um código errado não dá nada');
select pg_temp.entrar(2);
select throws_ok($$select * from public.entrar_com_codigo('x', 'y')$$, '42501', null, 'só a Edge Function troca códigos');

select pg_temp.entrar(1);
insert into codigos select 'x2', codigo from public.emitir_crachas('00000000-0000-0000-0000-0000000000e1', array['X@exemplo.test']);
reset role;
select is(pg_temp.login(pg_temp.codigo('x')), null, 'reemitido, o crachá antigo deixa de valer');
select is(pg_temp.login(pg_temp.codigo('x2')), 'x@exemplo.test', 'e o novo vale');
select pg_temp.entrar(1);
select public.revogar_credenciais('00000000-0000-0000-0000-0000000000e1', 'x@exemplo.test');
reset role;
select is(pg_temp.login(pg_temp.codigo('x2')), null, 'revogado, o crachá não entra');

-- Código da secretaria

select pg_temp.entrar(1);
select throws_ok($$select public.emitir_codigo('00000000-0000-0000-0000-0000000000e1', 'z@exemplo.test')$$, 'P0002', null,
	'só para quem tem convite');
insert into codigos values ('curto', public.emitir_codigo('00000000-0000-0000-0000-0000000000e1', 'x@exemplo.test'));
select ok(pg_temp.codigo('curto') ~ '^[A-HJKMNP-Z2-9]{8}$', 'o código tem 8 caracteres fáceis de ditar');
reset role;
select is(pg_temp.login(pg_temp.codigo('curto')), 'x@exemplo.test', 'o código da secretaria entra');
select is(pg_temp.login(pg_temp.codigo('curto')), null, 'mas uma vez só');
select pg_temp.entrar(1);
delete from codigos where nome = 'curto';
insert into codigos values ('curto', public.emitir_codigo('00000000-0000-0000-0000-0000000000e1', 'x@exemplo.test'));
reset role;
update public.credencial set expira_em = now() - interval '1 minute' where tipo = 'codigo' and not revogada;
select is(pg_temp.login(pg_temp.codigo('curto')), null, 'vencido, o código não entra');

-- Tentativas (as erradas acima também contaram: começa do zero)
delete from public.tentativa_login;
select pg_temp.login('errado-' || n) from generate_series(1, 30) n;
select throws_ok($$select pg_temp.login('mais-um')$$, 'P0429', null, 'depois de 30 tentativas erradas, a origem espera');

-- Check-in e certificados

select pg_temp.entrar(1);
select public.marcar_checkin('00000000-0000-0000-0000-0000000000e1', 'X@exemplo.test');
select is(public.emitir_certificados('00000000-0000-0000-0000-0000000000e1'), 1, 'certificado só para quem fez check-in');
insert into codigos select 'certificado', codigo from public.certificado;
set local role anon;
select results_eq(
	$$select nome, evento, funcao from public.verificar_certificado(lower(pg_temp.codigo('certificado')))$$,
	$$values ('Xis da Silva', 'Evento 1 2027', 'Delegado(a) de D1 · Comitê 1')$$,
	'qualquer pessoa confere o certificado: só nome, evento e função');
select is_empty($$select 1 from public.verificar_certificado('NAOEXISTE')$$, 'um código inexistente não mostra nada');
reset role;

select * from finish();
rollback;
