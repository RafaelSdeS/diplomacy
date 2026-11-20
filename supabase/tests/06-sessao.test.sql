-- Passo 06: sessão, chamada, rodízio da presidência, placa, cronômetro, pontos.
begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

-- Cenário: C1 com 15 delegações (d01..d0f); a1 delegado de d01, a2 delegado de
-- d02, a3 mesa de C1, a4 delegado de d03.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'Comitê 1', 'Comitê 1');
insert into public.delegacao (id, comite_id, nome, nome_oficial)
select ('00000000-0000-0000-0000-0000000000' || lpad(to_hex(n), 2, '0'))::uuid,
	'00000000-0000-0000-0000-0000000000c1', 'Delegação ' || n, 'Delegação ' || n
from generate_series(1, 15) as n;

insert into auth.users (id, email, raw_user_meta_data) values
	('00000000-0000-0000-0000-0000000000a1', 'delegado1@exemplo.test', '{"nome": "Delegado 1"}'),
	('00000000-0000-0000-0000-0000000000a2', 'delegado2@exemplo.test', '{"nome": "Delegado 2"}'),
	('00000000-0000-0000-0000-0000000000a3', 'mesa@exemplo.test', '{"nome": "Mesa"}'),
	('00000000-0000-0000-0000-0000000000a4', 'delegado3@exemplo.test', '{"nome": "Delegado 3"}');

insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado',
		'00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado',
		'00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000002'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'mesa',
		'00000000-0000-0000-0000-0000000000c1', null),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'delegado',
		'00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000003');

create function pg_temp.entrar(p_usuario uuid) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', p_usuario, 'role', 'authenticated')::text,
		true
	);
end $$;

create function pg_temp.presidencia() returns uuid language sql as $$
	select presidencia_delegacao_id from public.sessao where id = public.sessao_atual('00000000-0000-0000-0000-0000000000c1');
$$;

-- Rodízio: só a mesa sorteia

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
	$$select public.sortear_presidencia('00000000-0000-0000-0000-0000000000c1')$$,
	'42501', null, 'um delegado não sorteia o rodízio');
select throws_ok(
	$$select public.abrir_sessao('00000000-0000-0000-0000-0000000000c1')$$,
	'42501', null, 'um delegado não abre sessão');
select throws_ok(
	$$select public.levantar_placa('00000000-0000-0000-0000-0000000000c1')$$,
	'P0002', null, 'sem sessão aberta, não há placa');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select lives_ok(
	$$select public.sortear_presidencia('00000000-0000-0000-0000-0000000000c1')$$,
	'a mesa sorteia o rodízio');
select results_eq(
	$$select count(*)::int from public.rodizio_presidencia where comite_id = '00000000-0000-0000-0000-0000000000c1'$$,
	array[15], 'o sorteio inclui todas as delegações (regras do UNOCT)');

-- Para conferir a sequência, fixamos a ordem: d01, d02, d03...
reset role;
update public.rodizio_presidencia r set ordem = 100 + x.n
from (select delegacao_id, row_number() over (order by delegacao_id) as n from public.rodizio_presidencia) x
where r.delegacao_id = x.delegacao_id;
update public.rodizio_presidencia set ordem = ordem - 100;
create temp table ordem as
	select ordem, delegacao_id from public.rodizio_presidencia
	where comite_id = '00000000-0000-0000-0000-0000000000c1';
grant select on ordem to authenticated;
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');

-- Primeira sessão: preside o bureau

select lives_ok($$select public.abrir_sessao('00000000-0000-0000-0000-0000000000c1')$$, 'a mesa abre a sessão 1');
select is(pg_temp.presidencia(), null, 'na primeira sessão, o bureau preside');
select ok(public.pode_presidir('00000000-0000-0000-0000-0000000000c1'), 'a mesa sempre pode presidir');

-- A plenária de abertura (passo 07) termina aqui: o comitê entra no debate.
reset role;
update public.estado_sessao set fase = 'debate', forma = 'formal_informal';
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select ok(not public.pode_presidir('00000000-0000-0000-0000-0000000000c1'), 'na sessão 1, o delegado não preside');
select throws_ok(
	$$select public.dar_palavra('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000002')$$,
	'42501', null, 'quem não preside não dá a palavra');
select throws_ok(
	$$select public.iniciar_cronometro('00000000-0000-0000-0000-0000000000c1', 60)$$,
	'42501', null, 'quem não preside não mexe no cronômetro');
update public.estado_sessao set orador_delegacao_id = '00000000-0000-0000-0000-000000000001';
select is((select orador_delegacao_id from public.estado_sessao), null, 'ninguém altera o estado da sessão direto');

-- Placa e pontos

select lives_ok($$select public.levantar_placa('00000000-0000-0000-0000-0000000000c1')$$, 'o delegado levanta a placa');
select lives_ok($$select public.levantar_placa('00000000-0000-0000-0000-0000000000c1')$$, 'levantar de novo não duplica');
select throws_ok(
	$$insert into public.pedido_fala (sessao_id, comite_id, delegacao_id, criado_em)
		values (public.sessao_atual('00000000-0000-0000-0000-0000000000c1'), '00000000-0000-0000-0000-0000000000c1',
			'00000000-0000-0000-0000-000000000002', '2000-01-01')$$,
	'42501', null, 'ninguém insere pedido de fala direto (nem fura a fila)');
select lives_ok(
	$$select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'ponto_duvida', 'Qual o tempo de fala?')$$,
	'o delegado envia um ponto');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a2');
select lives_ok($$select public.levantar_placa('00000000-0000-0000-0000-0000000000c1')$$, 'outro delegado levanta a placa');
select results_eq(
	$$select delegacao_id from public.pedido_fala where situacao = 'aberto' order by criado_em, delegacao_id$$,
	$$values ('00000000-0000-0000-0000-000000000001'::uuid), ('00000000-0000-0000-0000-000000000002'::uuid)$$,
	'a fila tem uma placa por delegação');

