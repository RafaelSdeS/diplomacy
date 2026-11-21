-- Planos das consultas mais usadas com dados do tamanho do evento (passo 13). Só no
-- banco LOCAL: cria um evento fictício dentro de uma transação, mede e desfaz tudo.
--
--   docker exec -i supabase_db_diplomacy psql -U postgres -q < supabase/consultas/planos.sql
--
-- O evento: 6 comitês com 25 delegações; por comitê, 12 sessões, 50 pedidos de fala e
-- 10 votações por sessão (cada uma com os 25 votos), 400 notas de crise, 3.000
-- bilhetes, 15 documentos com 40 cláusulas e 60 matérias. É mais do que 4 dias de
-- UFRGSMUN costumam ter.
begin;
-- Carga direta, sem os gatilhos (avisos do tempo real e regras de quem escreve).
set local session_replication_role = replica;

create temp table c as
select gen_random_uuid() as id, n from generate_series(1, 6) as n;
create temp table d as
select gen_random_uuid() as id, c.id as comite_id, c.n, m from c, generate_series(1, 25) as m;
create temp table s as
select gen_random_uuid() as id, c.id as comite_id, k from c, generate_series(1, 12) as k;

insert into public.evento (id, nome, ano) values ('00000000-0000-0000-0000-00000000e7e7', 'Planos', 2099);
insert into public.comite (id, evento_id, sigla, nome, nome_oficial)
select id, '00000000-0000-0000-0000-00000000e7e7', 'PLANO' || n, 'Plano ' || n, 'O Comitê ' || n from c;
insert into public.delegacao (id, comite_id, nome, nome_oficial)
select id, comite_id, 'D' || m, 'Delegação ' || m from d;

-- Uma pessoa por delegação, mais a crise de cada comitê.
insert into auth.users (id, email) select id, 'plano-' || id || '@exemplo.test' from d;
insert into public.pessoa (id, nome) select id, 'Delegado ' || m from d;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id)
select id, '00000000-0000-0000-0000-00000000e7e7', 'delegado', comite_id, id from d;
insert into auth.users (id, email) select id, 'plano-crise-' || n || '@exemplo.test' from c;
insert into public.pessoa (id, nome) select id, 'Crise ' || n from c;
insert into public.participacao (pessoa_id, evento_id, papel, comite_id)
select id, '00000000-0000-0000-0000-00000000e7e7', 'crise', id from c;

insert into public.sessao (id, comite_id, numero, inicio, fim)
select id, comite_id, k, now() - (13 - k) * interval '3 hours', case when k < 12 then now() - (13 - k) * interval '3 hours' + interval '2 hours' end
from s;
insert into public.estado_sessao (comite_id, sessao_id) select comite_id, id from s where k = 12;
insert into public.presenca (sessao_id, comite_id, delegacao_id)
select s.id, s.comite_id, d.id from s join d on d.comite_id = s.comite_id;
insert into public.pedido_fala (sessao_id, comite_id, delegacao_id, situacao, criado_em)
select s.id, s.comite_id, d.id, case when s.k = 12 and d.m <= 8 and g = 1 then 'aberto' else 'atendido' end,
	now() - random() * interval '30 hours'
from s join d on d.comite_id = s.comite_id cross join generate_series(1, 2) as g;
create temp table v as
select gen_random_uuid() as id, s.id as sessao_id, s.comite_id, g from s, generate_series(1, 10) as g;
insert into public.votacao (id, comite_id, sessao_id, objeto, tipo, regra, aberta, criado_em, encerrada_em)
select id, comite_id, sessao_id, 'Votação ' || g, 'procedimental', 'maioria_simples', false,
	now() - g * interval '10 minutes', now() - g * interval '10 minutes' + interval '2 minutes'
from v;
insert into public.voto (votacao_id, comite_id, delegacao_id, escolha)
select v.id, v.comite_id, d.id, (array['a_favor', 'contra', 'abstencao'])[1 + (random() * 2)::int]::public.escolha_voto
from v join d on d.comite_id = v.comite_id;

insert into public.nota_crise (comite_id, delegacao_id, autor_id, tipo, titulo, texto, status, criado_em)
select d.comite_id, d.id, d.id, 'nota', 'Nota ' || g, repeat('Texto da nota. ', 20),
	(case when g = 16 then 'pendente' else 'aprovada' end)::public.status_nota, now() - random() * interval '30 hours'
from d cross join generate_series(1, 16) as g;
insert into public.mensagem (id, comite_id, tipo, de_delegacao_id, para_delegacao_id, autor_id, texto, criado_em)
select gen_random_uuid(), a.comite_id, 'bilhete', a.id, b.id, a.id, 'Bilhete', now() - random() * interval '30 hours'
from d a cross join generate_series(1, 120) as g
join d b on b.comite_id = a.comite_id and b.m = 1 + (a.m + g) % 25 and b.id <> a.id;

