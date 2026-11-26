-- Passo 09: editor de resoluções. Desde o passo 63, o editor do bloco serve à resolução de crise;
-- o working paper e o projeto são da sala (63-working-paper-da-sala), e os documentos antigos
-- dos blocos ficaram só para leitura.
begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

-- Cenário: C1 com 6 membros (d1..d6) e uma observadora (d7). a1..a7 são os
-- delegados de d1..d7; a8 é da mesa. O bloco terá d1 (redator) a d5.
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

-- Bloco, redator e membros

select pg_temp.entrar(1);
insert into ids values ('bloco', public.criar_bloco('00000000-0000-0000-0000-0000000000c1', 'Bloco do Sul'));
select ok(public.sou_redator(pg_temp.id('bloco')), 'quem cria o bloco é o redator');
select pg_temp.entrar(2); select public.entrar_bloco(pg_temp.id('bloco'));
select pg_temp.entrar(3); select public.entrar_bloco(pg_temp.id('bloco'));
select pg_temp.entrar(4); select public.entrar_bloco(pg_temp.id('bloco'));
select pg_temp.entrar(5); select public.entrar_bloco(pg_temp.id('bloco'));
select results_eq($$select count(*)::int from public.bloco_membro$$, array[5], 'cinco delegações no bloco');

-- Resolução de crise: o redator escreve; os outros propõem

select pg_temp.entrar(1);
insert into ids values ('res', public.criar_documento(pg_temp.id('bloco'), 'resolucao_crise', 'Financiamento'));
select public.adicionar_clausula(pg_temp.id('res'), 'preambular', 'Recordando a resolução 2178');
select public.adicionar_clausula(pg_temp.id('res'), 'operativa', 'Pede cooperação');
select public.adicionar_clausula(pg_temp.id('res'), 'operativa', 'Decide criar um fundo');

select pg_temp.entrar(2);
select throws_ok($$select public.adicionar_clausula(pg_temp.id('res'), 'operativa', 'Outra')$$,
	'42501', null, 'quem não é redator não acrescenta cláusulas');
select throws_ok($$select public.editar_clausula(pg_temp.clausula('Pede cooperação'), 'Exige', 1)$$,
	'42501', null, 'quem não é redator não altera o texto');
select lives_ok($$select public.propor_alteracao(pg_temp.clausula('Pede cooperação'), 'Pede cooperação internacional')$$,
	'mas propõe uma alteração');
select lives_ok($$select public.comentar(pg_temp.clausula('Pede cooperação'), 'Falta dizer quem coopera.')$$,
	'e comenta a cláusula');

select pg_temp.entrar(1);
select public.responder_proposta((select id from public.proposta_alteracao), true);
select results_eq($$select texto, versao from public.clausula where id = pg_temp.clausula('Pede cooperação internacional')$$,
	$$values ('Pede cooperação internacional', 2)$$, 'o redator aceita a proposta, e o texto muda');
select throws_ok(
	$$select public.editar_clausula(pg_temp.clausula('Pede cooperação internacional'), 'Pede ajuda', 1)$$,
	'40001', null, 'conflito de versão: quem editava a versão 1 não sobrescreve a 2');
select is(public.editar_clausula(pg_temp.clausula('Pede cooperação internacional'), 'Pede cooperação internacional ampla', 2),
	3, 'com a versão certa, a edição passa');

-- Quem não é do bloco não vê o rascunho

select pg_temp.entrar(6);
select is_empty($$select 1 from public.documento$$, 'quem não é do bloco não vê o rascunho');
select is_empty($$select 1 from public.clausula$$, 'nem as cláusulas dele');
select pg_temp.entrar(8);
select is_empty($$select 1 from public.documento$$, 'a mesa não vê rascunhos');

-- Cláusula acordada

select pg_temp.entrar(1);
select public.marcar_clausula(pg_temp.clausula('Decide criar um fundo'), 'acordada');
select throws_ok($$select public.editar_clausula(pg_temp.clausula('Decide criar um fundo'), 'Decide', 1)$$,
	'P0001', null, 'cláusula acordada não muda');
select throws_ok($$select public.marcar_clausula(pg_temp.clausula('Decide criar um fundo'), 'em_discussao')$$,
	'P0001', null, 'nem o redator reabre sozinho');
select pg_temp.entrar(2);
select throws_ok($$select public.propor_alteracao(pg_temp.clausula('Decide criar um fundo'), 'Decide')$$,
	'P0001', null, 'cláusula acordada não recebe propostas');
