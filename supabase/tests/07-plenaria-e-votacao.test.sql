-- Passo 07: plenária de abertura, lista de oradores, moções votadas, votação e
-- agenda informal, com as regras do UNOCT.
begin;
create extension if not exists pgtap with schema extensions;
select plan(46);

-- Cenário: C1 com dois tópicos e 7 delegações: d01..d05 membros, d06 observadora
-- (Fiji), d07 suspensa (Gana). a1 = d01 (Brasil), a2 = d02 (China), a4 = d03
-- (Áustria), a6 = d06 (Fiji), a7 = d07 (Gana); a3 é da mesa.
insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-0000000000e1', 'Evento 1', 2027);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial, topicos) values
	('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'C1', 'Comitê 1', 'Comitê 1',
		array['Tópico um', 'Tópico dois']);
insert into public.delegacao (id, comite_id, nome, nome_oficial, situacao) values
	('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'Brasil', 'Brasil', 'membro'),
	('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c1', 'China', 'China', 'membro'),
	('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000c1', 'Áustria', 'Áustria', 'membro'),
	('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000c1', 'Dinamarca', 'Dinamarca', 'membro'),
	('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000c1', 'Egito', 'Egito', 'membro'),
	('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000c1', 'Fiji', 'Fiji', 'observadora'),
	('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000c1', 'Gana', 'Gana', 'suspensa');

insert into auth.users (id, email, raw_user_meta_data) values
	('00000000-0000-0000-0000-0000000000a1', 'a1@exemplo.test', '{"nome": "A1"}'),
	('00000000-0000-0000-0000-0000000000a2', 'a2@exemplo.test', '{"nome": "A2"}'),
	('00000000-0000-0000-0000-0000000000a3', 'a3@exemplo.test', '{"nome": "Mesa"}'),
	('00000000-0000-0000-0000-0000000000a4', 'a4@exemplo.test', '{"nome": "A4"}'),
	('00000000-0000-0000-0000-0000000000a6', 'a6@exemplo.test', '{"nome": "A6"}'),
	('00000000-0000-0000-0000-0000000000a7', 'a7@exemplo.test', '{"nome": "A7"}');
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id)
select ('00000000-0000-0000-0000-0000000000a' || n)::uuid, '00000000-0000-0000-0000-0000000000e1', 'delegado',
	'00000000-0000-0000-0000-0000000000c1', ('00000000-0000-0000-0000-00000000000' || d)::uuid
from (values (1, 1), (2, 2), (4, 3), (6, 6), (7, 7)) as x (n, d);
insert into public.participacao (pessoa_id, evento_id, papel, comite_id) values
	('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', 'mesa', '00000000-0000-0000-0000-0000000000c1');

create function pg_temp.entrar(p_usuario uuid) returns void language plpgsql as $$
begin
	perform set_config('role', 'authenticated', true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', p_usuario, 'role', 'authenticated')::text,
		true
	);
end $$;
create function pg_temp.estado() returns public.estado_sessao language sql as $$
	select * from public.estado_sessao where comite_id = '00000000-0000-0000-0000-0000000000c1';
$$;
create function pg_temp.ponto(p_tipo text) returns uuid language sql as $$
	select id from public.ponto_mocao where tipo = p_tipo
	order by status in ('aceito', 'recusado'), criado_em desc limit 1; -- a moção ainda em aberto
$$;
create function pg_temp.votacao() returns uuid language sql as $$
	select id from public.votacao order by criado_em desc limit 1;
$$;

-- Regras do UNOCT

select is(public.regras('00000000-0000-0000-0000-0000000000c1') ->> 'assinaturas_projeto_min', '5',
	'projeto de resolução pede no mínimo 5 signatários');
select is(public.quorum_votacao('00000000-0000-0000-0000-0000000000c1'), 4,
	'quórum de votação: maioria simples das 6 previstas (a suspensa não conta)');

