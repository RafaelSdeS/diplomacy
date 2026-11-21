-- Passo 21: chamada com um estado só, chegada atrasada, chamada rápida e resumo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- Cenário: C1 com 6 delegações (d06 suspensa); a1 delegado de d01, a2 delegado de
-- d02, a3 mesa de C1; C2 com a5, delegado de outra delegação.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'Comitê 1', 'Comitê 1'),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'Comitê 2', 'Comitê 2');
insert into public.delegacao (id, comite_id, nome, nome_oficial, situacao)
select ('00000000-0000-0000-0000-0000000000' || lpad(to_hex(n), 2, '0'))::uuid,
	'00000000-0000-0000-0000-0000000000c1', 'Delegação ' || n, 'Delegação ' || n,
	(case when n = 6 then 'suspensa' else 'membro' end)::public.situacao_delegacao
from generate_series(1, 6) as n;
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-0000000000c2', 'Outra', 'Outra');

insert into auth.users (id, email, raw_user_meta_data) values
	('00000000-0000-0000-0000-0000000000a1', 'delegado1@exemplo.test', '{"nome": "Delegado 1"}'),
	('00000000-0000-0000-0000-0000000000a2', 'delegado2@exemplo.test', '{"nome": "Delegado 2"}'),
	('00000000-0000-0000-0000-0000000000a3', 'mesa@exemplo.test', '{"nome": "Mesa"}'),
	('00000000-0000-0000-0000-0000000000a5', 'outro@exemplo.test', '{"nome": "Outro"}');
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado',
		'00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado',
		'00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000002'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'mesa',
		'00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000e1', 'delegado',
		'00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000021');

create function pg_temp.entrar(p_usuario uuid) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.sessao() returns uuid language sql as $$
	select public.sessao_atual('00000000-0000-0000-0000-0000000000c1')
$$;
create function pg_temp.votacao() returns uuid language sql as $$
	select id from public.votacao where aberta order by criado_em desc limit 1
$$;

-- Abertura e chamada rápida

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.abrir_sessao('00000000-0000-0000-0000-0000000000c1');
select throws_ok(
	$$insert into public.presenca (sessao_id, comite_id, delegacao_id, situacao)
		values (pg_temp.sessao(), '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001', 'presente_e_votando')$$,
	'23514', null, 'a chamada só aceita "presente": presente e votando é o mesmo');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$select public.marcar_todas_presentes('00000000-0000-0000-0000-0000000000c1')$$,
	'42501', null, 'delegado não marca a chamada inteira');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.marcar_todas_presentes('00000000-0000-0000-0000-0000000000c1');
select results_eq($$select count(*)::int from public.presenca where sessao_id = pg_temp.sessao()$$, array[5],
	'marcar todas põe as delegações não suspensas');
select results_eq($$select count(*)::int from public.presenca where sessao_id = pg_temp.sessao() and marcada_em is null$$,
	array[0], 'cada presença guarda a hora');

-- Chegada atrasada

delete from public.presenca where sessao_id = pg_temp.sessao() and delegacao_id = '00000000-0000-0000-0000-000000000001';
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$select public.avisar_chegada('00000000-0000-0000-0000-0000000000c1')$$, 'a delegação ausente avisa a chegada');
select lives_ok($$select public.avisar_chegada('00000000-0000-0000-0000-0000000000c1')$$, 'avisar de novo não duplica');
select results_eq($$select count(*)::int from public.aviso_chegada$$, array[1], 'o aviso aparece para o comitê');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a2');
select throws_ok($$select public.avisar_chegada('00000000-0000-0000-0000-0000000000c1')$$,
	'P0001', 'Sua delegação já está presente na chamada.', 'quem já está presente não avisa');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a5');
select results_eq($$select count(*)::int from public.aviso_chegada$$, array[0], 'outro comitê não vê o aviso');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
insert into public.presenca (sessao_id, comite_id, delegacao_id)
values (pg_temp.sessao(), '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001');
select results_eq($$select count(*)::int from public.aviso_chegada$$, array[0], 'confirmar a presença atende o aviso');

-- Abstenção depende só do tipo da votação

select public.abrir_votacao_livre('00000000-0000-0000-0000-0000000000c1', 'Teste substantivo', 'substantiva');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$select public.votar(pg_temp.votacao(), 'abstencao')$$, 'quem está presente se abstém na substantiva');

-- Resumo da sessão

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.encerrar_votacao(pg_temp.votacao());
create temp table resumo as select (select id from public.sessao where comite_id = '00000000-0000-0000-0000-0000000000c1') as sessao;
grant select on resumo to authenticated;
select public.encerrar_sessao('00000000-0000-0000-0000-0000000000c1');
select results_eq(
	$$select (public.resumo_sessao(sessao) ->> 'presentes')::int, jsonb_array_length(public.resumo_sessao(sessao) -> 'votacoes') from resumo$$,
	$$values (5, 1)$$,
	'o resumo conta presentes e votações');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a5');
select results_eq($$select public.resumo_sessao(sessao) from resumo$$, array[null::jsonb], 'outro comitê não lê o resumo');

select * from finish();
rollback;