select public.pedir_reabertura(pg_temp.clausula('Decide criar um fundo'));
select pg_temp.entrar(3); select public.pedir_reabertura(pg_temp.clausula('Decide criar um fundo'));
select results_eq($$select status from public.clausula where texto = 'Decide criar um fundo'$$, array['acordada'],
	'com 2 pedidos, continua acordada');
select pg_temp.entrar(4); select public.pedir_reabertura(pg_temp.clausula('Decide criar um fundo'));
select results_eq($$select status from public.clausula where texto = 'Decide criar um fundo'$$, array['em_discussao'],
	'com 3 pedidos (o mínimo das regras), volta à discussão');

-- Os documentos antigos dos blocos ficaram só para leitura (passo 63)

reset role;
insert into public.documento (id, comite_id, bloco_id, tipo, titulo) values
	('00000000-0000-0000-0000-000000000d0a', '00000000-0000-0000-0000-0000000000c1', pg_temp.id('bloco'), 'working_paper', 'Antigo');
insert into public.clausula (documento_id, comite_id, tipo, ordem, texto) values
	('00000000-0000-0000-0000-000000000d0a', '00000000-0000-0000-0000-0000000000c1', 'operativa', 1, 'Antiga');
select pg_temp.entrar(1);
select throws_ok($$select public.adicionar_clausula('00000000-0000-0000-0000-000000000d0a', 'operativa', 'Mais')$$,
	'22023', 'Os documentos dos blocos ficaram só para leitura: o trabalho agora é no working paper da sala.',
	'o working paper antigo do bloco não muda');
select throws_ok($$select public.enviar_documento('00000000-0000-0000-0000-000000000d0a', 'consenso')$$,
	'22023', null, 'nem vai à mesa');
select pg_temp.entrar(2);
select throws_ok($$select public.propor_alteracao(pg_temp.clausula('Antiga'), 'Nova')$$, '22023', null, 'nem recebe propostas');

-- Envio e aprovação da resolução de crise: 5 signatários e consenso ou votação

select pg_temp.entrar(1); select public.assinar(pg_temp.id('res'), true);
select pg_temp.entrar(2); select public.assinar(pg_temp.id('res'), true);
select pg_temp.entrar(3); select public.assinar(pg_temp.id('res'), true);
select pg_temp.entrar(4); select public.assinar(pg_temp.id('res'), true);
select pg_temp.entrar(1);
select throws_ok($$select public.enviar_documento(pg_temp.id('res'), 'consenso')$$,
	'P0001', 'O projeto precisa de pelo menos 5 signatários.', 'com menos de 5 signatários, não vai à mesa');
select pg_temp.entrar(5); select public.assinar(pg_temp.id('res'), true);
select pg_temp.entrar(1);
select throws_ok($$select public.enviar_documento(pg_temp.id('res'))$$,
	'22023', null, 'escolhe consenso ou votação no envio');
select public.enviar_documento(pg_temp.id('res'), 'consenso');
select results_eq($$select status, aprovacao, numero from public.documento where id = pg_temp.id('res')$$,
	$$values ('enviado', 'consenso', 1)$$, 'com 5 signatários, vai à mesa com número');
select throws_ok($$select public.adicionar_clausula(pg_temp.id('res'), 'operativa', 'Depois do envio')$$,
	'P0001', null, 'documento enviado fica travado');
select pg_temp.entrar(6);
select is_empty($$select 1 from public.documento where id = pg_temp.id('res')$$, 'enviado, ainda não aparece ao comitê');
select pg_temp.entrar(8);
select results_eq($$select count(*)::int from public.documento where id = pg_temp.id('res')$$, array[1], 'a mesa vê o enviado');
select public.aprovar_documento(pg_temp.id('res'), true);
select pg_temp.entrar(6);
select results_eq($$select count(*)::int from public.clausula where documento_id = pg_temp.id('res')$$, array[3],
	'aprovada pela mesa, aparece ao comitê');

-- O bloco não cria working paper nem projeto; a observadora não apresenta resolução de crise

select pg_temp.entrar(1);
select throws_ok($$select public.criar_documento(pg_temp.id('bloco'), 'working_paper', 'Notas')$$,
	'22023', null, 'o bloco não cria working paper (é da sala)');
select pg_temp.entrar(7);
select public.entrar_bloco(pg_temp.id('bloco'));
select throws_ok($$select public.criar_documento(pg_temp.id('bloco'), 'resolucao_crise', 'Da observadora')$$,
	'P0001', 'Delegação observadora não apresenta resolução de crise.', 'a observadora não apresenta resolução de crise');

select * from finish();
rollback;
