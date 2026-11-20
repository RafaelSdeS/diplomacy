-- Passo 02: papéis, regras de acesso e restrições das tabelas centrais.
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

-- Cenário: evento 1 com os comitês C1 e C2; evento 2 com o comitê C3.
-- Pessoas: a1 delegado de C1, a2 delegado de C2, a3 mesa de C1, a4 secretaria do evento 1.
insert into public.evento (id, nome, ano) values
	('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027),
	('00000000-0000-0000-0000-0000000000e2', 'Evento 2', 2027);

insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'Comitê 1', 'Comitê 1'),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'Comitê 2', 'Comitê 2'),
	('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000e2', 'C3', 'Comitê 3', 'Comitê 3');

insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'Brasil', 'Federative Republic of Brazil'),
	('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', 'França', 'French Republic'),
	('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c3', 'Chile', 'Republic of Chile');

insert into auth.users (id, email) values
	('00000000-0000-0000-0000-0000000000a1', 'delegado1@exemplo.test'),
	('00000000-0000-0000-0000-0000000000a2', 'delegado2@exemplo.test'),
	('00000000-0000-0000-0000-0000000000a3', 'mesa1@exemplo.test'),
	('00000000-0000-0000-0000-0000000000a4', 'secretaria@exemplo.test');

insert into public.pessoa (id, nome) values
	('00000000-0000-0000-0000-0000000000a1', 'Delegado 1'),
	('00000000-0000-0000-0000-0000000000a2', 'Delegado 2'),
	('00000000-0000-0000-0000-0000000000a3', 'Mesa 1'),
	('00000000-0000-0000-0000-0000000000a4', 'Secretaria');

insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d2'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'secretaria', null, null);

-- Entra como uma pessoa (sempre chamar depois de "reset role").
create function pg_temp.entrar(p_usuario uuid) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', p_usuario, 'role', 'authenticated')::text,
		true
	);
end $$;

-- Delegado 1 (C1)

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');

select results_eq(
	'select nome from public.evento',
	$$ values ('Evento 1') $$,
	'o delegado vê o próprio evento e não o outro'
);
select results_eq(
	'select sigla from public.comite order by sigla',
	$$ values ('C1'), ('C2') $$,
	'o delegado vê os comitês do evento e não os de outro evento'
);
select results_eq(
	'select nome from public.delegacao order by nome',
	$$ values ('Brasil'), ('França') $$,
	'o delegado vê as delegações do evento'
);
select results_eq(
	'select pessoa_id from public.participacao',
	$$ values ('00000000-0000-0000-0000-0000000000a1'::uuid) $$,
	'o delegado vê só a própria participação'
);
select results_eq(
	'select nome from public.pessoa order by nome',
	$$ values ('Delegado 1'), ('Mesa 1') $$,
	'o delegado vê o nome de quem está no mesmo comitê, e só'
);
select throws_ok(
	$$ insert into public.participacao (pessoa_id, evento_id, papel, comite_id)
		values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1') $$,
	'42501',
	null,
	'o delegado não cria participação'
);
-- A RLS esconde a linha do UPDATE: nada muda, sem erro.
update public.participacao set papel = 'mesa'
where pessoa_id = '00000000-0000-0000-0000-0000000000a1';
select results_eq(
	$$ select papel::text from public.participacao where pessoa_id = '00000000-0000-0000-0000-0000000000a1' $$,
	$$ values ('delegado') $$,
	'o delegado não altera a própria participação'
);
select ok(public.tem_papel('00000000-0000-0000-0000-0000000000c1', '{delegado}'), 'tem_papel: é delegado em C1');
select ok(not public.tem_papel('00000000-0000-0000-0000-0000000000c1', '{mesa}'), 'tem_papel: não é mesa em C1');
select is(public.minha_delegacao('00000000-0000-0000-0000-0000000000c1'), '00000000-0000-0000-0000-0000000000d1'::uuid, 'minha_delegacao em C1 é o Brasil');
select is(public.minha_delegacao('00000000-0000-0000-0000-0000000000c2'), null::uuid, 'minha_delegacao em C2 é nula');

-- Mesa de C1

reset role;
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');

select results_eq(
	'select pessoa_id from public.participacao order by pessoa_id',
	$$ values ('00000000-0000-0000-0000-0000000000a1'::uuid), ('00000000-0000-0000-0000-0000000000a3'::uuid) $$,
	'a mesa vê as participações do próprio comitê e não as de outro'
);
select ok(public.tem_papel('00000000-0000-0000-0000-0000000000c1', '{mesa}'), 'tem_papel: é mesa em C1');
select ok(not public.tem_papel('00000000-0000-0000-0000-0000000000c2', '{mesa}'), 'tem_papel: não é mesa em C2');

-- Secretaria do evento 1

reset role;
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a4');

select is((select count(*)::int from public.participacao), 4, 'a secretaria vê todas as participações do evento');
select ok(public.tem_papel('00000000-0000-0000-0000-0000000000c2', '{secretaria}'), 'tem_papel: a secretaria vale para todos os comitês do evento');
select lives_ok(
	$$ insert into public.participacao (pessoa_id, evento_id, papel, comite_id)
		values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c2') $$,
	'a secretaria cria participação no próprio evento'
);
select throws_ok(
	$$ insert into public.participacao (pessoa_id, evento_id, papel, comite_id)
		values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e2', 'mesa', '00000000-0000-0000-0000-0000000000c3') $$,
	'42501',
	null,
	'a secretaria não cria participação em outro evento'
);

-- Restrições do banco (valem até para quem passa por cima da RLS)

reset role;

select throws_ok(
	$$ insert into public.participacao (pessoa_id, evento_id, papel, comite_id)
		values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1') $$,
	'23514',
	null,
	'não existe delegado sem delegação'
);
select throws_ok(
	$$ insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id)
		values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2') $$,
	'23503',
	null,
	'a delegação precisa ser do mesmo comitê'
);
select throws_ok(
	$$ insert into public.participacao (pessoa_id, evento_id, papel, comite_id)
		values ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'secretaria', '00000000-0000-0000-0000-0000000000c1') $$,
	'23514',
	null,
	'a secretaria não fica presa a um comitê'
);
select throws_ok(
	$$ insert into public.participacao (pessoa_id, evento_id, papel, comite_id)
		values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c3') $$,
	'23503',
	null,
	'o comitê precisa ser do mesmo evento'
);

-- Usuário anônimo

set local role anon;
select set_config('request.jwt.claims', '', true);

select is((select count(*)::int from public.evento), 0, 'anônimo não vê eventos');
select is((select count(*)::int from public.comite), 0, 'anônimo não vê comitês');
select is((select count(*)::int from public.delegacao), 0, 'anônimo não vê delegações');
select is((select count(*)::int from public.pessoa), 0, 'anônimo não vê pessoas');
select is((select count(*)::int from public.participacao), 0, 'anônimo não vê participações');

select * from finish();
rollback;