-- Sorteio: todas as membros, nunca observadora nem suspensa; no máximo 2 sessões

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.sortear_presidencia('00000000-0000-0000-0000-0000000000c1');
select results_eq(
	$$select count(*)::int from public.rodizio_presidencia$$, array[5], 'o sorteio inclui as 5 membros');
select is_empty(
	$$select 1 from public.rodizio_presidencia where delegacao_id in
		('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000007')$$,
	'observadora e suspensa não entram no sorteio');
reset role;
update public.rodizio_presidencia set vezes = 2;
select is(public.tomar_proxima_presidencia('00000000-0000-0000-0000-0000000000c1'), null,
	'ninguém preside mais de 2 sessões');
update public.rodizio_presidencia set vezes = 0;

-- Plenária de abertura: o bureau conduz

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.abrir_sessao('00000000-0000-0000-0000-0000000000c1');
select is((pg_temp.estado()).fase, 'plenaria'::public.fase_comite, 'o comitê começa na plenária de abertura');
select is((pg_temp.estado()).forma, 'formal_formal'::public.forma_debate, 'a plenária é formal-formal');
select throws_ok($$select public.avancar_plenaria('00000000-0000-0000-0000-0000000000c1')$$,
	'P0001', 'Faça a chamada antes dos discursos de abertura.', 'sem chamada, não há discursos de abertura');

insert into public.presenca (sessao_id, comite_id, delegacao_id)
select public.sessao_atual('00000000-0000-0000-0000-0000000000c1'), '00000000-0000-0000-0000-0000000000c1', id
from public.delegacao where situacao <> 'suspensa';

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select ok(not public.pode_presidir('00000000-0000-0000-0000-0000000000c1'), 'na plenária, a delegação não preside');
select throws_ok($$select public.avancar_plenaria('00000000-0000-0000-0000-0000000000c1')$$,
	'42501', null, 'só o bureau avança a plenária');
select throws_ok(
	$$select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'informal_informal', null, null, 10)$$,
	'P0001', null, 'na plenária, a moção de informal-informal não está em ordem');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.avancar_plenaria('00000000-0000-0000-0000-0000000000c1');
select results_eq(
	$$select d.nome from public.lista_oradores l join public.delegacao d on d.id = l.delegacao_id
		where l.ponto_mocao_id is null order by l.ordem$$,
	array['Áustria', 'Brasil', 'China', 'Dinamarca', 'Egito', 'Fiji'],
	'nos discursos de abertura, todas as presentes entram na lista, em ordem alfabética');
select throws_ok(
	$$select public.mudar_forma('00000000-0000-0000-0000-0000000000c1', 'informal_informal', 10)$$,
	'P0001', null, 'na plenária, a forma de debate não muda');
select public.dar_palavra('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000003');
select results_eq(
	$$select falou from public.lista_oradores where delegacao_id = '00000000-0000-0000-0000-000000000003'$$,
	array[true], 'quem recebe a palavra fica marcado na lista');

-- O ponto de ordem não interrompe outra delegação
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
	$$select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'ponto_ordem')$$,
	'P0001', null, 'o ponto de ordem não interrompe o discurso de outra delegação');

-- Moção do tópico no topo, com lista especial e votação

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.avancar_plenaria('00000000-0000-0000-0000-0000000000c1');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
	$$select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'topico_no_topo', null, 3)$$,
	'22023', null, 'o tópico precisa ser um dos tópicos do comitê');
select lives_ok(
	$$select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'topico_no_topo', null, 2)$$,
	'a delegação propõe o tópico 2 no topo');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.abrir_lista_especial(pg_temp.ponto('topico_no_topo'));
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select public.inscrever_lista(pg_temp.ponto('topico_no_topo'), 'a_favor');
select throws_ok($$select public.inscrever_lista(pg_temp.ponto('topico_no_topo'), 'contra')$$,
	'23505', null, 'cada delegação entra uma vez na lista especial');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a2');
