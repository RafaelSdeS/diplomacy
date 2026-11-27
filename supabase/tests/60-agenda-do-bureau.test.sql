-- Passo 60: a agenda do bureau, oculta até liberada; as delegações propõem alterações e marcam
-- posição; só a mesa inclui (havendo consenso), e a alteração muda a agenda no lugar.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1'),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'C2', 'O Comitê 2');
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'Delegação 1'),
	('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'D2', 'Delegação 2'),
	('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'D3', 'Delegação 3'),
	('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000c2', 'D9', 'Delegação 9');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'pessoa' || n || '@exemplo.test', '{"nome": "Pessoa"}'
from generate_series(1, 6) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2'),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d3'),
	('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d9');

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text, true);
end $$;
update public.comite set topicos = array['T1', 'T2'] where id = '00000000-0000-0000-0000-0000000000c1';
create function pg_temp.base() returns uuid language sql as $$
	select id from public.proposta_agenda where comite_id = '00000000-0000-0000-0000-0000000000c1' and topico = 1 and delegacao_id is null
$$;
create function pg_temp.item(p_texto text) returns uuid language sql as $$
	select id from public.ponto_pauta where texto = p_texto and comite_id = '00000000-0000-0000-0000-0000000000c1'
$$;
create temp table alt (nome text primary key, id uuid);
grant all on alt to authenticated;

select pg_temp.entrar(5);
select public.salvar_proposta_agenda('00000000-0000-0000-0000-0000000000c1', 1,
	'[{"texto": "A", "nivel": 0}, {"texto": "A.1", "nivel": 1}, {"texto": "B", "nivel": 0}, {"texto": "C", "nivel": 0}]'::jsonb);
select pg_temp.entrar(1);
select is((select count(*)::int from public.proposta_agenda where delegacao_id is null), 0, 'antes de liberada, a delegação não vê a agenda do bureau');
select pg_temp.entrar(5);
select public.liberar_agenda(pg_temp.base());
select pg_temp.entrar(1);
select is((select count(*)::int from public.ponto_pauta where proposta_id = pg_temp.base()), 4, 'liberada, vê os itens');

insert into alt values ('incluir', public.propor_alteracao_agenda(pg_temp.base(), 'incluir', null, 'D', pg_temp.item('B')));
insert into alt values ('mover', public.propor_alteracao_agenda(pg_temp.base(), 'mover', pg_temp.item('C'), null, pg_temp.item('A')));
insert into alt values ('alterar', public.propor_alteracao_agenda(pg_temp.base(), 'alterar', pg_temp.item('B'), 'B2'));
insert into alt values ('retirar', public.propor_alteracao_agenda(pg_temp.base(), 'retirar', pg_temp.item('A.1')));

select pg_temp.entrar(3);
select public.marcar_posicao_alteracao((select id from alt where nome = 'incluir'), 'ressalva');
select public.marcar_posicao_alteracao((select id from alt where nome = 'incluir'), 'apoio');
select is((select count(*)::int from public.posicao_alteracao a join alt on alt.id = a.alteracao_id and alt.nome = 'incluir'), 2,
	'uma posição por delegação, que muda (a de quem propôs e a da outra)');
select is((select string_agg(distinct posicao, ',') from public.posicao_alteracao a join public.alteracao_agenda x on x.id = a.alteracao_id and x.delegacao_id = a.delegacao_id),
	'apoio', 'passo 66: quem propõe a alteração já apoia, sem clicar');
select throws_ok($$select public.responder_alteracao_agenda((select id from alt where nome = 'incluir'), true)$$,
	'42501', null, 'a delegação não inclui a alteração');

select pg_temp.entrar(5);
select lives_ok($$select public.responder_alteracao_agenda((select id from alt where nome = 'incluir'), true)$$, 'a mesa inclui');
select public.responder_alteracao_agenda((select id from alt where nome = 'mover'), true);
select public.responder_alteracao_agenda((select id from alt where nome = 'alterar'), true);
select public.responder_alteracao_agenda((select id from alt where nome = 'retirar'), true);
select results_eq($$select texto from public.ponto_pauta where proposta_id = pg_temp.base() order by ordem$$,
	array['A', 'C', 'B2', 'D'], 'incluir, mover, alterar e retirar mudam a agenda no lugar');
select is((select pai_id from public.ponto_pauta where texto = 'C'), null, 'o item movido fica no nível de onde foi');
select throws_ok($$select public.responder_alteracao_agenda((select id from alt where nome = 'incluir'), false)$$,
	'22023', null, 'a alteração respondida não volta');

select * from finish();
rollback;
