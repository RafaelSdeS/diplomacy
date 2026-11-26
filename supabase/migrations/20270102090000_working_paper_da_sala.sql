-- Passo 63 (lote 1): um working paper por grande item da agenda, de toda a sala, e um projeto por
-- tópico. Os documentos da sala não têm bloco dono (bloco_id nulo) e todo o comitê os vê.
-- - Adotada a agenda, cada item de primeiro nível ganha o seu working paper, em branco.
-- - O redator do bloco (ou a delegação sem bloco) propõe incluir, alterar, mover ou retirar;
--   todas as delegações marcam posição; quem preside a sessão aceita (o texto muda) ou rejeita.
-- - A mesa transforma os working papers do tópico em projeto: preâmbulos primeiro, depois as
--   operativas, na ordem dos itens; as assinaturas passam (menos as das observadoras). O projeto
--   nasce fechado (só correções de forma, pela mesa) e vai à fase de ação com 5 assinaturas.
-- - Rejeitado o projeto, os working papers do tópico reabrem.
-- Os documentos por bloco, as rodadas, o envio e as emendas continuam até o lote 4.

-- Documentos da sala

alter table public.documento alter column bloco_id drop not null;
alter table public.documento add constraint documento_crise_tem_bloco check (tipo <> 'resolucao_crise' or bloco_id is not null);
create unique index documento_um_wp_por_item on public.documento (ponto_pauta_id)
	where tipo = 'working_paper' and bloco_id is null;
create unique index documento_um_projeto_por_topico on public.documento (comite_id, topico)
	where tipo = 'projeto' and bloco_id is null and status <> 'rejeitado';

-- O documento da sala é do comitê inteiro.
create or replace function public.pode_ver_documento(p_documento uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.documento d
		where d.id = p_documento and (
			(d.bloco_id is null and public.participa_do_comite(d.comite_id))
			or public.sou_do_bloco(d.bloco_id)
			or (d.status <> 'rascunho' and public.tem_papel(d.comite_id, '{mesa}'))
			or (d.status not in ('rascunho', 'enviado') and public.participa_do_comite(d.comite_id))
		)
	);
$$;

-- No documento da sala, toda delegação comenta e marca posição nas cláusulas.
create or replace function public.voz_no_documento(p_documento uuid)
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
begin
	if d.bloco_id is null and public.minha_delegacao(d.comite_id) is not null then
		return public.minha_delegacao(d.comite_id);
	end if;
	if public.sou_do_bloco(d.bloco_id) then
		return public.minha_delegacao(d.comite_id);
	end if;
	if public.tem_papel(d.comite_id, '{mesa}') and public.pode_ver_documento(d.id) then
		return null;
	end if;
	raise exception 'Só as delegações do bloco e a mesa fazem isso.' using errcode = '42501';
end $$;

-- Os working papers nascem com a agenda

create function public.criar_working_papers(p_proposta uuid)
returns void
language sql security definer set search_path = ''
as $$
	insert into public.documento (comite_id, tipo, titulo, topico, ponto_pauta_id)
	select p.comite_id, 'working_paper', left(p.texto, 200), a.topico, p.id
	from public.ponto_pauta p
	join public.proposta_agenda a on a.id = p.proposta_id
	where p.proposta_id = p_proposta and a.adotada and p.pai_id is null
	on conflict do nothing;
$$;

create function public.working_papers_da_agenda()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	if tg_table_name = 'proposta_agenda' then
		perform public.criar_working_papers(new.id);
	elsif tg_op = 'INSERT' then
		perform public.criar_working_papers(new.proposta_id);
	else
		-- O item mudou de texto: o working paper acompanha o nome.
		update public.documento set titulo = left(new.texto, 200)
		where ponto_pauta_id = new.id and tipo = 'working_paper' and bloco_id is null;
	end if;
	return null;
end $$;

create trigger working_papers_da_agenda after insert or update of adotada on public.proposta_agenda
	for each row when (new.adotada) execute function public.working_papers_da_agenda();
create trigger working_papers_da_agenda after insert on public.ponto_pauta
	for each row when (new.pai_id is null) execute function public.working_papers_da_agenda();
create trigger titulo_do_working_paper after update of texto on public.ponto_pauta
	for each row when (new.pai_id is null) execute function public.working_papers_da_agenda();

-- As agendas já adotadas ganham os seus.
select public.criar_working_papers(id) from public.proposta_agenda where adotada;