-- A mesa dá a palavra, mexe no cronômetro e responde o ponto

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select lives_ok(
	$$select public.dar_palavra('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001', 60)$$,
	'a mesa dá a palavra');
select results_eq(
	$$select situacao from public.pedido_fala where delegacao_id = '00000000-0000-0000-0000-000000000001'$$,
	array['atendido'], 'o pedido de quem recebeu a palavra é atendido');
select results_eq(
	$$select orador_delegacao_id, cronometro_duracao_seg, tempo_fala_seg from public.estado_sessao$$,
	$$values ('00000000-0000-0000-0000-000000000001'::uuid, 60, 60)$$,
	'o orador e o cronômetro começam');
select public.pausar('00000000-0000-0000-0000-0000000000c1');
select public.somar_segundos('00000000-0000-0000-0000-0000000000c1', 30);
select results_eq(
	$$select cronometro_pausado_restante_seg from public.estado_sessao$$,
	array[90], 'pausado com 60 s, mais 30 s, ficam 90 s');
select public.retomar('00000000-0000-0000-0000-0000000000c1');
select results_eq(
	$$select cronometro_duracao_seg, cronometro_pausado_restante_seg from public.estado_sessao$$,
	$$values (90, null::int)$$,
	'retomado, conta de novo os 90 s');
select lives_ok(
	$$select public.responder_ponto((select id from public.ponto_mocao limit 1), 'aceito')$$,
	'quem preside responde o ponto');

-- Informal-informal: até 45 minutos por sessão

select lives_ok(
	$$select public.mudar_forma('00000000-0000-0000-0000-0000000000c1', 'informal_informal', 30)$$,
	'30 minutos de informal-informal');
select throws_ok(
	$$select public.mudar_forma('00000000-0000-0000-0000-0000000000c1', 'informal_informal', 20)$$,
	'23514', null, 'mais 20 passaria de 45 minutos');
select lives_ok(
	$$select public.mudar_forma('00000000-0000-0000-0000-0000000000c1', 'informal_informal', 15)$$,
	'mais 15 completa os 45 minutos');

-- Chamada e quórum (15 delegações: quórum 5)

insert into public.presenca (sessao_id, comite_id, delegacao_id)
select public.sessao_atual('00000000-0000-0000-0000-0000000000c1'), '00000000-0000-0000-0000-0000000000c1', id
from public.delegacao order by nome limit 4;
select ok(
	public.presentes(public.sessao_atual('00000000-0000-0000-0000-0000000000c1'))
		< public.quorum('00000000-0000-0000-0000-0000000000c1'),
	'com 4 presentes, não há quórum');
insert into public.presenca (sessao_id, comite_id, delegacao_id, situacao)
values (public.sessao_atual('00000000-0000-0000-0000-0000000000c1'), '00000000-0000-0000-0000-0000000000c1',
	'00000000-0000-0000-0000-00000000000f', 'presente_e_votando');
select ok(
	public.presentes(public.sessao_atual('00000000-0000-0000-0000-0000000000c1'))
		>= public.quorum('00000000-0000-0000-0000-0000000000c1'),
	'com 5 presentes, há quórum');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
	$$insert into public.presenca (sessao_id, comite_id, delegacao_id)
		values (public.sessao_atual('00000000-0000-0000-0000-0000000000c1'), '00000000-0000-0000-0000-0000000000c1',
			'00000000-0000-0000-0000-000000000009')$$,
	'42501', null, 'só a mesa faz a chamada');

-- Sessão 2: preside a primeira do rodízio; passada, a segunda, depois a terceira

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.abrir_sessao('00000000-0000-0000-0000-0000000000c1');
select is(pg_temp.presidencia(), (select delegacao_id from ordem where ordem = 1), 'na sessão 2, preside a primeira sorteada');

-- O delegado da delegação que preside pode presidir; os outros não.
select pg_temp.entrar(
	case (select delegacao_id from ordem where ordem = 1)
		when '00000000-0000-0000-0000-000000000001' then '00000000-0000-0000-0000-0000000000a1'::uuid
		else '00000000-0000-0000-0000-0000000000a2'::uuid
	end);
select lives_ok(
	$$select public.dar_palavra('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000003')$$,
	'o delegado da delegação que preside dá a palavra');
select lives_ok($$select public.pausar('00000000-0000-0000-0000-0000000000c1')$$, 'e mexe no cronômetro');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a4');
select throws_ok(
	$$select public.dar_palavra('00000000-0000-0000-0000-0000000000c1', null)$$,
	'42501', null, 'um delegado de outra delegação não dá a palavra');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.passar_presidencia('00000000-0000-0000-0000-0000000000c1');
select is(pg_temp.presidencia(), (select delegacao_id from ordem where ordem = 2), 'passada, vai para a segunda sorteada');
select public.passar_presidencia('00000000-0000-0000-0000-0000000000c1');
select is(pg_temp.presidencia(), (select delegacao_id from ordem where ordem = 3), 'passada de novo, vai para a terceira');

-- Na fase de ação, o bureau preside, e a presidência não é passada.
reset role;
update public.estado_sessao set fase = 'acao';
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a4'); -- d03, a delegação da vez
select ok(not public.pode_presidir('00000000-0000-0000-0000-0000000000c1'), 'na fase de ação, a delegação da vez não preside');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select throws_ok(
	$$select public.passar_presidencia('00000000-0000-0000-0000-0000000000c1')$$,
	'42501', null, 'na fase de ação, a presidência não é passada');
reset role;

select * from finish();
rollback;
