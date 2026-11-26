-- Passo 63 (lote 1): a conversa do bloco. Só os membros leem e escrevem; a mesa lê o denunciado.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- Cenário: d1 cria o bloco e d2 entra; d3 fica de fora; a8 é a mesa.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial, topicos) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'C1', 'O Comitê 1', array['T1']);
insert into public.delegacao (id, comite_id, nome, nome_oficial, situacao)
select ('00000000-0000-0000-0000-0000000000d' || n)::uuid, '00000000-0000-0000-0000-0000000000c1', 'D' || n, 'Delegação ' || n, 'membro'
from generate_series(1, 3) as n;
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'a' || n || '@exemplo.test', json_build_object('nome', 'A' || n)
from generate_series(1, 8) as n;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, '00000000-0000-0000-0000-0000000000e1', 'delegado',
	'00000000-0000-0000-0000-0000000000c1', ('00000000-0000-0000-0000-0000000000d' || n)::uuid
from generate_series(1, 3) as n;
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
create function pg_temp.vejo() returns setof text language sql as $$
	select texto from public.mensagem where tipo = 'bloco' order by criado_em
$$;

select pg_temp.entrar(1);
insert into ids values ('bloco', public.criar_bloco('00000000-0000-0000-0000-0000000000c1', 'Bloco'));
select pg_temp.entrar(2); select public.entrar_bloco(pg_temp.id('bloco'));

select pg_temp.entrar(1);
select lives_ok($$select public.enviar_mensagem(gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', 'bloco', 'Proponho a cláusula 3', pg_temp.id('bloco'))$$,
	'um membro escreve na conversa do bloco');
select ok(public.pode_ouvir('bloco:' || pg_temp.id('bloco')), 'e ouve o canal do bloco');
select pg_temp.entrar(2);
select results_eq($$select pg_temp.vejo()$$, $$values ('Proponho a cláusula 3'::text)$$, 'o outro membro lê');
select pg_temp.entrar(3);
select throws_ok($$select public.enviar_mensagem(gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', 'bloco', 'Posso?', pg_temp.id('bloco'))$$,
	'42501', null, 'quem é de fora não escreve');
select is_empty($$select pg_temp.vejo()$$, 'nem lê');
select ok(not public.pode_ouvir('bloco:' || pg_temp.id('bloco')), 'nem ouve o canal');
select pg_temp.entrar(8);
select is_empty($$select pg_temp.vejo()$$, 'a mesa não lê a conversa do bloco');

-- Denunciada, a mesa lê.
select pg_temp.entrar(2);
select public.denunciar_mensagem((select id from public.mensagem where tipo = 'bloco'), 'Ofensa');
select pg_temp.entrar(8);
select results_eq($$select pg_temp.vejo()$$, $$values ('Proponho a cláusula 3'::text)$$, 'denunciada, a mesa lê');

-- Quem sai do bloco deixa de ver.
select pg_temp.entrar(2);
select public.sair_bloco(pg_temp.id('bloco'));
select is_empty($$select pg_temp.vejo()$$, 'quem sai do bloco deixa de ler');
select throws_ok($$select public.enviar_mensagem(gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', 'bloco', 'Ainda aqui?', pg_temp.id('bloco'))$$,
	'42501', null, 'e de escrever');

select * from finish();
rollback;