select public.inscrever_lista(pg_temp.ponto('topico_no_topo'), 'a_favor');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a4');
select throws_ok($$select public.inscrever_lista(pg_temp.ponto('topico_no_topo'), 'a_favor')$$,
	'P0001', 'A lista já tem 2 discursos deste lado.', 'a lista especial aceita no máximo 2 a favor');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.abrir_votacao(pg_temp.ponto('topico_no_topo'));
select results_eq($$select tipo, regra from public.votacao$$, $$values ('procedimental', 'maioria_simples')$$,
	'a moção do tópico é procedimental, por maioria simples');
select throws_ok($$select public.abrir_votacao_livre('00000000-0000-0000-0000-0000000000c1', 'Outra')$$,
	'23505', null, 'só uma votação aberta por comitê');

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$select public.votar(pg_temp.votacao(), 'a_favor')$$, 'a delegação presente vota');
select throws_ok($$select public.votar(pg_temp.votacao(), 'contra')$$,
	'23505', null, 'a mesma delegação não vota duas vezes');
select throws_ok(
	$$select public.registrar_voto(pg_temp.votacao(), '00000000-0000-0000-0000-000000000004', 'a_favor')$$,
	'42501', null, 'só a mesa registra votos de placa');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a2');
select throws_ok($$select public.votar(pg_temp.votacao(), 'abstencao')$$,
	'P0001', 'Questão procedimental não aceita abstenção.', 'abstenção em questão procedimental é recusada');
select public.votar(pg_temp.votacao(), 'a_favor');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a6');
select lives_ok($$select public.votar(pg_temp.votacao(), 'a_favor')$$, 'observadora vota em questão procedimental');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a7');
select throws_ok($$select public.votar(pg_temp.votacao(), 'contra')$$,
	'P0001', 'Delegação suspensa não vota.', 'suspensa não vota');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.registrar_voto(pg_temp.votacao(), '00000000-0000-0000-0000-000000000003', 'a_favor');
select results_eq($$select a_favor, base, necessario, aprovada from public.resultado(pg_temp.votacao())$$,
	$$values (4, 6, 4, true)$$, 'resultado: 4 a favor de 6 presentes; maioria simples de 6 é 4');

select public.encerrar_votacao(pg_temp.votacao());
select results_eq($$select fase::text, ordem_topicos, topico_atual from public.estado_sessao$$,
	$$values ('debate', '{2,1}'::int[], 2)$$, 'aprovada a moção, o tópico 2 vai para o topo e o debate começa');
select isnt((select presidencia_delegacao_id from public.sessao where fim is null), null,
	'terminada a plenária, a delegação da vez assume');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a4');
select throws_ok($$select public.votar(pg_temp.votacao(), 'a_favor')$$,
	'P0001', 'Esta votação não está aberta.', 'votação encerrada não aceita voto');

-- Rejeitada, entra o outro tópico (de volta à plenária, só para o teste)
reset role;
update public.estado_sessao set fase = 'plenaria', etapa_plenaria = 'topico';
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'topico_no_topo', null, 2);
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.abrir_votacao(pg_temp.ponto('topico_no_topo'));
select public.registrar_voto(pg_temp.votacao(), '00000000-0000-0000-0000-000000000001', 'a_favor');
select public.registrar_voto(pg_temp.votacao(), '00000000-0000-0000-0000-000000000002', 'contra');
select public.encerrar_votacao(pg_temp.votacao());
select results_eq($$select aprovada from public.votacao where id = pg_temp.votacao()$$, array[false],
	'com 1 voto a favor, a moção é rejeitada (empate e minoria reprovam)');
select results_eq($$select ordem_topicos, topico_atual from public.estado_sessao$$,
	$$values ('{1,2}'::int[], 1)$$, 'rejeitada a moção do tópico 2, entra o tópico 1');

-- No debate: adiamento do debate, por dois terços. Passo 59: a delegação da vez preside; a
-- mesa conduz aqui como caso excepcional (assumiu).

