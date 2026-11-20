-- Passo 12: votação de projeto de resolução no piloto.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- Cenário: C1 com 6 membros (d1..d6); a1..a6 delegados; a7 mesa. Bloco de d1 a d5.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial, topicos) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1', array['T1', 'T2']);
insert into public.delegacao (id, comite_id, nome, nome_oficial)
select ('00000000-0000-0000-0000-0000000000d' || n)::uuid, '00000000-0000-0000-0000-0000000000c1', 'D' || n, 'Delegação ' || n
from generate_series(1, 6) as n;
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'a' || n || '@exemplo.test', json_build_object('nome', 'A' || n)
from generate_series(1, 7) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, '00000000-0000-0000-0000-0000000000e1', 'delegado',
	'00000000-0000-0000-0000-0000000000c1', ('00000000-0000-0000-0000-0000000000d' || n)::uuid
from generate_series(1, 6) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id) values
	('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1');

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text,
		true
	);
end $$;
create temp table ids (nome text primary key, id uuid);
grant all on ids to authenticated;
create function pg_temp.id(p_nome text) returns uuid language sql as $$ select id from ids where nome = p_nome $$;

-- Um projeto com 5 signatários, enviado e aprovado pela mesa.
create function pg_temp.projeto(p_nome text, p_topico int default 1) returns void language plpgsql as $$
begin
	perform pg_temp.entrar(1);
	insert into ids values (p_nome, public.criar_documento(pg_temp.id('bloco'), 'projeto', p_nome, p_topico));
	perform public.adicionar_clausula(pg_temp.id(p_nome), 'operativa', 'Decide');
	for n in 1..5 loop
		perform pg_temp.entrar(n);
		perform public.assinar(pg_temp.id(p_nome), true);
	end loop;
	perform pg_temp.entrar(1);
	perform public.enviar_documento(pg_temp.id(p_nome), 'votacao');
	perform pg_temp.entrar(7);
	perform public.aprovar_documento(pg_temp.id(p_nome), true);
end $$;

select pg_temp.entrar(1);
insert into ids values ('bloco', public.criar_bloco('00000000-0000-0000-0000-0000000000c1', 'Bloco'));
select pg_temp.entrar(2); select public.entrar_bloco(pg_temp.id('bloco'));
select pg_temp.entrar(3); select public.entrar_bloco(pg_temp.id('bloco'));
select pg_temp.entrar(4); select public.entrar_bloco(pg_temp.id('bloco'));
select pg_temp.entrar(5); select public.entrar_bloco(pg_temp.id('bloco'));
select pg_temp.projeto('P1');
select isnt((select enviado_em from public.documento where id = pg_temp.id('P1')), null, 'o projeto guarda quando foi enviado');

-- Sessão aberta, com as 6 delegações presentes.
select pg_temp.entrar(7);
select public.abrir_sessao('00000000-0000-0000-0000-0000000000c1');
reset role;
insert into public.presenca (sessao_id, comite_id, delegacao_id)
select public.sessao_atual('00000000-0000-0000-0000-0000000000c1'), '00000000-0000-0000-0000-0000000000c1', id
from public.delegacao where comite_id = '00000000-0000-0000-0000-0000000000c1';

select pg_temp.entrar(1);
select throws_ok($$select public.abrir_votacao_projeto(pg_temp.id('P1'))$$, '42501', null, 'delegados não abrem a votação do projeto');

select pg_temp.entrar(7);
insert into ids values ('v1', public.abrir_votacao_projeto(pg_temp.id('P1')));
select results_eq($$select status from public.documento where id = pg_temp.id('P1')$$, array['em_votacao'], 'o projeto entra em votação');
select results_eq($$select tipo, objeto from public.votacao where id = pg_temp.id('v1')$$,
	$$values ('substantiva', 'Projeto de resolução 1: P1')$$, 'a votação é substantiva e tem o nome do projeto');
select throws_ok($$select public.abrir_votacao_projeto(pg_temp.id('P1'))$$, '23505', null, 'o mesmo projeto não vai a voto duas vezes');

select pg_temp.entrar(1); select public.votar(pg_temp.id('v1'), 'a_favor');
select pg_temp.entrar(2); select public.votar(pg_temp.id('v1'), 'a_favor');
select pg_temp.entrar(3); select public.votar(pg_temp.id('v1'), 'a_favor');
select pg_temp.entrar(4); select public.votar(pg_temp.id('v1'), 'a_favor');
select pg_temp.entrar(5); select public.votar(pg_temp.id('v1'), 'contra');
select pg_temp.entrar(7);
select public.encerrar_votacao(pg_temp.id('v1'));
select results_eq($$select status from public.documento where id = pg_temp.id('P1')$$, array['aprovado'],
	'aprovado na votação, o projeto vira resolução');

-- Sessão encerrada no meio da votação: o projeto volta a esperar a mesa.
select pg_temp.projeto('P2', 2);
select pg_temp.entrar(7);
select public.abrir_votacao_projeto(pg_temp.id('P2'));
select public.encerrar_sessao('00000000-0000-0000-0000-0000000000c1');
select results_eq($$select status from public.documento where id = pg_temp.id('P2')$$, array['aprovado_mesa'],
	'sem resultado, o projeto volta a esperar a mesa');

-- Consenso
select pg_temp.entrar(1);
select throws_ok($$select public.aprovar_por_consenso(pg_temp.id('P2'))$$, '42501', null, 'só a mesa declara o consenso');
select pg_temp.entrar(7);
select public.aprovar_por_consenso(pg_temp.id('P2'));
select results_eq($$select status from public.documento where id = pg_temp.id('P2')$$, array['aprovado'],
	'sem oposição, a mesa aprova por consenso');
select pg_temp.entrar(6);
select results_eq($$select count(*)::int from public.documento where status = 'aprovado'$$, array[2],
	'as resoluções aprovadas aparecem ao comitê');
reset role;

select * from finish();
rollback;
