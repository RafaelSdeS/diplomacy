-- Passo 09: editor de resoluções.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

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

-- Working paper: o redator escreve; os outros propõem

select pg_temp.entrar(1);
insert into ids values ('wp', public.criar_documento(pg_temp.id('bloco'), 'working_paper', 'Financiamento', 1));
select public.adicionar_clausula(pg_temp.id('wp'), 'preambular', 'Recordando a resolução 2178');
select public.adicionar_clausula(pg_temp.id('wp'), 'operativa', 'Pede cooperação');
select public.adicionar_clausula(pg_temp.id('wp'), 'operativa', 'Decide criar um fundo');

select pg_temp.entrar(2);
select throws_ok($$select public.adicionar_clausula(pg_temp.id('wp'), 'operativa', 'Outra')$$,
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

-- Rodadas: até o máximo; depois da última, o documento só vai para a mesa

select pg_temp.entrar(1);
insert into ids values ('rascunho', public.criar_documento(pg_temp.id('bloco'), 'working_paper', 'Rodadas', 1));
select public.adicionar_clausula(pg_temp.id('rascunho'), 'texto', 'Notícia sobre o porto');
select public.abrir_rodada(pg_temp.id('rascunho'), 10);
select throws_ok($$select public.abrir_rodada(pg_temp.id('rascunho'), 10)$$,
	'P0001', 'A rodada atual ainda não terminou.', 'a próxima rodada só abre depois do fim da atual');
reset role;
update public.documento set max_rodadas = 2 where id = pg_temp.id('rascunho');
update public.rodada set fim = now() - interval '1 minute';
select pg_temp.entrar(1);
select public.abrir_rodada(pg_temp.id('rascunho'), 10);
reset role;
update public.rodada set fim = now() - interval '1 minute';
select pg_temp.entrar(1);
select throws_ok($$select public.abrir_rodada(pg_temp.id('rascunho'), 10)$$,
	'P0001', null, 'não abre rodada além de max_rodadas');
select throws_ok($$select public.adicionar_clausula(pg_temp.id('rascunho'), 'texto', 'Mais')$$,
	'P0001', 'As rodadas terminaram: o documento só pode ser enviado à mesa.', 'depois da última rodada, o texto não muda');

-- Envio e aprovação do working paper

select public.enviar_documento(pg_temp.id('wp'));
select throws_ok($$select public.adicionar_clausula(pg_temp.id('wp'), 'operativa', 'Depois do envio')$$,
	'P0001', null, 'documento enviado fica travado');
select pg_temp.entrar(6);
select is_empty($$select 1 from public.documento where id = pg_temp.id('wp')$$, 'enviado, o working paper ainda não aparece ao comitê');
select pg_temp.entrar(8);
select public.aprovar_documento(pg_temp.id('wp'), true);
select pg_temp.entrar(6);
select results_eq($$select count(*)::int from public.clausula where documento_id = pg_temp.id('wp')$$, array[3],
	'aprovado pela mesa, o working paper aparece ao comitê');

-- Observadora escreve working paper, mas não projeto

select pg_temp.entrar(7);
select public.entrar_bloco(pg_temp.id('bloco'));
select lives_ok($$select public.criar_documento(pg_temp.id('bloco'), 'working_paper', 'Da observadora')$$,
	'observadora escreve working paper');
select throws_ok($$select public.criar_documento(pg_temp.id('bloco'), 'projeto', 'Projeto da observadora')$$,
	'P0001', null, 'mas não apresenta projeto');

-- Projeto: fusão, 5 signatários e envio

select pg_temp.entrar(1);
insert into ids values ('projeto', public.criar_documento(pg_temp.id('bloco'), 'projeto', 'Projeto de resolução', 1));
select public.importar_clausulas(pg_temp.id('projeto'),
	array(select id from public.clausula where documento_id = pg_temp.id('wp') and tipo = 'operativa'));
select results_eq(
	$$select o.documento_id from public.clausula c join public.clausula o on o.id = c.origem_id
		where c.documento_id = pg_temp.id('projeto')$$,
	$$values (pg_temp.id('wp')), (pg_temp.id('wp'))$$,
	'na fusão, cada cláusula guarda a origem');
select public.assinar(pg_temp.id('projeto'), true);
select pg_temp.entrar(2); select public.assinar(pg_temp.id('projeto'), true);
select pg_temp.entrar(3); select public.assinar(pg_temp.id('projeto'), true);
select pg_temp.entrar(4); select public.assinar(pg_temp.id('projeto'), true);
select pg_temp.entrar(1);
select throws_ok($$select public.enviar_documento(pg_temp.id('projeto'), 'consenso')$$,
	'P0001', 'O projeto precisa de pelo menos 5 signatários.', 'projeto com menos de 5 signatários não é enviado');
select pg_temp.entrar(5); select public.assinar(pg_temp.id('projeto'), true);
select pg_temp.entrar(1);
select throws_ok($$select public.enviar_documento(pg_temp.id('projeto'))$$,
	'22023', null, 'o projeto escolhe consenso ou votação no envio');
select public.enviar_documento(pg_temp.id('projeto'), 'consenso');
select results_eq($$select status, aprovacao, numero from public.documento where id = pg_temp.id('projeto')$$,
	$$values ('enviado', 'consenso', 1)$$, 'com 5 signatários, o projeto vai à mesa como o projeto 1');
select pg_temp.entrar(8);
select results_eq($$select count(*)::int from public.documento where id = pg_temp.id('projeto')$$, array[1],
	'a mesa vê o projeto enviado');
reset role;

select * from finish();
rollback;