create temp table bl as select gen_random_uuid() as id, c.id as comite_id, g from c, generate_series(1, 5) as g;
insert into public.bloco (id, comite_id, nome) select id, comite_id, 'Bloco ' || g from bl;
insert into public.bloco_membro (bloco_id, comite_id, delegacao_id, redator)
select bl.id, bl.comite_id, d.id, d.m % 5 = 1 from bl join d on d.comite_id = bl.comite_id and (d.m - 1) / 5 + 1 = bl.g;
create temp table doc as select gen_random_uuid() as id, bl.id as bloco_id, bl.comite_id, h as g from bl, generate_series(1, 3) as h;
insert into public.documento (id, comite_id, bloco_id, tipo, titulo, topico)
select id, comite_id, bloco_id, 'working_paper', 'Documento ' || g, 1 from doc;
insert into public.clausula (documento_id, comite_id, tipo, ordem, texto)
select doc.id, doc.comite_id, case when x <= 10 then 'preambular' else 'operativa' end, x, 'Cláusula ' || x
from doc cross join generate_series(1, 40) as x;

insert into public.veiculo (id, comite_id, nome) select id, id, 'Veículo ' || n from c;
insert into public.noticia (id, veiculo_id, comite_id, tipo, titulo, texto, status, publicada_em)
select gen_random_uuid(), c.id, c.id, 'reportagem', 'Matéria ' || g, repeat('Texto. ', 200), 'publicada',
	now() - random() * interval '30 hours'
from c cross join generate_series(1, 60) as g;
insert into public.aviso (evento_id, comite_id, texto, criado_em)
select '00000000-0000-0000-0000-00000000e7e7', null, 'Aviso ' || g, now() - g * interval '1 hour' from generate_series(1, 40) as g;

set local session_replication_role = origin;
analyze;

-- Quem consulta: a delegação D1 do primeiro comitê, a crise e a sessão atual dele.
select d.id as eu, d.comite_id as comite, (select id from s where s.comite_id = d.comite_id and k = 12) as sessao,
	(select id from c where n = 1) as crise_c,
	(select v.id from v join s on s.id = v.sessao_id where s.comite_id = d.comite_id and s.k = 12 limit 1) as votacao,
	(select doc.id from doc join bloco_membro bm on bm.bloco_id = doc.bloco_id where bm.delegacao_id = d.id limit 1) as documento
from d where d.n = 1 and d.m = 1 \gset
select pessoa_id as crise from public.participacao where papel = 'crise' and comite_id = :'comite' \gset

create function pg_temp.como(p uuid) returns void language sql as $$
	select set_config('role', 'authenticated', true),
		set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;

\echo '== Delegado: avisos da Agora'
select pg_temp.como(:'eu');
explain (analyze, costs off, timing on, summary on)
select id, texto, criado_em from public.aviso order by criado_em desc limit 20;

\echo '== Delegado: notas da própria delegação (Agora e tela da crise)'
explain (analyze, costs off, summary on)
select id, titulo, status, resposta from public.nota_crise where comite_id = :'comite' order by criado_em desc;

\echo '== Delegado: bilhetes do comitê (as regras deixam só os da delegação)'
explain (analyze, costs off, summary on)
select id, tipo, texto, criado_em from public.mensagem where comite_id = :'comite' order by criado_em;

\echo '== Delegado: sessão atual (pedidos de fala abertos, última votação, votos, presença)'
explain (analyze, costs off, summary on)
select id from public.pedido_fala where sessao_id = :'sessao' and situacao = 'aberto' order by criado_em;
explain (analyze, costs off, summary on)
select id from public.votacao where sessao_id = :'sessao' order by criado_em desc limit 1;
explain (analyze, costs off, summary on)
select delegacao_id, escolha from public.voto where votacao_id = :'votacao';
explain (analyze, costs off, summary on)
select delegacao_id, situacao from public.presenca where sessao_id = :'sessao';

\echo '== Delegado: cláusulas de um documento do bloco'
explain (analyze, costs off, summary on)
select id, tipo, ordem, texto from public.clausula where documento_id = :'documento' order by ordem;

\echo '== Delegado: capa da press'
explain (analyze, costs off, summary on)
select id, titulo, publicada_em from public.noticia where status = 'publicada' order by publicada_em desc limit 30;

\echo '== Crise: fila do comitê'
select pg_temp.como(:'crise');
explain (analyze, costs off, summary on)
select id, titulo, status, criado_em from public.nota_crise where comite_id = :'comite' order by criado_em;

rollback;