reset role;
update public.estado_sessao set mesa_assumiu = true where comite_id = '00000000-0000-0000-0000-0000000000c1';

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a2');
select public.enviar_ponto('00000000-0000-0000-0000-0000000000c1', 'adiamento_debate');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.abrir_votacao(pg_temp.ponto('adiamento_debate'));
select results_eq($$select regra from public.votacao where id = pg_temp.votacao()$$, array['dois_tercos'],
	'o adiamento do debate pede dois terços');
select public.registrar_voto(pg_temp.votacao(), d, 'a_favor')
from unnest(array['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
	'00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004']::uuid[]) as d;
select public.encerrar_votacao(pg_temp.votacao());
select results_eq($$select topico_atual from public.estado_sessao$$, array[2],
	'com 4 de 6 (dois terços), o debate passa ao outro tópico');

-- Votação substantiva: observadora não vota; quem está presente pode se abster
-- (no UFRGSMUN, "presente" e "presente e votando" são o mesmo, passo 21)

select public.abrir_votacao_livre('00000000-0000-0000-0000-0000000000c1', 'Teste substantivo', 'substantiva');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a6');
select throws_ok($$select public.votar(pg_temp.votacao(), 'a_favor')$$,
	'P0001', 'Delegação observadora não vota em questão substantiva.', 'observadora não vota em questão substantiva');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$select public.votar(pg_temp.votacao(), 'abstencao')$$, 'em questão substantiva, cabe abstenção');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a2');
select lives_ok($$select public.votar(pg_temp.votacao(), 'abstencao')$$, 'quem está presente também se abstém');
select results_eq($$select base from public.resultado(pg_temp.votacao())$$, array[5],
	'na substantiva, a base são as membros presentes');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.encerrar_votacao(pg_temp.votacao());

-- Sem o quórum de votação (4 membros), a substantiva não abre
reset role;
delete from public.presenca where delegacao_id in
	('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select throws_ok(
	$$select public.abrir_votacao_livre('00000000-0000-0000-0000-0000000000c1', 'Sem quórum', 'substantiva')$$,
	'P0001', null, 'sem o quórum de votação, a votação substantiva não abre');
select public.abrir_votacao_livre('00000000-0000-0000-0000-0000000000c1', 'Procedimental de teste');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a4');
select throws_ok($$select public.votar(pg_temp.votacao(), 'a_favor')$$,
	'P0001', 'Só as delegações presentes na chamada votam.', 'delegação ausente não vota');

-- Agenda informal em árvore

select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select public.salvar_proposta_agenda('00000000-0000-0000-0000-0000000000c1', 1,
	'[{"texto": "A. Causas", "nivel": 0}, {"texto": "A.1 Financiamento", "nivel": 1},
	  {"texto": "B. Respostas", "nivel": 0}, {"texto": "pulo", "nivel": 2}]');
select results_eq(
	$$select f.texto, p.texto from public.ponto_pauta f left join public.ponto_pauta p on p.id = f.pai_id order by f.ordem$$,
	$$values ('A. Causas', null), ('A.1 Financiamento', 'A. Causas'), ('B. Respostas', null), ('pulo', 'B. Respostas')$$,
	'a proposta vira árvore, e um item nunca pula níveis');
select throws_ok(
	$$select public.salvar_proposta_agenda('00000000-0000-0000-0000-0000000000c1', 3, '[{"texto": "x"}]')$$,
	'22023', null, 'a proposta é de um tópico do comitê');
select throws_ok($$select public.adotar_proposta((select id from public.proposta_agenda))$$,
	'42501', null, 'só a mesa adota a agenda');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a3');
select public.adotar_proposta((select id from public.proposta_agenda));
select lives_ok(
	$$select public.marcar_ponto_pauta((select id from public.ponto_pauta where texto = 'A. Causas'), 'em_debate')$$,
	'quem preside marca o andamento de um ponto da agenda adotada');
select pg_temp.entrar('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
	$$select public.salvar_proposta_agenda('00000000-0000-0000-0000-0000000000c1', 1, '[{"texto": "outra"}]')$$,
	'P0001', 'A agenda adotada não muda mais.', 'a agenda adotada não muda');
reset role;

select * from finish();
rollback;