-- Propostas no documento da sala (as do editor ganham a ação, o bloco e o motivo)

alter table public.proposta_alteracao
	add column acao text not null default 'alterar' check (acao in ('alterar', 'incluir', 'retirar', 'mover')),
	add column tipo text check (tipo in ('preambular', 'operativa')), -- incluir: o tipo da cláusula nova
	add column depois_de uuid references public.clausula on delete set null, -- incluir ou mover (nulo: no começo do tipo)
	add column motivo text check (char_length(motivo) <= 280),
	add column bloco_id uuid references public.bloco on delete set null, -- em nome de qual bloco (nulo: sem bloco)
	add column autor_id uuid references public.pessoa on delete set null,
	add column decidida_em timestamptz,
	alter column clausula_id drop not null,
	alter column texto_novo drop not null,
	add constraint proposta_alteracao_por_acao check (case acao
		when 'alterar' then texto_novo is not null
		when 'incluir' then texto_novo is not null and tipo is not null
		else true end);
-- A proposta decidida fica no histórico, mesmo que a cláusula saia.
alter table public.proposta_alteracao drop constraint proposta_alteracao_clausula_id_fkey;
alter table public.proposta_alteracao add constraint proposta_alteracao_clausula_id_fkey
	foreign key (clausula_id) references public.clausula on delete set null;

