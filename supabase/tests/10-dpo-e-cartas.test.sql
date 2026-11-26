-- Passo 10: DPO e cartas diplomáticas.
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

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

-- DPO (passo 53): um PDF por tópico, aberto ao comitê assim que chega. a6 é de outro comitê.

insert into public.comite (id, evento_id, sigla, nome, nome_oficial, topicos) values
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'C2', 'O Comitê 2', array['T1']);
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000c2', 'D9', 'Delegação 9');
insert into auth.users (id, email, raw_user_meta_data) values
	('00000000-0000-0000-0000-0000000000a6', 'a6@exemplo.test', '{"nome": "A6"}');
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000e1', 'delegado',
	'00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d9');

select pg_temp.entrar(1);
select throws_ok($$select public.enviar_dpo('00000000-0000-0000-0000-0000000000c1', 1)$$,
	'22023', null, 'sem o PDF no Storage, não há envio');
select throws_ok($$insert into storage.objects (bucket_id, name) values
	('dpos', '00000000-0000-0000-0000-0000000000c1/00000000-0000-0000-0000-0000000000d2/1.pdf')$$,
	'42501', null, 'a delegação não sobe arquivo na pasta de outra');
insert into storage.objects (bucket_id, name) values
	('dpos', '00000000-0000-0000-0000-0000000000c1/00000000-0000-0000-0000-0000000000d1/1.pdf');
select throws_ok($$select public.enviar_dpo('00000000-0000-0000-0000-0000000000c1', 3)$$,
	'22023', null, 'o DPO é de um tópico do comitê');
insert into ids values ('dpo', public.enviar_dpo('00000000-0000-0000-0000-0000000000c1', 1));
select results_eq($$select arquivo, status, cardinality(envios) from public.dpo$$,
	$$values ('00000000-0000-0000-0000-0000000000c1/00000000-0000-0000-0000-0000000000d1/1.pdf', 'enviado', 1)$$,
	'o envio aponta para o arquivo');
select public.enviar_dpo('00000000-0000-0000-0000-0000000000c1', 1);
select results_eq($$select cardinality(envios) from public.dpo$$, array[2], 'enviar de novo troca o arquivo e guarda a data');

select pg_temp.entrar(2);
select results_eq($$select count(*)::int from public.dpo$$, array[1], 'outra delegação do comitê lê o DPO enviado, sem aprovação');
select isnt_empty($$select 1 from storage.objects where bucket_id = 'dpos'$$, 'e lê o arquivo');
select throws_ok($$select public.comentar_dpo(pg_temp.id('dpo'), 'x')$$, '42501', null, 'só a mesa comenta');

select pg_temp.entrar(6);
select is_empty($$select 1 from public.dpo$$, 'quem é de outro comitê não lê o DPO');
select is_empty($$select 1 from storage.objects where bucket_id = 'dpos'$$, 'nem o arquivo');

select pg_temp.entrar(5);
select public.comentar_dpo(pg_temp.id('dpo'), 'Cite as fontes.');
select pg_temp.entrar(2);
select is_empty($$select 1 from public.dpo_comentario$$, 'o comentário da mesa é só para a delegação');
select pg_temp.entrar(1);
select results_eq($$select texto from public.dpo_comentario$$, array['Cite as fontes.'], 'a delegação lê o comentário');

select pg_temp.entrar(5);
select throws_ok($$select public.retirar_dpo(pg_temp.id('dpo'), ' ')$$, '22023', null, 'retirar exige o motivo');
select results_eq($$select public.retirar_dpo(pg_temp.id('dpo'), 'Arquivo de outro comitê.')$$,
	array['00000000-0000-0000-0000-0000000000c1/00000000-0000-0000-0000-0000000000d1/1.pdf'], 'a mesa retira o arquivo indevido');
reset role;
select results_eq($$select acao from public.registro where alvo = pg_temp.id('dpo')$$, array['retirar_dpo'], 'a retirada fica no registro');
select pg_temp.entrar(2);
select is_empty($$select 1 from public.dpo$$, 'retirado, o DPO sai do comitê');
select is_empty($$select 1 from storage.objects where bucket_id = 'dpos'$$, 'e o arquivo também, mesmo antes de ser apagado');
select pg_temp.entrar(1);
select public.enviar_dpo('00000000-0000-0000-0000-0000000000c1', 1);
select is_empty($$select 1 from public.dpo_comentario$$, 'enviar de novo responde ao comentário da mesa, que sai');

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
