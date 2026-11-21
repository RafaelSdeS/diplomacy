-- Passo 15 (bônus): notificações Web Push.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Cenário: E1 com C1 (português, d1) e C2 (inglês, d2); E2 com C9 (d9). a1 secretaria
-- de E1; a2 delegado de d1; a3 delegado de d2; a4 delegado de d9 (outro evento).
insert into public.evento (id, nome, ano) values
	('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027),
	('00000000-0000-0000-0000-0000000000e2', 'Evento 2', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial, idioma) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1', 'pt'),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'C2', 'Committee 2', 'en'),
	('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000e2', 'C9', 'C9', 'O Comitê 9', 'pt');
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'D1'),
	('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', 'D2', 'D2'),
	('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000c9', 'D9', 'D9');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'a' || n || '@exemplo.test', json_build_object('nome', 'A' || n)
from generate_series(1, 4) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'secretaria', null, null),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d2'),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e2', 'delegado', '00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000d9');

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text,
		true
	);
end $$;

-- Cada um ativa num aparelho.
create function pg_temp.ativar(n int) returns void language plpgsql as $$
begin
	perform pg_temp.entrar(n);
	perform public.salvar_assinatura_push('https://push.exemplo.test/a' || n, 'chave' || n, 'auth' || n);
end $$;
select pg_temp.ativar(n) from generate_series(1, 4) as n;

-- Aparelhos

select pg_temp.entrar(2);
select results_eq($$select endpoint from public.assinatura_push$$, array['https://push.exemplo.test/a2'],
	'cada pessoa vê só os próprios aparelhos');
select throws_ok($$select public.salvar_assinatura_push('http://inseguro.test/x', 'k', 'a')$$, '23514', null,
	'o endereço do serviço de push é https');
select lives_ok($$select public.remover_assinatura_push('https://push.exemplo.test/a3')$$, 'remover o aparelho de outra pessoa');
reset role;
select isnt_empty($$select 1 from public.assinatura_push where endpoint = 'https://push.exemplo.test/a3'$$,
	'não remove nada');

select pg_temp.entrar(2);
select public.salvar_assinatura_push('https://push.exemplo.test/extra' || n, 'k', 'a') from generate_series(1, 12) as n;
reset role;
select results_eq($$select count(*)::int from public.assinatura_push where pessoa_id = '00000000-0000-0000-0000-0000000000a2'$$,
	array[10], 'até 10 aparelhos por pessoa: os mais antigos saem');
delete from public.assinatura_push where endpoint like 'https://push.exemplo.test/extra%';
select pg_temp.ativar(2);

-- Quem entra num aparelho de outra pessoa passa a receber nele.
select pg_temp.entrar(3);
select public.salvar_assinatura_push('https://push.exemplo.test/compartilhado', 'k', 'a');
select pg_temp.entrar(2);
select public.salvar_assinatura_push('https://push.exemplo.test/compartilhado', 'k', 'a');
reset role;
select results_eq($$select pessoa_id from public.assinatura_push where endpoint = 'https://push.exemplo.test/compartilhado'$$,
	array['00000000-0000-0000-0000-0000000000a2'::uuid], 'o aparelho fica com quem ativou por último');
delete from public.assinatura_push where endpoint = 'https://push.exemplo.test/compartilhado';

-- LGPD: os aparelhos entram em "meus dados".
select pg_temp.entrar(2);
select is(jsonb_array_length(public.meus_dados() -> 'aparelhos_com_notificacao'), 1, 'os aparelhos aparecem em meus dados');

-- Envio: só a Edge Function (service role)

select pg_temp.entrar(1);
select throws_ok($$select * from public.push_a_enviar('aviso', gen_random_uuid())$$, '42501', null,
	'o app não pede os destinatários direto');
select is_empty($$select 1 from public.push_enviado$$, 'nem lê o que já saiu');
insert into public.aviso (id, evento_id, comite_id, texto) values
	('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-0000000000e1', null, 'A plenária começa às 14h.'),
	('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c2', 'Só para o C2.');

reset role;
set local role service_role;
select results_eq(
	$$select endpoint, titulo, corpo, url from public.push_a_enviar('aviso', '00000000-0000-0000-0000-000000000101') order by endpoint$$,
	$$values ('https://push.exemplo.test/a2', 'Aviso da organização', 'A plenária começa às 14h.', '/avisos'),
		('https://push.exemplo.test/a3', 'Notice from the organisers', 'A plenária começa às 14h.', '/avisos')$$,
	'o aviso vai ao evento, no idioma de cada um, menos a quem escreveu e a outros eventos');
select is_empty($$select * from public.push_a_enviar('aviso', '00000000-0000-0000-0000-000000000101')$$,
	'e sai uma vez só');
select results_eq($$select endpoint from public.push_a_enviar('aviso', '00000000-0000-0000-0000-000000000102')$$,
	array['https://push.exemplo.test/a3'], 'o aviso de um comitê vai só a ele');
select throws_ok($$select * from public.push_a_enviar('outro', gen_random_uuid())$$, '22023', null,
	'tipo desconhecido');

-- Resposta da crise
reset role;
insert into public.nota_crise (id, comite_id, delegacao_id, autor_id, tipo, titulo, texto) values
	('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1',
		'00000000-0000-0000-0000-0000000000a2', 'nota', 'Pedido de reforços', 'Texto privado.');
set local role service_role;
select is_empty($$select * from public.push_a_enviar('nota', '00000000-0000-0000-0000-000000000201')$$,
	'a nota sem resposta não notifica');
reset role;
update public.nota_crise set status = 'aprovada', resposta = 'Ok.' where id = '00000000-0000-0000-0000-000000000201';
set local role service_role;
select results_eq(
	$$select endpoint, titulo, corpo, url from public.push_a_enviar('nota', '00000000-0000-0000-0000-000000000201')$$,
	$$values ('https://push.exemplo.test/a2', 'A crise respondeu à sua nota', 'Pedido de reforços', '/comite/C1/crise')$$,
	'respondida, vai só à delegação, com o título e sem a resposta');

-- Aparelhos que o serviço de push esqueceu
select public.esquecer_assinaturas_push(array['https://push.exemplo.test/a4']);
reset role;
select is_empty($$select 1 from public.assinatura_push where endpoint = 'https://push.exemplo.test/a4'$$,
	'os aparelhos que não existem mais saem');

select * from finish();
rollback;
