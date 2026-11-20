-- Passo 10: DPO e cartas diplomáticas.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- Cenário: C1 com d1..d4; a1..a4 delegados; a5 mesa. Bloco B com d1 e d2.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial, topicos) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1', array['T1', 'T2']);
insert into public.delegacao (id, comite_id, nome, nome_oficial)
select ('00000000-0000-0000-0000-0000000000d' || n)::uuid, '00000000-0000-0000-0000-0000000000c1', 'D' || n, 'Delegação ' || n
from generate_series(1, 4) as n;
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'a' || n || '@exemplo.test', json_build_object('nome', 'A' || n)
from generate_series(1, 5) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, '00000000-0000-0000-0000-0000000000e1', 'delegado',
	'00000000-0000-0000-0000-0000000000c1', ('00000000-0000-0000-0000-0000000000d' || n)::uuid
from generate_series(1, 4) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id) values
	('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1');

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

-- DPO

select pg_temp.entrar(1);
insert into ids values ('dpo', public.salvar_dpo('00000000-0000-0000-0000-0000000000c1', 1,
	'Primeiro parágrafo.' || chr(10) || chr(10) || 'Segundo parágrafo.', array['Resolução 2178 (2014)', '  ', 'Carta da ONU']));
select results_eq($$select referencias from public.dpo$$, $$values (array['Resolução 2178 (2014)', 'Carta da ONU'])$$,
	'referências vazias são descartadas');
select throws_ok($$select public.salvar_dpo('00000000-0000-0000-0000-0000000000c1', 3, 'x', '{}')$$,
	'22023', null, 'o DPO é de um tópico do comitê');
select public.enviar_dpo(pg_temp.id('dpo'));
select throws_ok($$select public.salvar_dpo('00000000-0000-0000-0000-0000000000c1', 1, 'mudança', '{}')$$,
	'P0001', null, 'enviado, o DPO não muda');
select throws_ok($$select public.avaliar_dpo(pg_temp.id('dpo'), 'aprovado')$$,
	'42501', null, 'a delegação não aprova o próprio DPO');

select pg_temp.entrar(2);
select is_empty($$select 1 from public.dpo$$, 'outra delegação não vê o DPO enviado');
select throws_ok($$select public.avaliar_dpo(pg_temp.id('dpo'), 'aprovado')$$,
	'42501', null, 'só a mesa muda a situação de um DPO');

select pg_temp.entrar(5);
select results_eq($$select count(*)::int from public.dpo$$, array[1], 'a mesa vê o DPO');
select throws_ok($$select public.avaliar_dpo(pg_temp.id('dpo'), 'pede_ajustes', '')$$,
	'22023', null, 'pedir ajustes exige um comentário');
select public.avaliar_dpo(pg_temp.id('dpo'), 'pede_ajustes', 'Cite a fonte do segundo parágrafo.');
select pg_temp.entrar(1);
select lives_ok($$select public.salvar_dpo('00000000-0000-0000-0000-0000000000c1', 1, 'Texto ajustado.', array['Carta da ONU'])$$,
	'com pedido de ajuste, o DPO volta a ser editável');
select public.enviar_dpo(pg_temp.id('dpo'));
select pg_temp.entrar(5);
select public.avaliar_dpo(pg_temp.id('dpo'), 'aprovado');

select pg_temp.entrar(2);
select is_empty($$select 1 from public.dpo$$, 'aprovado, o DPO continua fechado enquanto a mesa não abre os DPOs');
reset role;
update public.comite set regras = '{"dpos_publicos": true}' where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.entrar(2);
select results_eq($$select texto from public.dpo$$, array['Texto ajustado.'],
	'com os DPOs abertos pela mesa, as outras delegações leem os aprovados');
select pg_temp.entrar(5);
select public.avaliar_dpo(pg_temp.id('dpo'), 'pede_ajustes', 'Reconsideramos: falta a conclusão.');
select pg_temp.entrar(2);
select is_empty($$select 1 from public.dpo$$, 'a mesa reconsidera um DPO aprovado, que deixa de ficar aberto');

-- Cartas

select pg_temp.entrar(1);
insert into ids values ('bloco', public.criar_bloco('00000000-0000-0000-0000-0000000000c1', 'Bloco B'));
select pg_temp.entrar(2);
select public.entrar_bloco(pg_temp.id('bloco'));
select pg_temp.entrar(3);
select public.enviar_carta('00000000-0000-0000-0000-0000000000c1', 'Proposta de aliança', 'Caros colegas...', false,
	p_blocos_destinatarios => array[pg_temp.id('bloco')]);
select pg_temp.entrar(2);
select results_eq($$select titulo from public.carta$$, array['Proposta de aliança'],
	'a carta privada para um bloco chega a um membro do bloco');
select pg_temp.entrar(4);
select is_empty($$select 1 from public.carta$$, 'e não aparece para quem não é remetente nem destinatário');
select pg_temp.entrar(5);
select is_empty($$select 1 from public.carta$$, 'nem para a mesa');
select pg_temp.entrar(1);
select public.enviar_carta('00000000-0000-0000-0000-0000000000c1', 'Carta aberta', 'A todos...', true,
	p_bloco_remetente => pg_temp.id('bloco'));
select pg_temp.entrar(4);
select results_eq($$select titulo from public.carta$$, array['Carta aberta'], 'a carta pública aparece para o comitê');
select throws_ok(
	$$select public.enviar_carta('00000000-0000-0000-0000-0000000000c1', 'Em nome do bloco', 'x', true, p_bloco_remetente => pg_temp.id('bloco'))$$,
	'42501', null, 'só um membro escreve em nome do bloco');
reset role;

select * from finish();
rollback;
