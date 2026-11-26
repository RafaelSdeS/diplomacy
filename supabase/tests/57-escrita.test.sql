-- Passo 57 (parte A): posição num toque, comentário curto com a mesa, resolver e a ordem
-- das cláusulas (inserir no meio, mover sem passar do tipo).
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- Cenário (o do passo 09): d1 é redator, d2 está no bloco, d6 não; a8 é a mesa.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial, topicos) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1', array['T1', 'T2']);
insert into public.delegacao (id, comite_id, nome, nome_oficial, situacao)
select ('00000000-0000-0000-0000-0000000000d' || n)::uuid, '00000000-0000-0000-0000-0000000000c1', 'D' || n, 'Delegação ' || n,
	(case when n = 7 then 'observadora' else 'membro' end)::public.situacao_delegacao
from generate_series(1, 7) as n;
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'a' || n || '@exemplo.test', json_build_object('nome', 'A' || n)
from generate_series(1, 8) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, '00000000-0000-0000-0000-0000000000e1', 'delegado',
	'00000000-0000-0000-0000-0000000000c1', ('00000000-0000-0000-0000-0000000000d' || n)::uuid
from generate_series(1, 7) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id) values
	('00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1');

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
create function pg_temp.clausula(p_texto text) returns uuid language sql as $$
	select id from public.clausula where texto = p_texto order by atualizado_em desc limit 1
$$;


select pg_temp.entrar(1);
insert into ids values ('bloco', public.criar_bloco('00000000-0000-0000-0000-0000000000c1', 'Bloco'));
select pg_temp.entrar(2); select public.entrar_bloco(pg_temp.id('bloco'));
select pg_temp.entrar(1);
-- Passo 63: o editor do bloco fica para a resolução de crise.
insert into ids values ('doc', public.criar_documento(pg_temp.id('bloco'), 'resolucao_crise', 'Água'));
insert into ids values ('p1', public.adicionar_clausula(pg_temp.id('doc'), 'preambular', 'Recordando A'));
insert into ids values ('o1', public.adicionar_clausula(pg_temp.id('doc'), 'operativa', 'Decide B'));
insert into ids values ('o2', public.adicionar_clausula(pg_temp.id('doc'), 'operativa', 'Pede C'));

-- Inserir no meio e mover
insert into ids values ('o15', public.adicionar_clausula(pg_temp.id('doc'), 'operativa', 'Insta B2', null, pg_temp.id('o1')));
select results_eq($$select texto from public.clausula where documento_id = pg_temp.id('doc') order by ordem$$,
	array['Recordando A', 'Decide B', 'Insta B2', 'Pede C'], 'a operativa nova entra depois da escolhida');
select public.mover_clausula(pg_temp.id('o1'), true);
select results_eq($$select texto from public.clausula where documento_id = pg_temp.id('doc') order by ordem$$,
	array['Recordando A', 'Decide B', 'Insta B2', 'Pede C'], 'a primeira operativa não sobe acima da preambular');
select public.mover_clausula(pg_temp.id('o2'), true);
select results_eq($$select texto from public.clausula where documento_id = pg_temp.id('doc') order by ordem$$,
	array['Recordando A', 'Decide B', 'Pede C', 'Insta B2'], 'entre operativas, troca de lugar');

-- Posição: membros do bloco, uma por delegação, que muda
select pg_temp.entrar(2);
select lives_ok($$select public.marcar_posicao(pg_temp.id('o1'), 'ressalva')$$, 'o membro marca ressalva');
select lives_ok($$select public.marcar_posicao(pg_temp.id('o1'), 'apoio')$$, 'e muda para apoio');
select results_eq($$select count(*)::int from public.posicao_clausula where clausula_id = pg_temp.id('o1')$$, array[1], 'uma posição por delegação');
select pg_temp.entrar(6);
select throws_ok($$select public.marcar_posicao(pg_temp.id('o1'), 'contra')$$, '42501', null, 'quem não é do bloco não marca');
select throws_ok($$select public.comentar(pg_temp.id('o1'), 'Fora do bloco')$$, '42501', null, 'nem comenta');

-- Comentário curto e resolver
select pg_temp.entrar(2);
select throws_ok($$select public.comentar(pg_temp.id('o1'), repeat('x', 281))$$, '22023', null, 'comentário novo até 280 caracteres');
select public.comentar(pg_temp.id('o1'), 'Falta o prazo');
select throws_ok($$select public.resolver_comentario((select id from public.comentario where texto = 'Falta o prazo'), true)$$,
	'42501', null, 'só o redator resolve');
select pg_temp.entrar(1);
select lives_ok($$select public.resolver_comentario((select id from public.comentario where texto = 'Falta o prazo'), true)$$, 'o redator resolve');

-- A mesa: depois do envio, ela vê, comenta e marca posição (como "Mesa"). O bloco tem 2
-- membros: o mínimo de assinaturas do comitê fica em 2.
reset role;
update public.comite set regras = '{"assinaturas_projeto_min": 2}' where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.entrar(n), public.assinar(pg_temp.id('doc'), true) from generate_series(1, 2) as n;
select pg_temp.entrar(1);
select public.enviar_documento(pg_temp.id('doc'), 'votacao');
select pg_temp.entrar(8);
select lives_ok($$select public.comentar(pg_temp.id('o1'), 'Ajuste a forma do verbo')$$, 'a mesa comenta o documento enviado');
select lives_ok($$select public.marcar_posicao(pg_temp.id('o1'), 'ressalva')$$, 'e marca a posição da mesa');

select * from finish();
rollback;
