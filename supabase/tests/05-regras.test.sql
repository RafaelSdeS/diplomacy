-- Passo 05: regras de procedimento, com os exemplos do Guia de Regras.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- Cenário: evento 1 com C1 (15 delegações, uma delas suspensa à parte) e C2
-- (sem delegações); a1 delegado de C1, a4 secretaria do evento 1; evento 2 com
-- a5, secretaria dele.
insert into public.evento (id, nome, ano, regras_padrao) values
	('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027, '{"informal_informal_max_min": 30, "aviso_fala_seg": 15}'),
	('00000000-0000-0000-0000-0000000000e2', 'Evento 2', 2027, '{}');

insert into public.comite (id, evento_id, sigla, nome, nome_oficial, regras) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'Comitê 1', 'Comitê 1',
		'{"aviso_fala_seg": 5, "votacao_substantiva": "csnu", "membros_permanentes": ["China", "EUA"]}'),
	('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'C2', 'Comitê 2', 'Comitê 2', '{}');

insert into public.delegacao (id, comite_id, nome, nome_oficial)
select ('00000000-0000-0000-0000-0000000000' || lpad(to_hex(n), 2, '0'))::uuid,
	'00000000-0000-0000-0000-0000000000c1', 'Delegação ' || n, 'Delegação ' || n
from generate_series(1, 15) as n;
insert into public.delegacao (comite_id, nome, nome_oficial, situacao) values
	('00000000-0000-0000-0000-0000000000c1', 'Suspensa', 'Suspensa', 'suspensa');

insert into auth.users (id, email, raw_user_meta_data) values
	('00000000-0000-0000-0000-0000000000a1', 'delegado1@exemplo.test', '{"nome": "Delegado 1"}'),
	('00000000-0000-0000-0000-0000000000a4', 'secretaria@exemplo.test', '{"nome": "Secretaria"}'),
	('00000000-0000-0000-0000-0000000000a5', 'secretaria2@exemplo.test', '{"nome": "Secretaria 2"}');

insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id) values
	('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'delegado',
		'00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001'),
	('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e1', 'secretaria', null, null),
	('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000e2', 'secretaria', null, null);

create function pg_temp.entrar(p_usuario uuid) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', p_usuario, 'role', 'authenticated')::text,
		true
	);
end $$;

-- Exemplos do guia

select is(public.maioria_simples(20), 11, 'maioria simples de 20 é 11');
select is(public.maioria_simples(41), 21, 'maioria simples de 41 é 21');
select is(public.maioria_simples(15), 8, 'maioria simples de 15 é 8');
select is(public.dois_tercos(10), 7, 'dois terços de 10 é 7');
select is(public.dois_tercos(21), 14, 'dois terços de 21 é 14');
select is(public.dois_tercos(9), 6, 'dois terços de 9 é 6 (exato)');

-- Regras que valem

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');

select is(public.quorum('00000000-0000-0000-0000-0000000000c1'), 5,
	'quórum de 15 delegações previstas é 5 (a suspensa não conta)');
select is(public.quorum('00000000-0000-0000-0000-0000000000c2'), 0, 'comitê sem delegações tem quórum 0');
select is(public.regras('00000000-0000-0000-0000-0000000000c1') ->> 'aviso_fala_seg', '5',
	'o ajuste do comitê vence o padrão do evento');
select is(public.regras('00000000-0000-0000-0000-0000000000c1') ->> 'informal_informal_max_min', '30',
	'uma chave que o comitê não define vem do padrão do evento');
select is(public.regras('00000000-0000-0000-0000-0000000000c1') ->> 'assinaturas_emenda', '3',
	'uma chave que nem o evento define vem do guia');
select is(public.regras('00000000-0000-0000-0000-0000000000c2') ->> 'votacao_substantiva', 'maioria_simples',
	'o ajuste de um comitê não vaza para outro');
select is(public.regras('00000000-0000-0000-0000-0000000000c1') -> 'membros_permanentes', '["China", "EUA"]'::jsonb,
	'membros permanentes do comitê');

-- Quem altera

update public.comite set regras = '{"aviso_fala_seg": 60}' where id = '00000000-0000-0000-0000-0000000000c1';
update public.evento set regras_padrao = '{}' where id = '00000000-0000-0000-0000-0000000000e1';
reset role;
select is(
	(select regras ->> 'aviso_fala_seg' from public.comite where id = '00000000-0000-0000-0000-0000000000c1'), '5',
	'o delegado não altera as regras do comitê');
select is(
	(select regras_padrao ->> 'aviso_fala_seg' from public.evento where id = '00000000-0000-0000-0000-0000000000e1'), '15',
	'o delegado não altera as regras do evento');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a5');
update public.comite set regras = '{"aviso_fala_seg": 60}' where id = '00000000-0000-0000-0000-0000000000c1';
reset role;
select is(
	(select regras ->> 'aviso_fala_seg' from public.comite where id = '00000000-0000-0000-0000-0000000000c1'), '5',
	'a secretaria de outro evento não altera as regras');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a4');
update public.comite set regras = regras || '{"aviso_fala_seg": 20}' where id = '00000000-0000-0000-0000-0000000000c1';
update public.evento set regras_padrao = regras_padrao || '{"mesa_le_bilhetes": true}'
	where id = '00000000-0000-0000-0000-0000000000e1';
select is(public.regras('00000000-0000-0000-0000-0000000000c1') ->> 'aviso_fala_seg', '20',
	'a secretaria altera as regras do comitê');
select is(public.regras('00000000-0000-0000-0000-0000000000c2') ->> 'mesa_le_bilhetes', 'true',
	'a secretaria altera as regras do evento');

-- Regras inválidas são recusadas

select throws_ok(
	$$update public.comite set regras = '{"quorum_fracao": [1, 0]}' where id = '00000000-0000-0000-0000-0000000000c1'$$,
	'23514', null, 'fração com zero é recusada');
select throws_ok(
	$$update public.comite set regras = '{"votacao_substantiva": "aclamacao", "chave_inventada": 1}'
		where id = '00000000-0000-0000-0000-0000000000c1'$$,
	'23514', null, 'tipo de votação e chave desconhecidos são recusados');
reset role;

select * from finish();
rollback;
