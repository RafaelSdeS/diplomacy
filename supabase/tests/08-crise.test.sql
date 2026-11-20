-- Passo 08: crise. O teste de privacidade principal: a delegação A não lê a nota
-- da delegação B.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

-- Cenário: evento com C1 e C2 (com crise) e C3 (com crise, para a atualização
-- conjunta). a1 = delegado de d1 (C1), a2 = delegado de d2 (C1), a3 = mesa de C1,
-- a4 = press de C1, a5 e a6 = crise de C1 e C2, a7 = delegado de d3 (C3).
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial, crise_ligada) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'C1', true),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'C2', 'C2', true),
	('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000e1', 'C3', 'C3', 'C3', true);
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'Brasil', 'Brasil'),
	('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'Chile', 'Chile'),
	('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c3', 'Peru', 'Peru');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'a' || n || '@exemplo.test', json_build_object('nome', 'A' || n)
from generate_series(1, 7) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'press', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000e1', 'crise', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000e1', 'crise', '00000000-0000-0000-0000-0000000000c2', null),
	('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000e1', 'crise', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000d3');

create function pg_temp.entrar(p_usuario uuid) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', p_usuario, 'role', 'authenticated')::text,
		true
	);
end $$;

-- Envio: idempotente e com limite de pendentes (2)

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select public.enviar_nota('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-0000000000c1', 'nota', 'Nota 1', 'Texto 1');
select lives_ok(
	$$select public.enviar_nota('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-0000000000c1', 'nota', 'Nota 1', 'Texto 1')$$,
	'reenviar a mesma nota não dá erro');
select results_eq($$select count(*)::int from public.nota_crise$$, array[1], 'reenviar a mesma nota cria uma só');
select public.enviar_nota('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-0000000000c1', 'diretiva', 'Nota 2', 'Texto 2');
select throws_ok(
	$$select public.enviar_nota('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-0000000000c1', 'nota', 'Nota 3', 'Texto 3')$$,
	'P0001', null, 'o limite de 2 notas pendentes é respeitado');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a2');
select public.enviar_nota('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-0000000000c1', 'nota', 'Do Chile', 'Segredo do Chile');

-- Privacidade

select results_eq($$select titulo from public.nota_crise$$, array['Do Chile'],
	'a delegação B só vê a própria nota, nunca a da delegação A');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select results_eq($$select count(*)::int from public.nota_crise where delegacao_id = '00000000-0000-0000-0000-0000000000d2'$$,
	array[0], 'a delegação A não lê a nota da delegação B');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select is_empty($$select 1 from public.nota_crise$$, 'a mesa não lê notas de crise');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a4');
select is_empty($$select 1 from public.nota_crise$$, 'a press não lê notas de crise');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a5');
select results_eq($$select count(*)::int from public.nota_crise$$, array[3], 'a crise do comitê vê todas as notas');

-- Fila

select is(public.posicao_na_fila('00000000-0000-0000-0000-000000000201'), 3, 'a nota do Chile é a 3ª da fila');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a2');
select is(public.posicao_na_fila('00000000-0000-0000-0000-000000000201'), 3, 'a delegação vê a posição da própria nota');
select is(public.posicao_na_fila('00000000-0000-0000-0000-000000000101'), null, 'mas não a posição da nota de outra');

-- Assumir e responder

select throws_ok($$select public.assumir_nota('00000000-0000-0000-0000-000000000101')$$,
	'42501', null, 'delegado não assume nota');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a5');
select lives_ok($$select public.assumir_nota('00000000-0000-0000-0000-000000000101')$$, 'a crise assume uma nota');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a6');
select throws_ok($$select public.assumir_nota('00000000-0000-0000-0000-000000000101')$$,
	'P0001', 'Outra pessoa da crise já assumiu esta nota.', 'com duas pessoas assumindo a mesma nota, só uma consegue');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select throws_ok(
	$$select public.responder_notas('{00000000-0000-0000-0000-000000000101}', 'aprovada', 'Ok')$$,
	'42501', null, 'a mesa não responde notas');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a6');
select public.responder_notas(
	'{00000000-0000-0000-0000-000000000101,00000000-0000-0000-0000-000000000102}', 'aprovada', 'Aprovadas.');
select results_eq(
	$$select status::text, resposta from public.nota_crise where delegacao_id = '00000000-0000-0000-0000-0000000000d1' order by criado_em$$,
	$$values ('aprovada', 'Aprovadas.'), ('aprovada', 'Aprovadas.')$$,
	'a crise responde várias notas parecidas de uma vez');
select is(public.posicao_na_fila('00000000-0000-0000-0000-000000000201'), 1, 'respondidas as outras, a nota do Chile sobe na fila');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select lives_ok(
	$$select public.enviar_nota('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-0000000000c1', 'nota', 'Nota 3', 'Texto 3')$$,
	'respondidas, a delegação volta a enviar');

-- Atualizações

select throws_ok(
	$$select public.publicar_atualizacao('{00000000-0000-0000-0000-0000000000c1}', 'Ataque no porto')$$,
	'42501', null, 'delegado não publica atualização');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a5');
select public.publicar_atualizacao('{00000000-0000-0000-0000-0000000000c1,00000000-0000-0000-0000-0000000000c2}', 'Ataque no porto');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select results_eq($$select texto from public.atualizacao_crise$$, array['Ataque no porto'],
	'a atualização conjunta aparece num dos comitês ligados');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a7');
select is_empty($$select 1 from public.atualizacao_crise$$, 'e não aparece num terceiro comitê');
reset role;

select * from finish();
rollback;
