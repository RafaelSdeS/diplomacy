-- Passo 17: mensagens, entrevistas, coletiva e a Diretoria da Press.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

-- Cenário: C1 com d1, d2, d3 e o veículo V1. a1, a2, a3 delegados; a4 mesa; a5 crise;
-- a6 press de C1; a7 Diretoria da Press do evento.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1');
insert into public.delegacao (id, comite_id, nome, nome_oficial)
select ('00000000-0000-0000-0000-0000000000d' || n)::uuid, '00000000-0000-0000-0000-0000000000c1', 'D' || n, 'D' || n
from generate_series(1, 3) n;
insert into public.veiculo (id, comite_id, nome) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'V1');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'a' || n || '@exemplo.test', json_build_object('nome', 'A' || n)
from generate_series(1, 7) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, '00000000-0000-0000-0000-0000000000e1', 'delegado',
	'00000000-0000-0000-0000-0000000000c1', ('00000000-0000-0000-0000-0000000000d' || n)::uuid
from generate_series(1, 3) n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id) values
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1'),
	('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000e1', 'crise', '00000000-0000-0000-0000-0000000000c1'),
	('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000e1', 'press', '00000000-0000-0000-0000-0000000000c1'),
	('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000e1', 'diretoria_press', null);

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text,
		true
	);
end $$;
create function pg_temp.vejo(p_tipo text) returns int language sql as $$
	select count(*)::int from public.mensagem where tipo = p_tipo
$$;

-- Bilhetes

select pg_temp.entrar(1);
select public.enviar_mensagem('00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-0000000000c1', 'bilhete',
	'Apoio ao seu projeto?', '00000000-0000-0000-0000-0000000000d2');
select public.enviar_mensagem('00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-0000000000c1', 'bilhete',
	'Apoio ao seu projeto?', '00000000-0000-0000-0000-0000000000d2');
select is(pg_temp.vejo('bilhete'), 1, 'o bilhete reenviado não duplica, e quem escreveu o vê');
select pg_temp.entrar(2);
select is(pg_temp.vejo('bilhete'), 1, 'a delegação destinatária vê o bilhete');
select pg_temp.entrar(3);
select is(pg_temp.vejo('bilhete'), 0, 'outra delegação não vê');
select pg_temp.entrar(4);
select is(pg_temp.vejo('bilhete'), 0, 'com a leitura desligada, a mesa não lê');
select public.definir_bilhetes('00000000-0000-0000-0000-0000000000c1', true, false);
select is(pg_temp.vejo('bilhete'), 1, 'com a leitura ligada, a mesa lê');
reset role;
select results_eq($$select acao from public.registro where evento_id = '00000000-0000-0000-0000-0000000000e1' and acao <> 'papel_concedido'$$, array['regra_bilhetes'], 'a mudança da regra fica no registro');
select pg_temp.entrar(4);
select public.definir_bilhetes('00000000-0000-0000-0000-0000000000c1', false, true);
select pg_temp.entrar(1);
select throws_ok(
	$$select public.enviar_mensagem(gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', 'bilhete', 'Oi', '00000000-0000-0000-0000-0000000000d2')$$,
	'P0001', 'A mesa bloqueou os bilhetes neste comitê.', 'com os bilhetes bloqueados, ninguém envia');

-- Canal interno e conversa com a mesa

select pg_temp.entrar(5);
select public.enviar_mensagem(gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', 'interno', 'Atualização às 15h?');
select pg_temp.entrar(4);
select is(pg_temp.vejo('interno'), 1, 'a mesa lê o canal interno da crise');
select pg_temp.entrar(1);
select is(pg_temp.vejo('interno'), 0, 'o canal interno não aparece para delegados');
select throws_ok($$select public.enviar_mensagem(gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', 'interno', 'x')$$,
	'42501', null, 'nem eles escrevem nele');
select public.enviar_mensagem(gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', 'mesa', 'Posso sair às 16h?');
select pg_temp.entrar(4);
select public.enviar_mensagem(gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', 'mesa', 'Pode.', '00000000-0000-0000-0000-0000000000d1');
select pg_temp.entrar(1);
select is(pg_temp.vejo('mesa'), 2, 'a delegação vê a conversa com a mesa');
select pg_temp.entrar(2);
select is(pg_temp.vejo('mesa'), 0, 'outra delegação não vê');

-- Entrevista

select pg_temp.entrar(6);
select public.pedir_entrevista('00000000-0000-0000-0000-0000000000d2', 'A posição sobre o Rio Aurora');
select pg_temp.entrar(1);
select throws_ok($$select public.responder_entrevista((select id from public.entrevista), true, now())$$, '42501', null,
	'outra delegação não responde à entrevista');
select pg_temp.entrar(2);
select public.responder_entrevista((select id from public.entrevista), true, now() + interval '1 hour');
select pg_temp.entrar(6);
select results_eq($$select status from public.entrevista$$, array['aceita'], 'a press vê a entrevista aceita');

-- Coletiva

select pg_temp.entrar(6);
select throws_ok($$select public.abrir_coletiva('00000000-0000-0000-0000-0000000000e1', 'Coletiva')$$, '42501', null,
	'só a Diretoria da Press abre a coletiva');
select pg_temp.entrar(7);
select public.abrir_coletiva('00000000-0000-0000-0000-0000000000e1', 'Coletiva do terceiro dia');
select pg_temp.entrar(6);
select lives_ok($$select public.perguntar_na_coletiva((select id from public.coletiva), '00000000-0000-0000-0000-0000000000d1', 'Qual o plano?')$$,
	'a press pergunta a uma delegação do próprio comitê');
select throws_ok($$select public.perguntar_na_coletiva((select id from public.coletiva), '00000000-0000-0000-0000-0000000000d1', 'De novo?')$$,
	'23505', null, 'uma pergunta por delegação');

-- Diretoria da Press modera
reset role;
insert into public.noticia (id, veiculo_id, comite_id, tipo, titulo, texto) values
	('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'reportagem', 'T', 'X');
select pg_temp.entrar(7);
select lives_ok($$select public.ocultar_noticia('00000000-0000-0000-0000-000000000101', 'Fere o decoro.')$$,
	'a Diretoria da Press oculta notícias com o papel próprio');
reset role;

select * from finish();
rollback;
