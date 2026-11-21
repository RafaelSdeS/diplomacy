-- Passo 41: o item do cronograma tem um tipo de uma lista fechada, "outro" por padrão.
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.cronograma_item (evento_id, titulo, inicio, fim) values
	('00000000-0000-0000-0000-0000000000e1', 'Credenciamento', '2027-11-10 08:30-03', '2027-11-10 09:30-03');
insert into public.cronograma_item (evento_id, titulo, tipo, inicio, fim) values
	('00000000-0000-0000-0000-0000000000e1', 'Sessão 1', 'sessao', '2027-11-10 10:30-03', '2027-11-10 12:30-03');

select is(
	(select tipo from public.cronograma_item where titulo = 'Credenciamento' and evento_id = '00000000-0000-0000-0000-0000000000e1'),
	'outro', 'sem tipo, o item é "outro"');
select is(
	(select tipo from public.cronograma_item where titulo = 'Sessão 1' and evento_id = '00000000-0000-0000-0000-0000000000e1'),
	'sessao', 'o tipo escolhido fica gravado');
select throws_ok(
	$$ insert into public.cronograma_item (evento_id, titulo, tipo, inicio, fim)
		values ('00000000-0000-0000-0000-0000000000e1', 'Festa', 'festa', '2027-11-10 20:00-03', '2027-11-10 23:00-03') $$,
	'23514', null, 'um tipo fora da lista é recusado');

select * from finish();
rollback;
