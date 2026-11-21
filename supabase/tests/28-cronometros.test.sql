-- Passo 28: dois cronômetros, fala e debate; o informal desconta só o tempo usado.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- Cenário: C1 em debate, com d1 (a1) e a mesa (a3).
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1');
insert into public.delegacao (id, comite_id, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'D1', 'Delegação 1');
insert into auth.users (id, email, raw_user_meta_data) values
	('00000000-0000-0000-0000-0000000000a1', 'delegado1@exemplo.test', '{"nome": "Delegado 1"}'),
	('00000000-0000-0000-0000-0000000000a3', 'mesa@exemplo.test', '{"nome": "Mesa"}');
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado',
		'00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'mesa',
		'00000000-0000-0000-0000-0000000000c1', null);

create function pg_temp.entrar(p_usuario uuid) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.estado() returns public.estado_sessao language sql as $$
	select * from public.estado_sessao where comite_id = '00000000-0000-0000-0000-0000000000c1'
$$;
create function pg_temp.usados() returns int language sql as $$
	select informal_min_usados from public.sessao where id = public.sessao_atual('00000000-0000-0000-0000-0000000000c1')
$$;

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.abrir_sessao('00000000-0000-0000-0000-0000000000c1');
reset role;
update public.estado_sessao set fase = 'debate' where comite_id = '00000000-0000-0000-0000-0000000000c1';
create temp table antes as select debate_inicio from public.estado_sessao limit 0;
grant select on antes to authenticated;

-- O debate tem relógio próprio; dar a palavra não mexe nele

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.mudar_forma('00000000-0000-0000-0000-0000000000c1', 'formal_informal', 20);
select is((pg_temp.estado()).debate_duracao_seg, 1200, 'os 20 minutos vão para o relógio do debate');
reset role;
insert into antes select debate_inicio from pg_temp.estado();
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.dar_palavra('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', 90);
select is((pg_temp.estado()).debate_inicio, (select debate_inicio from antes), 'dar a palavra não apaga o tempo do debate');
select is((pg_temp.estado()).cronometro_duracao_seg, 90, 'a fala tem o seu relógio');

-- Aplicar o tempo de fala ajusta a fala atual pela diferença

select public.aplicar_tempo_fala('00000000-0000-0000-0000-0000000000c1', 120);
select is((pg_temp.estado()).cronometro_duracao_seg, 120, 'a fala atual ganha os 30 s de diferença');
select throws_ok($$select public.aplicar_tempo_fala('00000000-0000-0000-0000-0000000000c1', 0)$$,
	'22023', null, 'tempo de fala fora do intervalo é recusado');

-- O informal-informal desconta só os minutos usados, até 45 por sessão

select public.mudar_forma('00000000-0000-0000-0000-0000000000c1', 'informal_informal', 30);
select is(pg_temp.usados(), 0, 'o informal que começa ainda não desconta');
reset role;
update public.estado_sessao set debate_inicio = debate_inicio - interval '10 minutes' where comite_id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.mudar_forma('00000000-0000-0000-0000-0000000000c1', 'formal_informal');
select is(pg_temp.usados(), 10, 'encerrado aos 10 minutos, desconta 10, não 30');
select throws_ok($$select public.mudar_forma('00000000-0000-0000-0000-0000000000c1', 'informal_informal', 36)$$,
	'23514', null, 'passar dos 45 minutos somados na sessão é recusado');
select public.mudar_forma('00000000-0000-0000-0000-0000000000c1', 'informal_informal', 35);

-- Pausar e somar no relógio do debate

select public.pausar('00000000-0000-0000-0000-0000000000c1', 'debate');
select public.somar_segundos('00000000-0000-0000-0000-0000000000c1', 60, 'debate');
select ok((pg_temp.estado()).debate_pausado_restante_seg between 2155 and 2160, 'pausado, o debate guarda o que falta, com o minuto somado');
select public.dar_palavra('00000000-0000-0000-0000-0000000000c1', null);
select ok((pg_temp.estado()).debate_pausado_restante_seg is not null, 'encerrar a fala não mexe no debate');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$select public.pausar('00000000-0000-0000-0000-0000000000c1', 'debate')$$,
	'42501', null, 'quem não preside não pausa o debate');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.encerrar_sessao('00000000-0000-0000-0000-0000000000c1');
select ok((pg_temp.estado()).debate_inicio is null and (pg_temp.estado()).debate_pausado_restante_seg is null,
	'encerrar a sessão limpa o relógio do debate');

select * from finish();
rollback;