create table public.posicao_proposta (
	proposta_id uuid not null references public.proposta_alteracao on delete cascade,
	documento_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid not null,
	posicao text not null check (posicao in ('apoio', 'ressalva', 'contra')),
	autor_id uuid references public.pessoa on delete set null,
	atualizado_em timestamptz not null default clock_timestamp(),
	primary key (proposta_id, delegacao_id),
	foreign key (documento_id, comite_id) references public.documento (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);
create index on public.posicao_proposta (documento_id);
alter table public.posicao_proposta enable row level security;
create policy "posições nas propostas: de quem vê o documento" on public.posicao_proposta
	for select to authenticated using (public.pode_ver_documento(documento_id));
create trigger transmitir after insert or update or delete on public.posicao_proposta
	for each row execute function public.transmitir('documento', 'documento_id');

-- Quem propõe: o redator do bloco, ou a delegação sem bloco (a própria redatora).
create function public.propor_no_documento(
	p_documento uuid,
	p_acao text,
	p_clausula uuid default null,
	p_texto text default null,
	p_tipo text default null,
	p_depois uuid default null,
	p_motivo text default null,
	p_id uuid default gen_random_uuid()
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
	v_delegacao uuid := public.minha_delegacao(d.comite_id);
	v_bloco uuid := public.meu_bloco(d.comite_id);
begin
	if exists (select 1 from public.proposta_alteracao where id = p_id) then
		return p_id; -- a caixa de saída reenviou
	end if;
	if d.id is null or d.bloco_id is not null or d.tipo <> 'working_paper' then
		raise exception 'Só se propõe no working paper da sala.' using errcode = '22023';
	end if;
	if d.status <> 'rascunho' then
		raise exception 'Este working paper já virou projeto: as propostas estão fechadas.' using errcode = '22023';
	end if;
	if v_delegacao is null then
		raise exception 'Só as delegações do comitê propõem.' using errcode = '42501';
	end if;
	if v_bloco is not null and not public.sou_redator(v_bloco) then
		raise exception 'Quem propõe é o redator do seu bloco: leve a sugestão a ele na conversa do bloco.' using errcode = '42501';
	end if;
	if p_acao in ('alterar', 'retirar', 'mover') and p_clausula is null then
		raise exception 'Escolha a cláusula.' using errcode = '22023';
	end if;
	if exists (
		select 1 from unnest(array[p_clausula, p_depois]) as x(id)
		where x.id is not null and not exists (select 1 from public.clausula c where c.id = x.id and c.documento_id = d.id)
	) then
		raise exception 'Essa cláusula não é deste documento.' using errcode = '22023';
	end if;
	insert into public.proposta_alteracao (id, clausula_id, documento_id, comite_id, delegacao_id, texto_novo, acao, tipo, depois_de, motivo, bloco_id, autor_id)
	values (p_id, p_clausula, d.id, d.comite_id, v_delegacao, nullif(trim(p_texto), ''), p_acao, p_tipo, p_depois, nullif(trim(p_motivo), ''), v_bloco, auth.uid());
	return p_id;
end $$;

-- Toda delegação marca apoio, ressalva ou contra (nulo apaga) enquanto a proposta está em debate.
create function public.marcar_posicao_proposta(p_proposta uuid, p_posicao text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	pr public.proposta_alteracao := (select x from public.proposta_alteracao x where x.id = p_proposta);
	v_delegacao uuid := public.minha_delegacao(pr.comite_id);
begin
	if v_delegacao is null then
		raise exception 'Só as delegações marcam posição.' using errcode = '42501';
	end if;
	if pr.status <> 'aberta' then
		raise exception 'Esta proposta já foi decidida.' using errcode = '22023';
	end if;
	if p_posicao is null then
		delete from public.posicao_proposta where proposta_id = pr.id and delegacao_id = v_delegacao;
		return;
	end if;
	insert into public.posicao_proposta (proposta_id, documento_id, comite_id, delegacao_id, posicao, autor_id)
	values (pr.id, pr.documento_id, pr.comite_id, v_delegacao, p_posicao, auth.uid())
	on conflict (proposta_id, delegacao_id) do update
		set posicao = excluded.posicao, autor_id = excluded.autor_id, atualizado_em = clock_timestamp();
end $$;

-- Depois do debate, quem preside aceita (o texto muda no lugar) ou rejeita. O sinal de consenso
-- é só o termômetro, na tela.
create function public.decidir_proposta(p_proposta uuid, p_aceitar boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	pr public.proposta_alteracao := (select x from public.proposta_alteracao x where x.id = p_proposta);
	d public.documento := (select x from public.documento x where x.id = pr.documento_id);
	c public.clausula := (select x from public.clausula x where x.id = pr.clausula_id);
	v_ordem numeric;
begin
	if d.id is null or d.bloco_id is not null then
		raise exception 'Só se propõe no working paper da sala.' using errcode = '22023';
	end if;
	if not public.pode_presidir(d.comite_id) then
		raise exception 'Só quem preside a sessão aceita ou rejeita as propostas.' using errcode = '42501';
	end if;
	if pr.status <> 'aberta' then
		raise exception 'Esta proposta já foi decidida.' using errcode = '22023';
	end if;
	if d.status <> 'rascunho' then
		raise exception 'Este working paper já virou projeto: as propostas estão fechadas.' using errcode = '22023';
	end if;
	if pr.acao <> 'incluir' and c.id is null then
		raise exception 'A cláusula desta proposta já saiu do texto.' using errcode = '22023';
	end if;
	update public.proposta_alteracao set status = case when p_aceitar then 'aceita' else 'recusada' end, decidida_em = clock_timestamp()
	where id = pr.id;
	if not p_aceitar then
		return;
	end if;
	case pr.acao
	when 'alterar' then
		update public.clausula set texto = pr.texto_novo, versao = versao + 1, atualizado_em = clock_timestamp() where id = c.id;
	when 'retirar' then
		-- As outras propostas sobre ela perdem o objeto.
		update public.proposta_alteracao set status = 'recusada', decidida_em = clock_timestamp()
		where clausula_id = c.id and status = 'aberta';
		delete from public.clausula where id = c.id;
	when 'incluir' then
		-- Depois da escolhida; sem ela, no fim do tipo (a preambular nova vem antes das operativas).
		v_ordem := coalesce(
			(select ordem from public.clausula where id = pr.depois_de),
			(select max(ordem) from public.clausula where documento_id = d.id and tipo = pr.tipo and pai_id is null),
			case when pr.tipo = 'preambular' then 0 end,
			(select max(ordem) from public.clausula where documento_id = d.id),
			0
		);
		update public.clausula set ordem = ordem + 1 where documento_id = d.id and ordem > v_ordem;
		insert into public.clausula (documento_id, comite_id, tipo, ordem, texto)
		values (d.id, d.comite_id, pr.tipo, v_ordem + 1, pr.texto_novo);
	when 'mover' then
		-- Depois da escolhida; sem ela, no começo das do mesmo tipo. Depois, renumera.
		v_ordem := coalesce(
			(select ordem + 0.5 from public.clausula where id = pr.depois_de),
			(select min(ordem) - 0.5 from public.clausula where documento_id = d.id and tipo = c.tipo and pai_id is not distinct from c.pai_id)
		);
		update public.clausula set ordem = v_ordem where id = c.id;
		update public.clausula x set ordem = r.n
		from (select id, row_number() over (order by ordem, id) as n from public.clausula where documento_id = d.id) r
		where x.id = r.id;
	end case;
end $$;

-- Quem preside ou a mesa põe em foco a cláusula do documento da sala; no do bloco, o redator.
create or replace function public.focar_clausula(p_documento uuid, p_clausula uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
begin
	if d.bloco_id is null then
		if not (public.pode_presidir(d.comite_id) or public.tem_papel(d.comite_id, '{mesa}')) then
			raise exception 'Só quem preside ou a mesa põe uma cláusula em foco.' using errcode = '42501';
		end if;
	else
		d := public.exigir_editavel(p_documento);
		perform public.exigir_redator(d.bloco_id);
	end if;
	update public.documento set clausula_em_foco_id = p_clausula where id = p_documento;
end $$;

-- Assinaturas

-- No documento da sala, qualquer delegação assina o working paper aberto; o projeto, só as
-- delegações membros, até a fase de ação. No do bloco, como antes.
create or replace function public.assinar(p_documento uuid, p_assinar boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
	v_delegacao uuid;
begin
	if d.bloco_id is null then
		v_delegacao := public.minha_delegacao(d.comite_id);
		if v_delegacao is null then
			raise exception 'Só as delegações assinam.' using errcode = '42501';
		end if;
		if d.tipo = 'projeto' then
			if d.status <> 'enviado' then
				raise exception 'Na fase de ação, as assinaturas do projeto não mudam.';
			end if;
			if p_assinar and (select situacao from public.delegacao where id = v_delegacao) <> 'membro' then
				raise exception 'Delegação observadora não assina o projeto.';
			end if;
		elsif d.status <> 'rascunho' then
			raise exception 'Este working paper já virou projeto: as assinaturas passaram para ele.';
		end if;
	else
		v_delegacao := public.exigir_membro(d.bloco_id);
		if d.status <> 'rascunho' then
			raise exception 'Depois do envio, as assinaturas não mudam.';
		end if;
	end if;
	if p_assinar then
		insert into public.assinatura (documento_id, comite_id, delegacao_id) values (d.id, d.comite_id, v_delegacao)
		on conflict do nothing;
	else
		delete from public.assinatura where documento_id = d.id and delegacao_id = v_delegacao;
	end if;
end $$;

-- Do working paper ao projeto

create function public.transformar_em_projeto(p_comite uuid, p_topico int)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_projeto uuid;
	v_wps uuid[];
begin
	perform public.exigir_mesa(p_comite);
	if exists (
		select 1 from public.documento
		where comite_id = p_comite and topico = p_topico and tipo = 'projeto' and bloco_id is null and status <> 'rejeitado'
	) then
		raise exception 'O tópico já tem projeto.' using errcode = '23505';
	end if;
	v_wps := array(
		select wp.id from public.documento wp
		where wp.comite_id = p_comite and wp.topico = p_topico and wp.tipo = 'working_paper' and wp.bloco_id is null and wp.status = 'rascunho'
	);
	if not exists (select 1 from public.clausula where documento_id = any (v_wps)) then
		raise exception 'Os working papers do tópico ainda não têm cláusulas.' using errcode = '22023';
	end if;
	insert into public.documento (comite_id, tipo, titulo, topico, status, enviado_em, numero)
	values (
		p_comite, 'projeto',
		left(coalesce((select topicos[p_topico] from public.comite where id = p_comite), 'Projeto de resolução'), 200),
		p_topico, 'enviado', clock_timestamp(),
		coalesce((select max(numero) from public.documento where comite_id = p_comite and tipo = 'projeto'), 0) + 1
	)
	returning id into v_projeto;
	-- Primeiro os preâmbulos, depois as operativas, na ordem dos itens da agenda, e o resto no fim.
	insert into public.clausula (documento_id, comite_id, tipo, ordem, texto, origem_id)
	select v_projeto, p_comite, c.tipo,
		row_number() over (order by case c.tipo when 'preambular' then 0 when 'operativa' then 1 else 2 end, p.ordem nulls last, wp.criado_em, c.ordem),
		c.texto, c.id
	from public.documento wp
	join public.clausula c on c.documento_id = wp.id and c.pai_id is null
	left join public.ponto_pauta p on p.id = wp.ponto_pauta_id
	where wp.id = any (v_wps);
	-- Os subitens seguem as cláusulas de onde vieram.
	insert into public.clausula (documento_id, comite_id, tipo, pai_id, ordem, texto, origem_id)
	select v_projeto, p_comite, 'subitem', novo.id, s.ordem, s.texto, s.id
	from public.clausula s
	join public.clausula novo on novo.documento_id = v_projeto and novo.origem_id = s.pai_id
	where s.documento_id = any (v_wps) and s.tipo = 'subitem';
	-- As assinaturas passam, menos as das observadoras.
	insert into public.assinatura (documento_id, comite_id, delegacao_id)
	select distinct v_projeto, p_comite, a.delegacao_id
	from public.assinatura a
	join public.delegacao dl on dl.id = a.delegacao_id and dl.situacao = 'membro'
	where a.documento_id = any (v_wps);
	-- Os working papers ficam só para leitura (reabrem se o projeto for rejeitado).
	update public.documento set status = 'aprovado', clausula_em_foco_id = null where id = any (v_wps);
	return v_projeto;
end $$;

-- A mesa faz as correções de forma no projeto da sala, antes da votação.
create function public.corrigir_clausula(p_clausula uuid, p_texto text, p_versao int)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
	c public.clausula := (select x from public.clausula x where x.id = p_clausula);
	d public.documento := (select x from public.documento x where x.id = c.documento_id);
	v_versao int;
begin
	perform public.exigir_mesa(d.comite_id);
	if d.bloco_id is not null or d.tipo <> 'projeto' or d.status not in ('enviado', 'aprovado_mesa') then
		raise exception 'Só o projeto do tópico, antes da votação, recebe correções de forma.' using errcode = '22023';
	end if;
	update public.clausula set texto = trim(p_texto), versao = versao + 1, atualizado_em = clock_timestamp()
	where id = c.id and versao = p_versao
	returning versao into v_versao;
	if v_versao is null then
		raise exception 'Outra pessoa alterou esta cláusula antes. A versão nova foi carregada.' using errcode = '40001';
	end if;
	return v_versao;
end $$;

-- A mesa leva o projeto da sala à fase de ação com o mínimo de assinaturas (só as das membros
-- contam). Ele não volta a rascunho: rejeitado na votação, os working papers reabrem.
create or replace function public.aprovar_documento(p_documento uuid, p_aprovar boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
	v_minimo int := (public.regras(d.comite_id) ->> 'assinaturas_projeto_min')::int;
begin
	perform public.exigir_mesa(d.comite_id);
	if d.status <> 'enviado' then
		raise exception 'Só um documento enviado espera a mesa.';
	end if;
	if d.bloco_id is null then
		if not p_aprovar then
			raise exception 'O projeto do tópico não volta: rejeitado na votação, os working papers reabrem.' using errcode = '22023';
		end if;
		if (
			select count(*) from public.assinatura a
			join public.delegacao dl on dl.id = a.delegacao_id and dl.situacao = 'membro'
			where a.documento_id = d.id
		) < v_minimo then
			raise exception 'O projeto precisa de pelo menos % signatários.', v_minimo;
		end if;
	end if;
	update public.documento set status = case when p_aprovar then 'aprovado_mesa' else 'rascunho' end where id = d.id;
end $$;

-- Rejeitado o projeto da sala, os working papers do tópico reabrem para propostas.
create function public.reabrir_working_papers()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	update public.documento set status = 'rascunho'
	where comite_id = new.comite_id and topico = new.topico and tipo = 'working_paper' and bloco_id is null and status = 'aprovado';
	return null;
end $$;

create trigger reabrir_working_papers after update of status on public.documento
	for each row when (new.status = 'rejeitado' and new.tipo = 'projeto' and new.bloco_id is null)
	execute function public.reabrir_working_papers();

-- Permissões

revoke execute on function
	public.criar_working_papers(uuid), public.working_papers_da_agenda(), public.reabrir_working_papers()
from public, anon, authenticated;
revoke execute on function
	public.propor_no_documento(uuid, text, uuid, text, text, uuid, text, uuid),
	public.marcar_posicao_proposta(uuid, text),
	public.decidir_proposta(uuid, boolean),
	public.transformar_em_projeto(uuid, int),
	public.corrigir_clausula(uuid, text, int)
from public, anon;
grant execute on function
	public.propor_no_documento(uuid, text, uuid, text, text, uuid, text, uuid),
	public.marcar_posicao_proposta(uuid, text),
	public.decidir_proposta(uuid, boolean),
	public.transformar_em_projeto(uuid, int),
	public.corrigir_clausula(uuid, text, int)
to authenticated;
