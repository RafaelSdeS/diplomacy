-- Passo 11: press.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- Cenário: C1 (veículo V1) e C2 (veículo V2) no mesmo evento; d1 e d2 em C1, d9 num
-- outro evento. a1 delegado de d1, a2 press de C1, a3 press de C2, a4 secretaria,
-- a5 delegado de d2.
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
	('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000c9', 'D9', 'Delegação 9');
insert into public.veiculo (id, comite_id, nome) values
	('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'Veículo 1'),
	('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c2', 'Veículo 2');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'a' || n || '@exemplo.test', json_build_object('nome', 'A' || n)
from generate_series(1, 5) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'press', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'press', '00000000-0000-0000-0000-0000000000c2', null),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'secretaria', null, null),
	('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2');

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text,
		true
	);
end $$;

-- Publicar

select pg_temp.entrar(2);
select is(
	public.publicar_noticia('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-0000000000f1', 'reportagem',
		'D1 propõe trégua', 'Texto da matéria.', p_citadas => array['00000000-0000-0000-0000-0000000000d1',
		'00000000-0000-0000-0000-0000000000d9']::uuid[]),
	'publicada', 'a press publica no próprio veículo, sem aprovação');
select is(
	public.publicar_noticia('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-0000000000f1', 'reportagem',
		'D1 propõe trégua', 'Texto da matéria.'),
	'publicada', 'reenviar a mesma notícia não duplica');
select results_eq($$select count(*)::int from public.noticia$$, array[1], 'uma notícia só');
select throws_ok(
	$$select public.publicar_noticia(gen_random_uuid(), '00000000-0000-0000-0000-0000000000f2', 'reportagem', 'T', 'X')$$,
	'42501', null, 'a press de um veículo não publica em outro');

select pg_temp.entrar(1);
select throws_ok(
	$$select public.publicar_noticia(gen_random_uuid(), '00000000-0000-0000-0000-0000000000f1', 'reportagem', 'T', 'X')$$,
	'42501', null, 'delegados não publicam');
select results_eq($$select titulo from public.noticia$$, array['D1 propõe trégua'], 'o delegado lê a notícia publicada');
select results_eq($$select delegacao_id from public.citacao$$, array['00000000-0000-0000-0000-0000000000d1'::uuid],
	'a delegação citada fica registrada (a de outro evento, não)');
select pg_temp.entrar(3);
select results_eq($$select count(*)::int from public.noticia$$, array[1], 'a press de outro comitê também lê');

-- Denúncia

select pg_temp.entrar(1);
select lives_ok($$select public.denunciar_noticia('00000000-0000-0000-0000-000000000101', 'Informação falsa.')$$,
	'qualquer participante denuncia');
select is_empty($$select 1 from public.denuncia$$, 'mas não lê as denúncias');
select pg_temp.entrar(4);
select results_eq($$select motivo from public.denuncia$$, array['Informação falsa.'], 'a secretaria lê as denúncias');

-- Ocultar

select pg_temp.entrar(2);
select throws_ok($$select public.ocultar_noticia('00000000-0000-0000-0000-000000000101', 'x')$$,
	'42501', null, 'a press não oculta');
select pg_temp.entrar(4);
select public.ocultar_noticia('00000000-0000-0000-0000-000000000101', 'Ataque pessoal.');
select results_eq($$select acao, detalhe from public.registro$$, $$values ('ocultar_noticia', 'Ataque pessoal.')$$,
	'a ocultação fica no registro');
select pg_temp.entrar(1);
select is_empty($$select 1 from public.noticia$$, 'oculta, a notícia some para os delegados');
select pg_temp.entrar(4);
select results_eq($$select status from public.noticia$$, array['oculta'], 'a secretaria ainda vê a notícia oculta');

-- Revisão ligada

reset role;
update public.comite set regras = '{"press_revisao": true}' where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.entrar(2);
select is(
	public.publicar_noticia('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-0000000000f1', 'nota_urgente',
		'Plantão', 'Texto.'),
	'aguardando', 'com a revisão ligada, a notícia aguarda a Diretoria');
select pg_temp.entrar(5);
select is_empty($$select 1 from public.noticia$$, 'e não aparece ao público enquanto aguarda');
reset role;

select * from finish();
rollback;
