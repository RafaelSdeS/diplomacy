-- Passo 35: crise com prazo; a atingida fica sem voz, mas negocia por notas de crise.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- Cenário: C1 em sessão, com d1 (a1, a atingida) e d2 (a2); a3 é a crise de C1, a4 a mesa; C2 é de outro comitê (a5).
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial, crise_ligada) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1', true),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'C2', 'O Comitê 2', true);
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'Delegação 1'),
	('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'D2', 'Delegação 2'),
	('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000c2', 'D9', 'Delegação 9');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'pessoa' || n || '@exemplo.test', '{"nome": "Pessoa"}'
from generate_series(1, 5) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'crise', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d9');

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text, true);
end $$;
create temp table ids (nome text primary key, id uuid);
grant all on ids to authenticated;

select pg_temp.entrar(4);
select public.abrir_sessao('00000000-0000-0000-0000-0000000000c1');
insert into public.presenca (sessao_id, comite_id, delegacao_id)
select public.sessao_atual('00000000-0000-0000-0000-0000000000c1'), '00000000-0000-0000-0000-0000000000c1', d
from unnest(array['00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2']::uuid[]) as d;

select pg_temp.entrar(1);
select throws_ok($$select public.lancar_incidente(array['00000000-0000-0000-0000-0000000000c1']::uuid[], 'X', 'Y', 10)$$,
	'42501', null, 'delegado não lança crise');

select pg_temp.entrar(3);
insert into ids values ('crise', public.lancar_incidente(array['00000000-0000-0000-0000-0000000000c1']::uuid[],
	'Rebeldes do Sahel', 'O delegado de D1 foi assassinado.', 20,
	'[{"delegacao_id": "00000000-0000-0000-0000-0000000000d1", "texto": "Delegado assassinado"}]'));
select ok(public.delegacao_sem_voz('00000000-0000-0000-0000-0000000000d1'), 'a delegação atingida fica sem voz');

select pg_temp.entrar(1);
select throws_ok($$select public.levantar_placa('00000000-0000-0000-0000-0000000000c1')$$,
	'P0001', 'Sua delegação está impedida pela crise.', 'sem placa');
select throws_ok($$select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'ponto_duvida')$$,
	'P0001', 'Sua delegação está impedida pela crise.', 'sem pontos e moções');
select lives_ok($$select public.enviar_nota(gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', 'nota', 'Negociação', 'Propomos conversar.')$$,
	'mas negocia por nota de crise');
select results_eq($$select count(*)::int from public.incidente_crise$$, array[1], 'o comitê vê a crise');

select pg_temp.entrar(2);
select lives_ok($$select public.levantar_placa('00000000-0000-0000-0000-0000000000c1')$$, 'as outras delegações seguem normais');

select pg_temp.entrar(4);
select public.abrir_votacao_livre('00000000-0000-0000-0000-0000000000c1', 'Teste');
select throws_ok(
	$$select public.registrar_voto((select id from public.votacao where aberta and comite_id = '00000000-0000-0000-0000-0000000000c1'), '00000000-0000-0000-0000-0000000000d1', 'a_favor')$$,
	'P0001', 'Sua delegação está impedida pela crise.', 'sem voto, nem pela mesa');

select pg_temp.entrar(5);
select results_eq($$select count(*)::int from public.incidente_crise$$, array[0], 'outro comitê não vê a crise');

-- Fim da crise: o desfecho vira atualização e a voz volta

select pg_temp.entrar(3);
select public.encerrar_incidente((select id from ids where nome = 'crise'), 'resolvido', 'Acordo com os rebeldes.');
select ok(not public.delegacao_sem_voz('00000000-0000-0000-0000-0000000000d1'), 'encerrada a crise, a voz volta');
select results_eq(
	$$select texto from public.atualizacao_crise a join public.atualizacao_comite c on c.atualizacao_id = a.id
		where c.comite_id = '00000000-0000-0000-0000-0000000000c1'$$,
	array['Rebeldes do Sahel: resolvida. Acordo com os rebeldes.'], 'o desfecho vira atualização de crise');

-- Notificação: todos do comitê com o aparelho inscrito, uma vez só
reset role;
insert into public.assinatura_push (endpoint, pessoa_id, p256dh, auth) values
	('https://push.exemplo.test/1', '00000000-0000-0000-0000-0000000000a2', 'x', 'y'),
	('https://push.exemplo.test/5', '00000000-0000-0000-0000-0000000000a5', 'x', 'y');
select results_eq($$select titulo from public.push_a_enviar('crise', (select id from ids where nome = 'crise'))$$,
	array['Crise: Rebeldes do Sahel'], 'a notificação vai a quem está no comitê');
select is((select count(*)::int from public.push_a_enviar('crise', (select id from ids where nome = 'crise'))), 0, 'e sai uma vez só');

select * from finish();
rollback;
