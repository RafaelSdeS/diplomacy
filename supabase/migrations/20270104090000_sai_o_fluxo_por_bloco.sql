-- Passo 63 (lote 4): sai o fluxo por bloco. O working paper e o projeto são da sala; o bloco
-- escreve só a resolução de crise (que a crise pede rápido). Os documentos antigos dos blocos
-- ficam só para leitura; as rodadas e as emendas saem (as tabelas ficam, com o histórico).

-- O bloco cria só a resolução de crise.
create or replace function public.criar_documento(
	p_bloco uuid, p_tipo text, p_titulo text, p_topico int default null,
	p_ponto_pauta uuid default null, p_atualizacao uuid default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.exigir_membro(p_bloco);
	v_comite uuid := (select comite_id from public.bloco where id = p_bloco);
	v_id uuid;
begin
	if p_tipo <> 'resolucao_crise' then
		raise exception 'O working paper e o projeto são da sala: nascem com a agenda e com a mesa.' using errcode = '22023';
	end if;
	if (select situacao from public.delegacao where id = v_delegacao) <> 'membro' then
		raise exception 'Delegação observadora não apresenta resolução de crise.';
	end if;
	insert into public.documento (comite_id, bloco_id, tipo, titulo, topico, atualizacao_crise_id)
	values (v_comite, p_bloco, p_tipo, trim(p_titulo), p_topico, p_atualizacao)
	returning id into v_id;
	return v_id;
end $$;

-- Só a resolução de crise do bloco muda; os outros documentos dos blocos ficaram só para leitura.
create or replace function public.exigir_editavel(p_documento uuid)
returns public.documento
language plpgsql stable security definer set search_path = ''
as $$
declare
	d public.documento;
begin
	select * into d from public.documento where id = p_documento;
	if d.id is null then
		raise exception 'Documento não encontrado.' using errcode = 'P0002';
	end if;
	if d.bloco_id is not null and d.tipo <> 'resolucao_crise' then
		raise exception 'Os documentos dos blocos ficaram só para leitura: o trabalho agora é no working paper da sala.' using errcode = '22023';
	end if;
	if d.status <> 'rascunho' then
		raise exception 'O documento já foi enviado à mesa e não muda mais.';
	end if;
	return d;
end $$;

-- O envio à mesa fica para a resolução de crise.
create or replace function public.enviar_documento(p_documento uuid, p_aprovacao text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := public.exigir_editavel(p_documento);
	v_minimo int := (public.regras(d.comite_id) ->> 'assinaturas_projeto_min')::int;
begin
	perform public.exigir_redator(d.bloco_id);
	if not exists (select 1 from public.clausula where documento_id = d.id) then
		raise exception 'O documento está vazio.';
	end if;
	if (select count(*) from public.assinatura where documento_id = d.id) < v_minimo then
		raise exception 'O projeto precisa de pelo menos % signatários.', v_minimo;
	end if;
	if p_aprovacao is null then
		raise exception 'Escolha a aprovação: por consenso ou por votação.' using errcode = '22023';
	end if;
	update public.documento set
		status = 'enviado',
		aprovacao = p_aprovacao,
		clausula_em_foco_id = null,
		numero = coalesce((select max(numero) from public.documento where comite_id = d.comite_id and tipo = d.tipo), 0) + 1
	where id = d.id;
end $$;

-- Saem as rodadas e as emendas.
drop function public.abrir_rodada(uuid, int);
drop function public.propor_emenda(uuid, text, uuid, text);
drop function public.assinar_emenda(uuid);
drop function public.abrir_votacao_emenda(uuid);

-- Os dados que já existem: o projeto mais adiantado de cada tópico vira o projeto da sala (se o
-- tópico ainda não tem um); em rascunho, nasce fechado, como o da sala.
with candidato as (
	select distinct on (d.comite_id, d.topico) d.id, d.status, d.numero, d.comite_id
	from public.documento d
	where d.tipo = 'projeto' and d.bloco_id is not null and d.topico is not null and d.status <> 'rejeitado'
		and not exists (
			select 1 from public.documento s
			where s.comite_id = d.comite_id and s.topico = d.topico and s.tipo = 'projeto' and s.bloco_id is null and s.status <> 'rejeitado'
		)
	order by d.comite_id, d.topico, array_position(array['aprovado', 'em_votacao', 'aprovado_mesa', 'enviado', 'rascunho'], d.status), d.criado_em desc
)
update public.documento d set
	bloco_id = null,
	status = case when c.status = 'rascunho' then 'enviado' else c.status end,
	numero = coalesce(c.numero, (select coalesce(max(x.numero), 0) + 1 from public.documento x where x.comite_id = c.comite_id and x.tipo = 'projeto'))
from candidato c
where d.id = c.id;

-- Com o projeto da sala, os working papers do tópico ficam só para leitura (reabrem se ele for rejeitado).
update public.documento w set status = 'aprovado'
where w.tipo = 'working_paper' and w.bloco_id is null and w.status = 'rascunho'
	and exists (
		select 1 from public.documento p
		where p.comite_id = w.comite_id and p.topico = w.topico and p.tipo = 'projeto' and p.bloco_id is null and p.status <> 'rejeitado'
	);
