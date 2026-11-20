-- Passo 04: cronograma, avisos, perfil, fotos e participação no comitê.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- Cenário: evento 1 (C1 e C2) e evento 2 (C3).
-- a1 delegado de C1, a2 delegado de C2, a3 mesa de C1, a4 secretaria do evento 1,
-- a5 delegado de C3 (outro evento).
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

insert into auth.users (id, email, raw_user_meta_data) values
	('00000000-0000-0000-0000-0000000000a1', 'delegado1@exemplo.test', '{"nome": "Delegado 1"}'),
	('00000000-0000-0000-0000-0000000000a2', 'delegado2@exemplo.test', '{"nome": "Delegado 2"}'),
	('00000000-0000-0000-0000-0000000000a3', 'mesa1@exemplo.test', '{"nome": "Mesa 1"}'),
	('00000000-0000-0000-0000-0000000000a4', 'secretaria@exemplo.test', '{"nome": "Secretaria"}'),
	('00000000-0000-0000-0000-0000000000a5', 'delegado5@exemplo.test', '{"nome": "Delegado 5"}');

insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d2'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'secretaria', null, null),
	('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000e2', 'delegado', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000d3');

insert into public.cronograma_item (evento_id, comite_id, titulo, inicio, fim) values
	('00000000-0000-0000-0000-0000000000e1', null, 'Abertura', '2027-11-10 09:00-03', '2027-11-10 10:00-03'),
	('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Sessão C1', '2027-11-10 10:00-03', '2027-11-10 12:00-03'),
	('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c2', 'Sessão C2', '2027-11-10 10:00-03', '2027-11-10 12:00-03'),
	('00000000-0000-0000-0000-0000000000e2', null, 'Abertura do evento 2', '2027-11-10 09:00-03', '2027-11-10 10:00-03');

insert into public.aviso (evento_id, comite_id, texto, autor_id) values
	('00000000-0000-0000-0000-0000000000e1', null, 'Aviso geral', '00000000-0000-0000-0000-0000000000a4'),
	('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Aviso do C1', '00000000-0000-0000-0000-0000000000a4'),
	('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c2', 'Aviso do C2', '00000000-0000-0000-0000-0000000000a4');

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
	'select titulo from public.cronograma_item order by inicio',
	$$ values ('Abertura'), ('Sessão C1') $$,
	'o delegado vê o cronograma geral e o do próprio comitê, e nada de outro comitê ou evento'
);
select throws_ok(
	$$ insert into public.cronograma_item (evento_id, titulo, inicio, fim)
		values ('00000000-0000-0000-0000-0000000000e1', 'Festa', '2027-11-10 20:00-03', '2027-11-10 23:00-03') $$,
	'42501', null, 'o delegado não cria item do cronograma'
);
select is((select count(*)::int from public.aviso), 2, 'o delegado vê os avisos gerais e os do próprio comitê');
select throws_ok(
	$$ insert into public.aviso (evento_id, comite_id, texto)
		values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Oi') $$,
	'42501', null, 'o delegado não publica aviso'
);
select ok(public.participa_do_comite('00000000-0000-0000-0000-0000000000c1'), 'participa_do_comite: participa de C1');
select ok(not public.participa_do_comite('00000000-0000-0000-0000-0000000000c2'), 'participa_do_comite: não participa de C2');

update public.pessoa set bio = 'Delegado do Brasil' where id = '00000000-0000-0000-0000-0000000000a1';
select is(
	(select bio from public.pessoa where id = '00000000-0000-0000-0000-0000000000a1'),
	'Delegado do Brasil',
	'cada um edita o próprio perfil'
);
update public.pessoa set bio = 'invasão' where id = '00000000-0000-0000-0000-0000000000a3';

select public.marcar_avisos_vistos();
select isnt(
	(select avisos_vistos_em from public.pessoa where id = '00000000-0000-0000-0000-0000000000a1'),
	null,
	'marcar_avisos_vistos grava a hora do servidor no próprio perfil'
);

select lives_ok(
	$$ insert into storage.objects (bucket_id, name) values ('fotos', '00000000-0000-0000-0000-0000000000a1/foto') $$,
	'cada um envia a própria foto'
);
select throws_ok(
	$$ insert into storage.objects (bucket_id, name) values ('fotos', '00000000-0000-0000-0000-0000000000a3/foto') $$,
	'42501', null, 'ninguém envia foto na pasta de outra pessoa'
);

-- Mesa de C1

reset role;
select is(
	(select bio from public.pessoa where id = '00000000-0000-0000-0000-0000000000a3'),
	null,
	'ninguém edita o perfil de outra pessoa'
);

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select throws_ok(
	$$ insert into public.cronograma_item (evento_id, titulo, inicio, fim)
		values ('00000000-0000-0000-0000-0000000000e1', 'Reunião', '2027-11-10 18:00-03', '2027-11-10 19:00-03') $$,
	'42501', null, 'a mesa não cria item do cronograma'
);
select lives_ok(
	$$ insert into public.aviso (evento_id, comite_id, texto)
		values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Sessão começa às 10h') $$,
	'a mesa publica aviso do próprio comitê'
);
select throws_ok(
	$$ insert into public.aviso (evento_id, comite_id, texto)
		values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c2', 'Oi') $$,
	'42501', null, 'a mesa não publica aviso de outro comitê'
);
select throws_ok(
	$$ insert into public.aviso (evento_id, texto) values ('00000000-0000-0000-0000-0000000000e1', 'Oi') $$,
	'42501', null, 'a mesa não publica aviso geral'
);
select is(
	(select count(*)::int from storage.objects where bucket_id = 'fotos' and name = '00000000-0000-0000-0000-0000000000a1/foto'),
	1,
	'quem está no mesmo comitê vê a foto'
);

-- Secretaria do evento 1

reset role;
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a4');
select lives_ok(
	$$ insert into public.cronograma_item (evento_id, titulo, local, inicio, fim)
		values ('00000000-0000-0000-0000-0000000000e1', 'Almoço', 'Restaurante', '2027-11-10 12:00-03', '2027-11-10 13:30-03') $$,
	'a secretaria cria item do cronograma'
);
select lives_ok(
	$$ insert into public.aviso (evento_id, texto) values ('00000000-0000-0000-0000-0000000000e1', 'Bem-vindos') $$,
	'a secretaria publica aviso geral'
);
select throws_ok(
	$$ insert into public.aviso (evento_id, texto, autor_id)
		values ('00000000-0000-0000-0000-0000000000e1', 'Falso', '00000000-0000-0000-0000-0000000000a3') $$,
	'42501', null, 'ninguém publica aviso em nome de outra pessoa'
);

-- Delegado de outro evento

reset role;
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a5');
select is(
	(select count(*)::int from storage.objects where bucket_id = 'fotos' and name = '00000000-0000-0000-0000-0000000000a1/foto'),
	0,
	'quem é de outro evento não vê a foto'
);

-- Banco

reset role;
select throws_ok(
	$$ insert into public.cronograma_item (evento_id, titulo, inicio, fim)
		values ('00000000-0000-0000-0000-0000000000e1', 'Ao contrário', '2027-11-10 12:00-03', '2027-11-10 11:00-03') $$,
	'23514', null, 'o fim do item vem depois do início'
);
select ok(
	exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'aviso'),
	'os avisos chegam pelo tempo real'
);

select * from finish();
rollback;
