-- Passo 30: pausa para pontos e moções depois de cada fala, lista curta e baixar placas.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- Cenário: C1 em debate formal-informal; d1 (a1) e d2 (a2) presentes, d3 ausente; a3 é a mesa.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1');
insert into public.delegacao (id, comite_id, nome, nome_oficial)
select ('00000000-0000-0000-0000-0000000000d' || n)::uuid, '00000000-0000-0000-0000-0000000000c1', 'D' || n, 'Delegação ' || n
from generate_series(1, 3) as n;
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'pessoa' || n || '@exemplo.test', '{"nome": "Pessoa"}'
from generate_series(1, 3) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
	('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', 'delegado', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2'),
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1', null);

create function pg_temp.entrar(n int) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config('request.jwt.claims',
		json_build_object('sub', ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.pausa() returns timestamptz language sql as $$
	select pausa_ate from public.estado_sessao where comite_id = '00000000-0000-0000-0000-0000000000c1'
$$;
create function pg_temp.proximos() returns text[] language sql as $$
	select coalesce(array_agg(d.nome order by p.ordem), '{}') from public.proximo_orador p
	join public.delegacao d on d.id = p.delegacao_id where p.comite_id = '00000000-0000-0000-0000-0000000000c1'
$$;

select pg_temp.entrar(3);
select public.abrir_sessao('00000000-0000-0000-0000-0000000000c1');
insert into public.presenca (sessao_id, comite_id, delegacao_id)
select public.sessao_atual('00000000-0000-0000-0000-0000000000c1'), '00000000-0000-0000-0000-0000000000c1', d
from unnest(array['00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2']::uuid[]) as d;
reset role;
update public.estado_sessao set fase = 'debate', forma = 'formal_informal' where comite_id = '00000000-0000-0000-0000-0000000000c1';

-- A pausa depois da fala

select pg_temp.entrar(3);
select public.dar_palavra('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1');
select public.dar_palavra('00000000-0000-0000-0000-0000000000c1', null);
select is(pg_temp.pausa(), now() + interval '10 seconds', 'encerrada a fala, 10 s para pontos e moções');
select public.dar_palavra('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2');
select is(pg_temp.pausa(), null, 'dar a palavra acaba a pausa');
reset role;
update public.comite set regras = '{"pausa_pontos_seg": 0}' where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.entrar(3);
select public.dar_palavra('00000000-0000-0000-0000-0000000000c1', null);
select is(pg_temp.pausa(), null, 'com a regra em 0, não há pausa');

-- A lista curta

select pg_temp.entrar(1);
select throws_ok($$select public.definir_proximos('00000000-0000-0000-0000-0000000000c1', array['00000000-0000-0000-0000-0000000000d2']::uuid[])$$,
	'42501', null, 'só quem preside define os próximos');
select pg_temp.entrar(3);
select public.definir_proximos('00000000-0000-0000-0000-0000000000c1',
	array['00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d1']::uuid[]);
select is(pg_temp.proximos(), array['D2', 'D1'], 'os próximos, na ordem escolhida');
select throws_ok($$select public.definir_proximos('00000000-0000-0000-0000-0000000000c1', array['00000000-0000-0000-0000-0000000000d3']::uuid[])$$,
	'22023', 'Só delegações presentes entram na lista curta.', 'delegação ausente não entra');
select throws_ok($$select public.definir_proximos('00000000-0000-0000-0000-0000000000c1', array[
	'00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d1',
	'00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d1']::uuid[])$$,
	'22023', 'A lista curta tem no máximo 4 delegações.', 'no máximo 4');
select public.dar_palavra('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2');
select is(pg_temp.proximos(), array['D1'], 'quem recebe a palavra sai da lista curta');

-- Baixar todas as placas e encerrar a pausa

select pg_temp.entrar(1);
select public.levantar_placa('00000000-0000-0000-0000-0000000000c1');
select pg_temp.entrar(3);
select public.baixar_todas_placas('00000000-0000-0000-0000-0000000000c1');
select results_eq($$select count(*)::int from public.pedido_fala where comite_id = '00000000-0000-0000-0000-0000000000c1' and situacao = 'aberto'$$,
	array[0], 'a presidência baixa todas as placas');
reset role;
update public.comite set regras = '{}' where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.entrar(3);
select public.dar_palavra('00000000-0000-0000-0000-0000000000c1', null);
select isnt(pg_temp.pausa(), null, 'de volta ao padrão, a pausa volta');
select public.encerrar_pausa('00000000-0000-0000-0000-0000000000c1');
select is(pg_temp.pausa(), null, 'a presidência encerra a pausa antes do tempo');

select * from finish();
rollback;
