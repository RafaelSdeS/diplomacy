-- Passo 22: a agenda vem antes das resoluções; retirar e editar a adoção.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Cenário: C1 com 2 tópicos e 2 delegações; a1 delegado de d1, a3 mesa de C1.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial, topicos) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1', array['T1', 'T2']);
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'Delegação 1'),
	('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'D2', 'Delegação 2');
insert into auth.users (id, email, raw_user_meta_data) values
	('00000000-0000-0000-0000-0000000000a1', 'delegado1@exemplo.test', '{"nome": "Delegado 1"}'),
	('00000000-0000-0000-0000-0000000000a3', 'mesa@exemplo.test', '{"nome": "Mesa"}');
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado',
		'00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'mesa',
		'00000000-0000-0000-0000-0000000000c1', null);

create function pg_temp.entrar(p_usuario uuid) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
end $$;
create temp table ids (nome text primary key, id uuid);
grant all on ids to authenticated;
create function pg_temp.id(p_nome text) returns uuid language sql as $$ select id from ids where nome = p_nome $$;
create function pg_temp.item(p_texto text) returns uuid language sql as $$
	select id from public.ponto_pauta where texto = p_texto
$$;

-- Antes da agenda adotada, só working papers

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
insert into ids values ('bloco', public.criar_bloco('00000000-0000-0000-0000-0000000000c1', 'Bloco'));
select throws_ok($$select public.criar_documento(pg_temp.id('bloco'), 'projeto', 'Projeto cedo', 1)$$,
	'P0001', 'Adote a agenda do tópico antes de apresentar um projeto de resolução.', 'sem agenda adotada, não há projeto');
select lives_ok($$select public.criar_documento(pg_temp.id('bloco'), 'working_paper', 'Notas', 1)$$,
	'working paper não depende da agenda');

-- A delegação propõe, a mesa adota

insert into ids values ('proposta', public.salvar_proposta_agenda('00000000-0000-0000-0000-0000000000c1', 1,
	'[{"texto": "A. Causas", "nivel": 0}, {"texto": "A.1 Atores", "nivel": 1}, {"texto": "B. Respostas", "nivel": 0}]'));
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.adotar_proposta(pg_temp.id('proposta'));
select ok(public.agenda_adotada('00000000-0000-0000-0000-0000000000c1', 1), 'a agenda do tópico 1 está adotada');
select ok(not public.agenda_adotada('00000000-0000-0000-0000-0000000000c1', 2), 'a do tópico 2, não');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$select public.criar_documento(pg_temp.id('bloco'), 'projeto', 'Projeto do tópico 1', 1)$$,
	'com a agenda adotada, o projeto entra');
insert into ids values ('wp-b', public.criar_documento(pg_temp.id('bloco'), 'working_paper', 'Sobre B', 1, pg_temp.item('B. Respostas')));

-- Editar a agenda adotada mantém o andamento dos itens de mesmo texto

reset role;
update public.ponto_pauta set status = 'em_debate' where texto = 'A.1 Atores';
insert into ids values ('a1', pg_temp.item('A.1 Atores'));

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
	$$select public.editar_agenda_adotada(pg_temp.id('proposta'), '[{"texto": "X", "nivel": 0}]')$$,
	'42501', null, 'delegado não edita a agenda adotada');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.editar_agenda_adotada(pg_temp.id('proposta'),
	'[{"texto": "A. Causas", "nivel": 0}, {"texto": "A.1 Atores", "nivel": 1}, {"texto": "C. Financiamento", "nivel": 0}]');
select results_eq($$select texto from public.ponto_pauta order by ordem$$,
	array['A. Causas', 'A.1 Atores', 'C. Financiamento'], 'a agenda adotada tem os itens novos, na ordem');
select results_eq($$select status from public.ponto_pauta where id = pg_temp.id('a1')$$, array['em_debate'],
	'o item de mesmo texto continua o mesmo, com o andamento');
select results_eq($$select status from public.ponto_pauta where texto = 'C. Financiamento'$$, array['pendente'],
	'o item novo entra pendente');
reset role; -- a mesa não vê rascunhos
select results_eq($$select ponto_pauta_id from public.documento where id = pg_temp.id('wp-b')$$, array[null::uuid],
	'o working paper do item que saiu fica sem item');

-- Retirar a adoção

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$select public.retirar_adocao(pg_temp.id('proposta'))$$, '42501', null, 'delegado não retira a adoção');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.retirar_adocao(pg_temp.id('proposta'));
select ok(not public.agenda_adotada('00000000-0000-0000-0000-0000000000c1', 1), 'a mesa retira a adoção');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$select public.criar_documento(pg_temp.id('bloco'), 'projeto', 'Outro projeto', 1)$$,
	'P0001', null, 'sem adoção, novo projeto volta a ser recusado');
select lives_ok($$select public.criar_documento(pg_temp.id('bloco'), 'projeto', 'Sem tópico')$$,
	'projeto sem tópico (só pela API) fica sem a regra');

select * from finish();
rollback;
