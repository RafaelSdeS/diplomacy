-- Passo 03: convites, criação automática da pessoa e das participações, e a
-- visão minhas_participacoes.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

-- Cenário: evento 1 (comitês C1 e C2, delegação Brasil em C1) e evento 2 (C3).
insert into public.evento (id, nome, ano) values
	('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027),
	('00000000-0000-0000-0000-0000000000e2', 'Evento 2', 2027);

insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'Comitê 1', 'Comitê 1'),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'Comitê 2', 'Comitê 2'),
	('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000e2', 'C3', 'Comitê 3', 'Comitê 3');

insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'Brasil', 'Federative Republic of Brazil');

-- a1: delegado do Brasil em C1. a4: secretaria do evento 1.
insert into auth.users (id, email, raw_user_meta_data) values
	('00000000-0000-0000-0000-0000000000a1', 'delegado1@exemplo.test', '{"nome": "Delegado 1"}'),
	('00000000-0000-0000-0000-0000000000a4', 'secretaria@exemplo.test', '{"nome": "Secretaria"}');

insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'secretaria', null, null);

insert into public.convite (email, evento_id, papel, comite_id) values
	('x@exemplo.test', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1'),
	('y@exemplo.test', '00000000-0000-0000-0000-0000000000e2', 'mesa', '00000000-0000-0000-0000-0000000000c3');

create function pg_temp.entrar(p_usuario uuid) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', p_usuario, 'role', 'authenticated')::text,
		true
	);
end $$;

-- Quem vê e quem cria convites

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a4');
select is((select count(*)::int from public.convite), 1, 'a secretaria vê os convites do próprio evento, e só');
select lives_ok(
	$$ insert into public.convite (email, evento_id, papel, comite_id)
		values ('convidado@exemplo.test', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c2') $$,
	'a secretaria cria convite no próprio evento'
);
select throws_ok(
	$$ insert into public.convite (email, evento_id, papel, comite_id)
		values ('outro@exemplo.test', '00000000-0000-0000-0000-0000000000e2', 'mesa', '00000000-0000-0000-0000-0000000000c3') $$,
	'42501',
	null,
	'a secretaria não cria convite em outro evento'
);

reset role;
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.convite), 0, 'o delegado não vê convites');
select throws_ok(
	$$ insert into public.convite (email, evento_id, papel, comite_id)
		values ('eu@exemplo.test', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1') $$,
	'42501',
	null,
	'o delegado não cria convite'
);
select results_eq(
	'select papel::text from public.minhas_participacoes',
	$$ values ('delegado') $$,
	'minhas_participacoes mostra só as participações de quem está logado'
);

-- Gatilhos (como o banco, sem RLS)

reset role;

select throws_ok(
	$$ insert into public.convite (email, evento_id, papel, comite_id)
		values ('Maiuscula@exemplo.test', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1') $$,
	'23514',
	null,
	'o e-mail do convite fica sempre em minúsculas'
);

-- Conta nova com dois convites; o e-mail da conta vem com maiúsculas.
insert into public.convite (email, evento_id, papel, comite_id) values
	('nova@exemplo.test', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1'),
	('nova@exemplo.test', '00000000-0000-0000-0000-0000000000e1', 'press', '00000000-0000-0000-0000-0000000000c2');
insert into auth.users (id, email, raw_user_meta_data) values
	('00000000-0000-0000-0000-0000000000b1', 'Nova@Exemplo.test', '{"nome": "Nova Pessoa"}');

select is(
	(select nome from public.pessoa where id = '00000000-0000-0000-0000-0000000000b1'),
	'Nova Pessoa',
	'conta nova: a pessoa é criada com o nome do cadastro'
);
select is(
	(select count(*)::int from public.participacao where pessoa_id = '00000000-0000-0000-0000-0000000000b1'),
	2,
	'conta nova: cada convite do e-mail vira uma participação'
);

-- Conta nova sem convite; o nome sai do e-mail.
insert into auth.users (id, email) values
	('00000000-0000-0000-0000-0000000000b2', 'sem@exemplo.test');

select is(
	(select nome from public.pessoa where id = '00000000-0000-0000-0000-0000000000b2'),
	'sem',
	'conta sem nome no cadastro: o nome sai do e-mail'
);
select is(
	(select count(*)::int from public.participacao where pessoa_id = '00000000-0000-0000-0000-0000000000b2'),
	0,
	'conta sem convite não ganha participação'
);

-- Convite criado depois da conta: vale na hora.
insert into public.convite (email, evento_id, papel, comite_id, delegacao_id) values
	('sem@exemplo.test', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1');

select is(
	(select count(*)::int from public.participacao where pessoa_id = '00000000-0000-0000-0000-0000000000b2'),
	1,
	'convite para quem já tem conta vira participação na hora'
);

select ok(
	not has_function_privilege('authenticated', 'public.aplicar_convites(uuid, text)', 'execute'),
	'usuários logados não chamam aplicar_convites direto'
);
select ok(
	not has_function_privilege('anon', 'public.aplicar_convites(uuid, text)', 'execute'),
	'anônimos não chamam aplicar_convites direto'
);

select pg_temp.entrar('00000000-0000-0000-0000-0000000000b1');
select results_eq(
	'select comite_sigla from public.minhas_participacoes order by comite_sigla',
	$$ values ('C1'), ('C2') $$,
	'minhas_participacoes traz o comitê de cada participação'
);

select * from finish();
rollback;
