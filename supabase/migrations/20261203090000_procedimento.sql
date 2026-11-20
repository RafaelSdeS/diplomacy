-- Passo 16: procedimento completo. Regras especiais de votação (CSNU, unanimidade),
-- votação nominal, sala fechada, divisão da questão, emendas, uma resolução por
-- tópico, fase de ação, assinaturas da não-confiança e o modo com tecnologia restrita
-- (a coluna comite.tecnologia_restrita existe desde o passo 02).


alter table public.votacao drop constraint votacao_regra_check;
alter table public.votacao add constraint votacao_regra_check
	check (regra in ('maioria_simples', 'dois_tercos', 'csnu', 'unanimidade'));
alter table public.votacao
	add column nominal boolean not null default false,
	add column partes uuid[] not null default '{}', -- CSNU: delegações partes na disputa, que se abstêm
	add column parte_de uuid references public.documento on delete cascade, -- divisão da questão
	add column parte_clausulas uuid[];

-- O projeto em votação pede votação nominal (a moção reconhecida pela mesa).
alter table public.documento add column votacao_nominal boolean not null default false;

-- Quem passou a vez na votação nominal (uma vez só).
create table public.passe (
	votacao_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid not null,
	primary key (votacao_id, delegacao_id),
	foreign key (votacao_id, comite_id) references public.votacao (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);

-- Assinaturas de uma moção (a não-confiança pede 1/5 das previstas).
create table public.assinatura_mocao (
	ponto_mocao_id uuid not null references public.ponto_mocao on delete cascade,
	comite_id uuid not null,
	delegacao_id uuid not null,
	primary key (ponto_mocao_id, delegacao_id),
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);

create table public.emenda (
	id uuid primary key default gen_random_uuid(),
	comite_id uuid not null,
	documento_id uuid not null, -- o projeto
	delegacao_id uuid not null, -- quem propôs
	acao text not null check (acao in ('acrescentar', 'suprimir', 'modificar')),
	clausula_id uuid references public.clausula on delete set null, -- alvo de suprimir e modificar
	texto text check (char_length(texto) <= 2000),
	status text not null default 'proposta' check (status in ('proposta', 'aprovada', 'rejeitada')),
	criada_em timestamptz not null default clock_timestamp(),
	unique (id, comite_id),
	foreign key (documento_id, comite_id) references public.documento (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade,
	check ((acao = 'suprimir') = (texto is null)),
	check ((acao = 'acrescentar') = (clausula_id is null))
);
create index on public.emenda (documento_id);

create table public.emenda_assinatura (
	emenda_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid not null,
	primary key (emenda_id, delegacao_id),
	foreign key (emenda_id, comite_id) references public.emenda (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);

alter table public.votacao add column emenda_id uuid references public.emenda on delete set null;

alter table public.passe enable row level security;
alter table public.assinatura_mocao enable row level security;
alter table public.emenda enable row level security;
alter table public.emenda_assinatura enable row level security;
create policy "o comitê vê quem passou a vez" on public.passe
	for select to authenticated using (public.participa_do_comite(comite_id));
create policy "o comitê vê as assinaturas das moções" on public.assinatura_mocao
	for select to authenticated using (public.participa_do_comite(comite_id));
create policy "o comitê vê as emendas" on public.emenda
	for select to authenticated using (public.participa_do_comite(comite_id));
create policy "o comitê vê quem assina as emendas" on public.emenda_assinatura
	for select to authenticated using (public.participa_do_comite(comite_id));

-- Ajudantes

-- A regra das questões substantivas do comitê.
create function public.regra_substantiva(p_comite uuid)
returns text
language sql stable security definer set search_path = ''
as $$
	select coalesce(public.regras(p_comite) ->> 'votacao_substantiva', 'maioria_simples');
$$;

-- O documento em votação no comitê (sala fechada), se houver.
create function public.projeto_em_votacao(p_comite uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
	select id from public.documento where comite_id = p_comite and status = 'em_votacao' limit 1;
$$;

-- Resultado (substitui o do passo 07). CSNU: 9 votos a favor e nenhum voto contra de
-- membro permanente. Unanimidade: todas as delegações previstas a favor (uma ausência,
-- uma abstenção ou um voto contra impedem).
create or replace function public.resultado(p_votacao uuid)
returns table (a_favor int, contra int, abstencoes int, base int, necessario int, aprovada boolean)
language sql stable set search_path = ''
as $$
	with v as (
		select * from public.votacao where id = p_votacao
	), presentes as (
		select count(*)::int as n
		from v
		join public.presenca p on p.sessao_id = v.sessao_id
		join public.delegacao d on d.id = p.delegacao_id
		where d.situacao <> 'suspensa' and (v.tipo = 'procedimental' or d.situacao = 'membro')
	), previstas as (
		select count(*)::int as n from v join public.delegacao d on d.comite_id = v.comite_id where d.situacao = 'membro'
	), contagem as (
		select
			count(*) filter (where escolha = 'a_favor')::int as af,
			count(*) filter (where escolha = 'contra')::int as co,
			count(*) filter (where escolha = 'abstencao')::int as ab,
			count(*) filter (
				where escolha = 'contra' and d.nome in (
					select jsonb_array_elements_text(public.regras(vt.comite_id) -> 'membros_permanentes')
				)
			)::int as veto
		from public.voto vt join public.delegacao d on d.id = vt.delegacao_id
		where vt.votacao_id = p_votacao
	), exigido as (
		select case v.regra
			when 'dois_tercos' then public.dois_tercos(presentes.n)
			when 'csnu' then 9
			when 'unanimidade' then previstas.n
			else public.maioria_simples(presentes.n)
		end as n
		from v, presentes, previstas
	)
	select contagem.af, contagem.co, contagem.ab,
		case when v.regra = 'unanimidade' then previstas.n else presentes.n end,
		exigido.n,
		contagem.af >= exigido.n and (v.regra <> 'csnu' or contagem.veto = 0)
	from v, contagem, presentes, previstas, exigido;
$$;

-- Quem pode votar, e como (substitui o do passo 07): mais as partes na disputa (só se
-- abstêm) e quem passou a vez na nominal (não se abstém depois).
create or replace function public.validar_voto(p_votacao uuid, p_delegacao uuid, p_escolha public.escolha_voto)
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
	v public.votacao;
	v_situacao text;
	v_presenca public.situacao_presenca;
begin
	select * into v from public.votacao where id = p_votacao;
	if v.id is null or not v.aberta then
		raise exception 'Esta votação não está aberta.';
	end if;
	select situacao::text into v_situacao from public.delegacao where id = p_delegacao and comite_id = v.comite_id;
	if v_situacao is null then
		raise exception 'Delegação de outro comitê.' using errcode = '42501';
	end if;
	if v_situacao = 'suspensa' then
		raise exception 'Delegação suspensa não vota.';
	end if;
	if v_situacao = 'observadora' and v.tipo = 'substantiva' then
		raise exception 'Delegação observadora não vota em questão substantiva.';
	end if;
	select situacao into v_presenca from public.presenca where sessao_id = v.sessao_id and delegacao_id = p_delegacao;
	if v_presenca is null then
		raise exception 'Só as delegações presentes na chamada votam.';
	end if;
	if p_escolha = 'abstencao' and v.tipo = 'procedimental' then
		raise exception 'Questão procedimental não aceita abstenção.';
	end if;
	if p_escolha = 'abstencao' and v_presenca = 'presente_e_votando' then
		raise exception 'Delegação presente e votando não se abstém.';
	end if;
	if p_delegacao = any (v.partes) and p_escolha <> 'abstencao' then
		raise exception 'Parte na disputa: a delegação é obrigada a se abster.';
	end if;
	if p_escolha = 'abstencao' and exists (select 1 from public.passe where votacao_id = p_votacao and delegacao_id = p_delegacao) then
		raise exception 'Quem passou a vez não pode se abster.';
	end if;
	return v.comite_id;
end $$;

-- Votação livre (substitui a do passo 07): a substantiva usa a regra do comitê.
create or replace function public.abrir_votacao_livre(p_comite uuid, p_objeto text, p_tipo text default 'procedimental')
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_votacao uuid;
begin
	perform public.exigir_presidencia(p_comite);
	if p_tipo = 'substantiva' and (
		select count(*) from public.presenca p
		join public.delegacao d on d.id = p.delegacao_id
		where p.sessao_id = public.sessao_atual(p_comite) and d.situacao = 'membro'
	) < public.quorum_votacao(p_comite) then
		raise exception 'Sem quórum para votação substantiva: são precisas % delegações presentes.',
			public.quorum_votacao(p_comite);
	end if;
	insert into public.votacao (comite_id, sessao_id, objeto, tipo, regra)
	values (
		p_comite, public.sessao_atual(p_comite), trim(p_objeto), p_tipo,
		case when p_tipo = 'substantiva' then public.regra_substantiva(p_comite) else 'maioria_simples' end
	)
	returning id into v_votacao;
	return v_votacao;
exception when unique_violation then
	raise exception 'Já há uma votação aberta neste comitê.' using errcode = '23505';
end $$;

-- CSNU: a mesa marca (ou desmarca) a delegação que é parte na disputa.
create function public.marcar_parte(p_votacao uuid, p_delegacao uuid, p_parte boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v public.votacao := (select x from public.votacao x where x.id = p_votacao);
begin
	perform public.exigir_mesa(v.comite_id);
	if not v.aberta or v.tipo <> 'substantiva' then
		raise exception 'Só numa votação substantiva aberta.';
	end if;
	update public.votacao set partes = case
		when p_parte then array(select distinct x from unnest(partes || p_delegacao) x)
		else array_remove(partes, p_delegacao)
	end
	where id = p_votacao;
	update public.estado_sessao set atualizado_em = now() where comite_id = v.comite_id;
end $$;

-- Votação nominal: a delegação chamada passa a vez (uma vez só; quem já votou, não).
create function public.passar_vez(p_votacao uuid, p_delegacao uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v public.votacao := (select x from public.votacao x where x.id = p_votacao);
begin
	perform public.exigir_mesa(v.comite_id);
	if not v.aberta or not v.nominal then
		raise exception 'Só numa votação nominal aberta.';
	end if;
	if exists (select 1 from public.voto where votacao_id = p_votacao and delegacao_id = p_delegacao) then
		raise exception 'A delegação já votou.';
	end if;
	insert into public.passe (votacao_id, comite_id, delegacao_id) values (p_votacao, v.comite_id, p_delegacao);
	update public.estado_sessao set atualizado_em = now() where comite_id = v.comite_id;
exception when unique_violation then
	raise exception 'Cada delegação passa a vez uma vez só.' using errcode = '23505';
end $$;

-- Pontos e moções: sala fechada (substitui enviar_ponto do passo 07). Durante a
-- votação de um projeto, só a divisão da questão e a votação nominal estão em ordem
-- (além dos pontos).
create or replace function public.enviar_ponto(
	p_comite uuid, p_tipo text, p_detalhe text default null, p_topico int default null, p_minutos int default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.exigir_delegacao(p_comite);
	v_estado public.estado_sessao;
	v_topicos int;
	v_sala_fechada boolean := public.projeto_em_votacao(p_comite) is not null;
begin
	select * into v_estado from public.estado_sessao where comite_id = p_comite;
	if v_sala_fechada and p_tipo not in ('ponto_ordem', 'ponto_duvida', 'privilegio_pessoal', 'divisao_questao', 'votacao_nominal') then
		raise exception 'Durante a votação de um projeto, só estão em ordem a divisão da questão e a votação nominal.';
	end if;
	if p_tipo = 'ponto_ordem' and v_estado.orador_delegacao_id is not null
		and v_estado.orador_delegacao_id <> v_delegacao then
		raise exception 'O ponto de ordem não interrompe o discurso de outra delegação.';
	end if;
	if p_tipo = 'topico_no_topo' then
		if v_estado.fase <> 'plenaria' or v_estado.etapa_plenaria <> 'topico' then
			raise exception 'A moção do tópico no topo vem no fim da plenária de abertura.';
		end if;
		select coalesce(array_length(topicos, 1), 0) into v_topicos from public.comite where id = p_comite;
		if p_topico is null or p_topico < 1 or p_topico > v_topicos then
			raise exception 'Escolha um dos tópicos do comitê.' using errcode = '22023';
		end if;
	elsif p_tipo = 'adiamento_sessao' then
		if v_estado.fase not in ('plenaria', 'debate') then
			raise exception 'Esta moção não está em ordem agora.';
		end if;
	elsif p_tipo in ('adiamento_debate', 'informal_informal', 'voto_desconfianca') then
		if v_estado.fase <> 'debate' then
			raise exception 'Esta moção só está em ordem durante o debate de um tópico.';
		end if;
		if p_tipo = 'informal_informal' and (p_minutos is null or p_minutos < 1) then
			raise exception 'Informe quantos minutos de informal-informal.' using errcode = '22023';
		end if;
	elsif p_tipo in ('divisao_questao', 'votacao_nominal') and not v_sala_fechada then
		raise exception 'Esta moção só está em ordem na votação de um projeto de resolução.';
	end if;

	insert into public.ponto_mocao (sessao_id, comite_id, delegacao_id, tipo, detalhe, topico, minutos)
	values (
		public.sessao_atual(p_comite), p_comite, v_delegacao, p_tipo, nullif(trim(p_detalhe), ''),
		case when p_tipo = 'topico_no_topo' then p_topico end,
		case when p_tipo = 'informal_informal' then p_minutos end
	);
end $$;

-- A votação nominal é aprovada quando o bureau a reconhece (substitui responder_ponto).
create or replace function public.responder_ponto(p_ponto uuid, p_status text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_ponto public.ponto_mocao := (select x from public.ponto_mocao x where x.id = p_ponto);
	v_projeto uuid := public.projeto_em_votacao(v_ponto.comite_id);
begin
	perform public.exigir_presidencia(v_ponto.comite_id);
	update public.ponto_mocao set status = p_status where id = p_ponto;
	if v_ponto.tipo = 'votacao_nominal' and p_status = 'aceito' and v_projeto is not null then
		update public.documento set votacao_nominal = true where id = v_projeto;
		update public.votacao set nominal = true
		where aberta and comite_id = v_ponto.comite_id and (documento_id = v_projeto or parte_de = v_projeto);
	end if;
end $$;

-- Não-confiança: as delegações assinam o pedido.
create function public.assinar_mocao(p_ponto uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_ponto public.ponto_mocao := (select x from public.ponto_mocao x where x.id = p_ponto);
	v_delegacao uuid := public.exigir_delegacao(v_ponto.comite_id);
begin
	if v_ponto.tipo <> 'voto_desconfianca' or v_ponto.status <> 'aberto' then
		raise exception 'Só um pedido de não-confiança aberto recebe assinaturas.';
	end if;
	insert into public.assinatura_mocao (ponto_mocao_id, comite_id, delegacao_id)
	values (p_ponto, v_ponto.comite_id, v_delegacao)
	on conflict do nothing;
	update public.estado_sessao set atualizado_em = now() where comite_id = v_ponto.comite_id;
end $$;

-- Assinaturas que a não-confiança pede: 1/5 das delegações previstas (arredondado para cima).
create function public.assinaturas_desconfianca(p_comite uuid)
returns int
language sql stable security definer set search_path = ''
as $$
	select ceil(
		count(*) * ((public.regras(p_comite) -> 'assinaturas_desconfianca_fracao' ->> 0)::numeric)
			/ ((public.regras(p_comite) -> 'assinaturas_desconfianca_fracao' ->> 1)::numeric)
	)::int
	from public.delegacao where comite_id = p_comite and situacao <> 'suspensa';
$$;

-- Gatilho: a votação da não-confiança só abre com as assinaturas.
create function public.conferir_assinaturas_desconfianca()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	if new.ponto_mocao_id is not null
		and (select tipo from public.ponto_mocao where id = new.ponto_mocao_id) = 'voto_desconfianca'
		and (select count(*) from public.assinatura_mocao where ponto_mocao_id = new.ponto_mocao_id)
			< public.assinaturas_desconfianca(new.comite_id) then
		raise exception 'A não-confiança precisa de % assinaturas antes da votação.', public.assinaturas_desconfianca(new.comite_id);
	end if;
	return new;
end $$;
create trigger conferir_assinaturas_desconfianca before insert on public.votacao
	for each row execute function public.conferir_assinaturas_desconfianca();

-- Projetos: procedimento de votação, divisão da questão e uma resolução por tópico

-- A mesa anuncia a votação do projeto: a sala fecha (só divisão e nominal em ordem).
create function public.iniciar_votacao_projeto(p_documento uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
begin
	perform public.exigir_mesa(d.comite_id);
	if d.tipo = 'working_paper' or d.status <> 'aprovado_mesa' then
		raise exception 'Só um projeto aprovado pela mesa vai a voto.';
	end if;
	if public.projeto_em_votacao(d.comite_id) is not null then
		raise exception 'Outro projeto já está em votação.';
	end if;
	perform public.exigir_topico_livre(d);
	update public.documento set status = 'em_votacao' where id = d.id;
end $$;

-- Uma resolução aprovada por tópico.
create function public.exigir_topico_livre(d public.documento)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
	if d.topico is not null and exists (
		select 1 from public.documento x
		where x.comite_id = d.comite_id and x.topico = d.topico and x.tipo = 'projeto' and x.status = 'aprovado' and x.id <> d.id
	) then
		raise exception 'Este tópico já tem uma resolução aprovada.';
	end if;
end $$;

-- A votação final (substitui a do passo 12): do projeto aprovado pela mesa ou em votação.
create or replace function public.abrir_votacao_projeto(p_documento uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
	v_votacao uuid;
begin
	perform public.exigir_mesa(d.comite_id);
	if d.tipo = 'working_paper' or d.status not in ('aprovado_mesa', 'em_votacao') then
		raise exception 'Só um projeto aprovado pela mesa vai a voto.';
	end if;
	if d.status = 'aprovado_mesa' and public.projeto_em_votacao(d.comite_id) is not null then
		raise exception 'Outro projeto já está em votação.';
	end if;
	perform public.exigir_topico_livre(d);
	v_votacao := public.abrir_votacao_livre(
		d.comite_id,
		left(
			(case d.tipo when 'projeto' then 'Projeto de resolução' else 'Resolução de crise' end)
				|| coalesce(' ' || d.numero, '') || ': ' || d.titulo,
			200
		),
		'substantiva'
	);
	update public.votacao set documento_id = d.id, nominal = d.votacao_nominal where id = v_votacao;
	update public.documento set status = 'em_votacao' where id = d.id;
	return v_votacao;
end $$;

-- Divisão da questão: a mesa põe em votação uma parte (cláusulas operativas). Rejeitada,
-- a parte sai do projeto; sem nenhuma operativa, o projeto é rejeitado.
create function public.abrir_votacao_parte(p_documento uuid, p_clausulas uuid[])
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
	v_numeros text;
	v_votacao uuid;
begin
	perform public.exigir_mesa(d.comite_id);
	if d.status <> 'em_votacao' then
		raise exception 'A divisão da questão acontece na votação do projeto.';
	end if;
	if coalesce(array_length(p_clausulas, 1), 0) = 0 or exists (
		select 1 from unnest(p_clausulas) x
		where not exists (select 1 from public.clausula c where c.id = x and c.documento_id = d.id and c.tipo = 'operativa')
	) then
		raise exception 'A divisão da questão só separa cláusulas operativas do projeto.' using errcode = '22023';
	end if;
	select string_agg(n::text, ', ' order by n) into v_numeros
	from (
		select row_number() over (order by ordem) as n, id from public.clausula
		where documento_id = d.id and tipo = 'operativa'
	) o where o.id = any (p_clausulas);
	v_votacao := public.abrir_votacao_livre(d.comite_id, left('Divisão da questão: operativas ' || v_numeros, 200), 'substantiva');
	update public.votacao set parte_de = d.id, parte_clausulas = p_clausulas, nominal = d.votacao_nominal where id = v_votacao;
	return v_votacao;
end $$;

-- Depois de aprovada uma resolução: o debate do tópico acaba, e o comitê passa ao
-- próximo tópico sem resolução, ou encerra.
create function public.apos_resolucao(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	e public.estado_sessao := (select x from public.estado_sessao x where x.comite_id = p_comite);
	v_proximo int;
begin
	if e.ordem_topicos is null then
		return;
	end if;
	select t into v_proximo from unnest(e.ordem_topicos) with ordinality as o(t, i)
	where not exists (
		select 1 from public.documento d where d.comite_id = p_comite and d.topico = o.t and d.tipo = 'projeto' and d.status = 'aprovado'
	)
	order by o.i limit 1;
	update public.estado_sessao set
		fase = case when v_proximo is null then 'encerrado' else 'debate' end::public.fase_comite,
		topico_atual = coalesce(v_proximo, topico_atual),
		orador_delegacao_id = null, cronometro_inicio = null, cronometro_duracao_seg = null,
		cronometro_pausado_restante_seg = null, atualizado_em = now()
	where comite_id = p_comite;
end $$;

-- Gatilho (substitui o do passo 12): o resultado vale para o projeto, para a parte da
-- divisão ou para a emenda.
create or replace function public.resultado_do_projeto()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
	v_projeto uuid;
	e public.emenda;
begin
	if new.documento_id is not null then
		update public.documento
		set status = case when new.aprovada then 'aprovado' when not new.aprovada then 'rejeitado' else 'aprovado_mesa' end
		where id = new.documento_id and status = 'em_votacao'
		returning id into v_projeto;
		if v_projeto is not null and new.aprovada is not null then
			if new.aprovada then
				perform public.apos_resolucao(new.comite_id);
			else
				update public.estado_sessao set fase = 'debate' where comite_id = new.comite_id and fase = 'acao';
			end if;
		end if;
	elsif new.parte_de is not null and new.aprovada is false then
		delete from public.clausula where id = any (new.parte_clausulas);
		if not exists (select 1 from public.clausula where documento_id = new.parte_de and tipo = 'operativa') then
			update public.documento set status = 'rejeitado' where id = new.parte_de;
			update public.estado_sessao set fase = 'debate' where comite_id = new.comite_id and fase = 'acao';
		end if;
	elsif new.emenda_id is not null and new.aprovada is not null then
		update public.emenda set status = case when new.aprovada then 'aprovada' else 'rejeitada' end
		where id = new.emenda_id returning * into e;
		if new.aprovada then
			if e.acao = 'acrescentar' then
				insert into public.clausula (documento_id, comite_id, tipo, texto, ordem, status)
				select e.documento_id, e.comite_id, 'operativa', e.texto, coalesce(max(ordem), 0) + 1, 'acordada'
				from public.clausula where documento_id = e.documento_id;
			elsif e.acao = 'suprimir' then
				delete from public.clausula where id = e.clausula_id;
			else
				update public.clausula set texto = e.texto, versao = versao + 1, atualizado_em = clock_timestamp()
				where id = e.clausula_id;
			end if;
		end if;
	end if;
	return null;
end $$;
drop trigger resultado_do_projeto on public.votacao;
create trigger resultado_do_projeto after update of aberta on public.votacao
	for each row when (old.aberta and not new.aberta and (new.documento_id is not null or new.parte_de is not null or new.emenda_id is not null))
	execute function public.resultado_do_projeto();

-- Consenso (substitui o do passo 12): uma resolução por tópico, e o comitê segue.
create or replace function public.aprovar_por_consenso(p_documento uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
begin
	perform public.exigir_mesa(d.comite_id);
	if d.tipo = 'working_paper' or d.status <> 'aprovado_mesa' then
		raise exception 'Só um projeto aprovado pela mesa é aprovado por consenso.';
	end if;
	perform public.exigir_topico_livre(d);
	update public.documento set status = 'aprovado' where id = d.id;
	perform public.apos_resolucao(d.comite_id);
end $$;

-- Sessão encerrada no meio do procedimento de votação: o projeto volta à mesa e a
-- sala reabre (a votação aberta, se havia, já volta pelo gatilho resultado_do_projeto).
create function public.interromper_votacao_projeto()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	update public.documento set status = 'aprovado_mesa', votacao_nominal = false
	where comite_id = new.comite_id and status = 'em_votacao';
	return null;
end $$;
create trigger interromper_votacao_projeto after update of fim on public.sessao
	for each row when (old.fim is null and new.fim is not null)
	execute function public.interromper_votacao_projeto();
revoke execute on function public.interromper_votacao_projeto() from public, anon, authenticated;

-- Fase de ação: começa quando a mesa aprova um projeto (gatilho no documento).
create function public.iniciar_fase_de_acao()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	if new.tipo <> 'working_paper' and new.status = 'aprovado_mesa' and old.status = 'enviado' then
		update public.estado_sessao set fase = 'acao', atualizado_em = now()
		where comite_id = new.comite_id and fase = 'debate';
	end if;
	return null;
end $$;
create trigger iniciar_fase_de_acao after update of status on public.documento
	for each row execute function public.iniciar_fase_de_acao();

-- Emendas

create function public.propor_emenda(p_documento uuid, p_acao text, p_clausula uuid, p_texto text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
	v_delegacao uuid := public.minha_delegacao(d.comite_id);
	v_id uuid;
begin
	if v_delegacao is null then
		raise exception 'Só delegados do comitê propõem emendas.' using errcode = '42501';
	end if;
	if d.tipo = 'working_paper' or d.status <> 'aprovado_mesa' then
		raise exception 'Emendas são para um projeto aprovado pela mesa, antes da votação.';
	end if;
	if p_acao <> 'acrescentar' and not exists (select 1 from public.clausula where id = p_clausula and documento_id = d.id) then
		raise exception 'Escolha a cláusula do projeto.' using errcode = '22023';
	end if;
	if p_acao <> 'suprimir' and coalesce(trim(p_texto), '') = '' then
		raise exception 'Escreva o texto da emenda.' using errcode = '22023';
	end if;
	insert into public.emenda (comite_id, documento_id, delegacao_id, acao, clausula_id, texto)
	values (
		d.comite_id, d.id, v_delegacao, p_acao, case when p_acao <> 'acrescentar' then p_clausula end,
		case when p_acao <> 'suprimir' then trim(p_texto) end
	)
	returning id into v_id;
	insert into public.emenda_assinatura (emenda_id, comite_id, delegacao_id) values (v_id, d.comite_id, v_delegacao);
	return v_id;
end $$;

create function public.assinar_emenda(p_emenda uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	e public.emenda := (select x from public.emenda x where x.id = p_emenda);
	v_delegacao uuid := public.minha_delegacao(e.comite_id);
begin
	if v_delegacao is null then
		raise exception 'Só delegados do comitê assinam emendas.' using errcode = '42501';
	end if;
	if e.status <> 'proposta' then
		raise exception 'Esta emenda já foi votada.';
	end if;
	insert into public.emenda_assinatura (emenda_id, comite_id, delegacao_id) values (p_emenda, e.comite_id, v_delegacao)
	on conflict do nothing;
end $$;

create function public.abrir_votacao_emenda(p_emenda uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	e public.emenda := (select x from public.emenda x where x.id = p_emenda);
	v_minimo int := (public.regras(e.comite_id) ->> 'assinaturas_emenda')::int;
	v_votacao uuid;
begin
	perform public.exigir_mesa(e.comite_id);
	if e.status <> 'proposta' then
		raise exception 'Esta emenda já foi votada.';
	end if;
	if (select count(*) from public.emenda_assinatura where emenda_id = p_emenda) < v_minimo then
		raise exception 'A emenda precisa de pelo menos % signatários.', v_minimo;
	end if;
	v_votacao := public.abrir_votacao_livre(
		e.comite_id,
		'Emenda (' || case e.acao when 'acrescentar' then 'acrescenta' when 'suprimir' then 'suprime' else 'modifica' end
			|| ') ao ' || coalesce((select 'projeto ' || numero from public.documento where id = e.documento_id), 'projeto'),
		'substantiva'
	);
	update public.votacao set emenda_id = p_emenda where id = v_votacao;
	return v_votacao;
end $$;

-- Tecnologia restrita: durante uma sessão aberta, os delegados não escrevem nada; a
-- mesa opera o app (registra falas e votos). Gatilho nas tabelas que eles escrevem.
create function public.tecnologia_restrita_agora(p_comite uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select coalesce((select tecnologia_restrita from public.comite where id = p_comite), false)
		and public.sessao_atual(p_comite) is not null;
$$;

create function public.bloquear_tecnologia_restrita()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	if auth.uid() is not null and public.tecnologia_restrita_agora(new.comite_id)
		and not public.tem_papel(new.comite_id, '{mesa,crise,press,secretaria}') then
		raise exception 'Com tecnologia restrita, a mesa opera o app durante a sessão.' using errcode = '42501';
	end if;
	return new;
end $$;

do $$
declare
	v_tabela text;
begin
	foreach v_tabela in array array[
		'pedido_fala', 'ponto_mocao', 'lista_oradores', 'voto', 'passe', 'assinatura_mocao', 'nota_crise', 'carta',
		'dpo', 'proposta_agenda', 'bloco_membro', 'documento', 'clausula', 'proposta_alteracao', 'comentario',
		'assinatura', 'emenda', 'emenda_assinatura'
	] loop
		execute format(
			'create trigger bloquear_tecnologia_restrita before insert or update on public.%I for each row execute function public.bloquear_tecnologia_restrita()',
			v_tabela
		);
	end loop;
end $$;

-- Com tecnologia restrita, a mesa levanta a placa pela delegação.
create function public.registrar_pedido_fala(p_comite uuid, p_delegacao uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_mesa(p_comite);
	if public.sessao_atual(p_comite) is null then
		raise exception 'Nenhuma sessão aberta.' using errcode = 'P0002';
	end if;
	insert into public.pedido_fala (sessao_id, comite_id, delegacao_id)
	values (public.sessao_atual(p_comite), p_comite, p_delegacao)
	on conflict do nothing;
end $$;

-- Os novos gatilhos e ajudantes ao vivo também avisam o canal do comitê.
do $$
declare
	v_tabela text;
begin
	foreach v_tabela in array array['passe', 'assinatura_mocao', 'emenda_assinatura'] loop
		execute format(
			'create trigger transmitir after insert or update or delete on public.%I for each row execute function public.transmitir(''comite'', ''comite_id'')',
			v_tabela
		);
	end loop;
end $$;
create trigger transmitir after insert or update or delete on public.emenda
	for each row execute function public.transmitir('comite', 'comite_id', 'documento', 'documento_id');

revoke execute on function
	public.regra_substantiva(uuid), public.projeto_em_votacao(uuid), public.exigir_topico_livre(public.documento),
	public.apos_resolucao(uuid), public.resultado_do_projeto(), public.iniciar_fase_de_acao(),
	public.conferir_assinaturas_desconfianca(), public.bloquear_tecnologia_restrita(), public.tecnologia_restrita_agora(uuid)
from public, anon, authenticated;
revoke execute on function
	public.marcar_parte(uuid, uuid, boolean), public.passar_vez(uuid, uuid), public.assinar_mocao(uuid),
	public.assinaturas_desconfianca(uuid), public.iniciar_votacao_projeto(uuid), public.abrir_votacao_parte(uuid, uuid[]),
	public.propor_emenda(uuid, text, uuid, text), public.assinar_emenda(uuid), public.abrir_votacao_emenda(uuid),
	public.registrar_pedido_fala(uuid, uuid)
from public, anon;
grant execute on function
	public.marcar_parte(uuid, uuid, boolean), public.passar_vez(uuid, uuid), public.assinar_mocao(uuid),
	public.assinaturas_desconfianca(uuid), public.iniciar_votacao_projeto(uuid), public.abrir_votacao_parte(uuid, uuid[]),
	public.propor_emenda(uuid, text, uuid, text), public.assinar_emenda(uuid), public.abrir_votacao_emenda(uuid),
	public.registrar_pedido_fala(uuid, uuid)
to authenticated;
