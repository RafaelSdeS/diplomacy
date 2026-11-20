-- Passo 19: LGPD e pós-evento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- Cenário: E1 com C1 (d1, d2). a1 secretaria; a2 delegado de d1; a3 press; a4
-- delegado de d2 que também está em E2 (outro evento: a conta fica).
insert into public.evento (id, nome, ano) values
	('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027),
	('00000000-0000-0000-0000-0000000000e2', 'Evento 2', 2028);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'Comitê 1', 'O Comitê 1'),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e2', 'C2', 'Comitê 2', 'O Comitê 2');
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'D1'),
	('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'D2', 'D2'),
	('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000c2', 'D9', 'D9');
insert into public.veiculo (id, comite_id, nome) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'V1');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'a' || n || '@exemplo.test', json_build_object('nome', 'A' || n)
from generate_series(1, 4) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'secretaria', null, null),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'press', '00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2'),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e2', 'delegado', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d9');
insert into public.convite (email, evento_id, papel, comite_id, delegacao_id, nome) values
	('a2@exemplo.test', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', 'A2');
insert into public.checkin (evento_id, email) values ('00000000-0000-0000-0000-0000000000e1', 'a2@exemplo.test');
insert into public.certificado (codigo, evento_id, email, nome, funcao) values
	('CERTA2CODE', '00000000-0000-0000-0000-0000000000e1', 'a2@exemplo.test', 'A2', 'Delegado(a) de D1');
insert into public.noticia (id, veiculo_id, comite_id, autor_id, tipo, titulo, texto) values
	('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1',
		'00000000-0000-0000-0000-0000000000a3', 'reportagem', 'Notícia pública', 'Texto.');
insert into public.nota_crise (id, comite_id, delegacao_id, autor_id, tipo, titulo, texto) values
	('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1',
		'00000000-0000-0000-0000-0000000000a2', 'nota', 'Nota da D1', 'Texto privado.');
insert into public.mensagem (id, comite_id, tipo, de_delegacao_id, para_delegacao_id, autor_id, texto) values
	('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-0000000000c1', 'bilhete',
		'00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000a2', 'Bilhete privado');
insert into public.bloco (id, comite_id, nome) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'B');
insert into public.documento (id, comite_id, bloco_id, tipo, titulo, status, numero) values
	('00000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'projeto', 'Resolução', 'aprovado', 1),
	('00000000-0000-0000-0000-000000000d02', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'working_paper', 'Rascunho', 'rascunho', null);
insert into public.clausula (documento_id, comite_id, tipo, texto, ordem) values
	('00000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-0000000000c1', 'operativa', 'Decide', 1);

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text,
		true
	);
end $$;

-- Registro

update public.nota_crise set status = 'aprovada', resposta = 'Ok.' where id = '00000000-0000-0000-0000-000000000201';
select results_eq(
	$$select acao from public.registro where evento_id = '00000000-0000-0000-0000-0000000000e1' order by acao, em limit 1 offset 4$$,
	array['responder_nota'], 'responder uma nota de crise fica no registro');
select ok(exists (select 1 from public.registro where acao = 'papel_concedido' and alvo = '00000000-0000-0000-0000-0000000000a2'),
	'dar um papel fica no registro');
select pg_temp.entrar(2);
select is_empty($$select 1 from public.registro$$, 'delegados não leem o registro');
select pg_temp.entrar(1);
select isnt_empty($$select 1 from public.registro where evento_id = '00000000-0000-0000-0000-0000000000e1'$$, 'a secretaria lê');

-- Meus dados

select pg_temp.entrar(2);
select is(public.meus_dados() -> 'conta' ->> 'email', 'a2@exemplo.test', 'a pessoa baixa os próprios dados');
select is(jsonb_array_length(public.meus_dados() -> 'notas_de_crise'), 1, 'com as notas que escreveu');
select is(jsonb_array_length(public.meus_dados() -> 'noticias'), 0, 'e nada que outras pessoas escreveram');
select is(public.meus_dados() -> 'credenciais', '[]'::jsonb, 'sem nenhum hash de credencial');

-- Pedido de exclusão

select lives_ok($$select public.pedir_exclusao()$$, 'a pessoa pede a exclusão');
select throws_ok($$select public.pedir_exclusao()$$, '23505', null, 'um pedido aberto por vez');
select throws_ok($$select public.apagar_pessoa('00000000-0000-0000-0000-0000000000a4')$$, '42501', null,
	'só a secretaria apaga contas');

-- Pesquisa

select lives_ok($$select public.responder_pesquisa('00000000-0000-0000-0000-0000000000e1', 'delegado', 5, '{"usaria": "sim"}')$$,
	'a pessoa responde à pesquisa');
select throws_ok($$select public.responder_pesquisa('00000000-0000-0000-0000-0000000000e1', 'delegado', 1, '{}')$$,
	'23505', null, 'uma vez só');

-- Arquivo e modelos

select pg_temp.entrar(1);
select is(
	public.arquivo_publico('00000000-0000-0000-0000-0000000000e1') -> 'comites' -> 0 -> 'resolucoes' -> 0 ->> 'titulo',
	'Resolução', 'o arquivo da edição traz as resoluções aprovadas (e não os rascunhos)');
create temp table copia as select public.copiar_evento('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2028) as id;
select results_eq(
	$$select count(*)::int from public.delegacao d join public.comite c on c.id = d.comite_id
		where c.evento_id = (select id from copia)$$,
	array[2], 'os comitês e as delegações viram modelos da próxima edição');

-- Exclusão no prazo

select ok(public.apagar_dados_pessoais('00000000-0000-0000-0000-0000000000e1') >= 2, 'a exclusão apaga as contas do evento');
reset role;
select is_empty($$select 1 from auth.users where id in ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3')$$,
	'não sobra conta nem e-mail de quem só esteve neste evento');
select isnt_empty($$select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000a4'$$,
	'a conta de quem está em outro evento fica');
select is_empty(
	$$select 1 from public.convite where evento_id = '00000000-0000-0000-0000-0000000000e1'
		union all select 1 from public.mensagem where id = '00000000-0000-0000-0000-000000000301'
		union all select 1 from public.nota_crise where id = '00000000-0000-0000-0000-000000000201'
		union all select 1 from public.documento where id = '00000000-0000-0000-0000-000000000d02'
		union all select 1 from public.certificado where evento_id = '00000000-0000-0000-0000-0000000000e1' and email like '%@%'$$,
	'nem convites, mensagens, notas, rascunhos ou e-mails nos certificados');
select results_eq(
	$$select (select count(*) from public.documento where id = '00000000-0000-0000-0000-000000000d01')::int,
		(select count(*) from public.noticia where id = '00000000-0000-0000-0000-000000000101' and autor_id is null)::int,
		(select count(*) from public.certificado where codigo = 'CERTA2CODE' and nome = 'A2')::int$$,
	$$values (1, 1, 1)$$, 'os documentos públicos e os certificados continuam, sem os autores');

select * from finish();
rollback;
