-- Passo 10: DPO (documento de posição oficial) e cartas diplomáticas. A impressão
-- no formato dos documentos do UNOCT fica no app (HTML e CSS de impressão).

create table public.dpo (
	id uuid primary key default gen_random_uuid(),
	comite_id uuid not null,
	delegacao_id uuid not null,
	topico int not null check (topico > 0),
	texto text not null default '' check (char_length(texto) <= 12000), -- parágrafos separados por linha em branco
	referencias text[] not null default '{}' check (array_length(referencias, 1) is null or array_length(referencias, 1) <= 40),
	status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aprovado', 'pede_ajustes')),
	comentario_mesa text check (char_length(comentario_mesa) <= 1000),
	enviado_em timestamptz,
	atualizado_em timestamptz not null default clock_timestamp(),
	unique (comite_id, delegacao_id, topico),
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);

create table public.carta (
	id uuid primary key default gen_random_uuid(),
	comite_id uuid not null references public.comite on delete cascade,
	remetente_delegacao_id uuid,
	remetente_bloco_id uuid,
	autor_id uuid references public.pessoa on delete set null,
	titulo text not null check (char_length(titulo) between 1 and 200),
	corpo text not null check (char_length(corpo) between 1 and 8000),
	publica boolean not null default false,
	enviada_em timestamptz not null default clock_timestamp(),
	unique (id, comite_id),
	foreign key (remetente_delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade,
	foreign key (remetente_bloco_id, comite_id) references public.bloco (id, comite_id) on delete cascade,
	check ((remetente_delegacao_id is null) <> (remetente_bloco_id is null))
);

create table public.carta_destinatario (
	carta_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid,
	bloco_id uuid,
	foreign key (carta_id, comite_id) references public.carta (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade,
	foreign key (bloco_id, comite_id) references public.bloco (id, comite_id) on delete cascade,
	check ((delegacao_id is null) <> (bloco_id is null)),
	unique nulls not distinct (carta_id, delegacao_id, bloco_id)
);
create index on public.carta_destinatario (carta_id);

-- Leitura

-- O DPO é da delegação; a mesa vê todos; as outras delegações veem os aprovados
-- só se a mesa abriu os DPOs do comitê (regra dpos_publicos).
create function public.pode_ver_dpo(p_dpo uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.dpo d
		where d.id = p_dpo and (
			d.delegacao_id = public.minha_delegacao(d.comite_id)
			or public.tem_papel(d.comite_id, '{mesa}')
			or (
				d.status = 'aprovado'
				and public.participa_do_comite(d.comite_id)
				and (public.regras(d.comite_id) ->> 'dpos_publicos')::boolean
			)
		)
	);
$$;

-- Carta pública: o comitê inteiro. Privada: o remetente (a delegação, ou os membros
-- do bloco) e os destinatários (delegações, ou membros dos blocos).
create function public.pode_ver_carta(p_carta uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.carta c
		where c.id = p_carta and public.participa_do_comite(c.comite_id) and (
			c.publica
			or c.remetente_delegacao_id = public.minha_delegacao(c.comite_id)
			or (c.remetente_bloco_id is not null and public.sou_do_bloco(c.remetente_bloco_id))
			or exists (
				select 1 from public.carta_destinatario dest
				where dest.carta_id = c.id and (
					dest.delegacao_id = public.minha_delegacao(c.comite_id)
					or (dest.bloco_id is not null and public.sou_do_bloco(dest.bloco_id))
				)
			)
		)
	);
$$;

alter table public.dpo enable row level security;
alter table public.carta enable row level security;
alter table public.carta_destinatario enable row level security;

create policy "DPO: a delegação, a mesa e, se abertos, o comitê" on public.dpo
	for select to authenticated using (public.pode_ver_dpo(id));
create policy "carta: o comitê se pública; senão, remetente e destinatários" on public.carta
	for select to authenticated using (public.pode_ver_carta(id));
create policy "destinatários de quem vê a carta" on public.carta_destinatario
	for select to authenticated using (public.pode_ver_carta(carta_id));

-- DPO

-- Grava o DPO da delegação para um tópico (cria ou atualiza). Enviado ou aprovado,
-- não muda; com pedido de ajuste, volta a ser editável.
create function public.salvar_dpo(p_comite uuid, p_topico int, p_texto text, p_referencias text[])
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.minha_delegacao(p_comite);
	v_status text;
	v_id uuid;
begin
	if v_delegacao is null then
		raise exception 'Só delegados do comitê escrevem DPO.' using errcode = '42501';
	end if;
	if p_topico < 1 or p_topico > coalesce((select array_length(topicos, 1) from public.comite where id = p_comite), 0) then
		raise exception 'Escolha um dos tópicos do comitê.' using errcode = '22023';
	end if;
	select status into v_status from public.dpo where comite_id = p_comite and delegacao_id = v_delegacao and topico = p_topico;
	if v_status in ('enviado', 'aprovado') then
		raise exception 'O DPO já foi enviado à mesa. Ele volta a ser editável se a mesa pedir ajustes.';
	end if;
	insert into public.dpo (comite_id, delegacao_id, topico, texto, referencias)
	values (
		p_comite, v_delegacao, p_topico, trim(p_texto),
		array(select trim(r) from unnest(p_referencias) r where trim(r) <> '')
	)
	on conflict (comite_id, delegacao_id, topico) do update set
		texto = excluded.texto,
		referencias = excluded.referencias,
		status = 'rascunho',
		atualizado_em = clock_timestamp()
	returning id into v_id;
	return v_id;
end $$;

create function public.enviar_dpo(p_dpo uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	d public.dpo := (select x from public.dpo x where x.id = p_dpo);
begin
	if d.id is null or d.delegacao_id is distinct from public.minha_delegacao(d.comite_id) then
		raise exception 'Só a própria delegação envia o DPO.' using errcode = '42501';
	end if;
	if d.status not in ('rascunho', 'pede_ajustes') then
		raise exception 'O DPO já foi enviado.';
	end if;
	if char_length(d.texto) < 1 then
		raise exception 'O DPO está vazio.';
	end if;
	update public.dpo set status = 'enviado', enviado_em = clock_timestamp(), comentario_mesa = null where id = p_dpo;
end $$;

-- Só a mesa aprova ou pede ajustes, com um comentário. Mesmo aprovado, a mesa pode
-- reconsiderar e pedir ajustes.
create function public.avaliar_dpo(p_dpo uuid, p_status text, p_comentario text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	d public.dpo := (select x from public.dpo x where x.id = p_dpo);
begin
	perform public.exigir_mesa(d.comite_id);
	if p_status not in ('aprovado', 'pede_ajustes') then
		raise exception 'A mesa aprova ou pede ajustes.' using errcode = '22023';
	end if;
	if d.status not in ('enviado', 'aprovado') then
		raise exception 'O DPO ainda não foi enviado à mesa.';
	end if;
	if p_status = 'pede_ajustes' and coalesce(trim(p_comentario), '') = '' then
		raise exception 'Diga o que precisa ser ajustado.' using errcode = '22023';
	end if;
	update public.dpo set status = p_status, comentario_mesa = nullif(trim(p_comentario), '') where id = p_dpo;
end $$;

-- Cartas

-- Envia uma carta em nome da própria delegação ou de um bloco de que ela faz parte.
create function public.enviar_carta(
	p_comite uuid, p_titulo text, p_corpo text, p_publica boolean,
	p_destinatarios uuid[] default '{}', p_blocos_destinatarios uuid[] default '{}', p_bloco_remetente uuid default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.minha_delegacao(p_comite);
	v_id uuid;
begin
	if v_delegacao is null then
		raise exception 'Só delegados do comitê enviam cartas.' using errcode = '42501';
	end if;
	if p_bloco_remetente is not null and not public.sou_do_bloco(p_bloco_remetente) then
		raise exception 'Só um membro escreve em nome do bloco.' using errcode = '42501';
	end if;
	if not p_publica and coalesce(array_length(p_destinatarios, 1), 0) + coalesce(array_length(p_blocos_destinatarios, 1), 0) = 0 then
		raise exception 'Uma carta privada precisa de destinatários.' using errcode = '22023';
	end if;
	insert into public.carta (comite_id, remetente_delegacao_id, remetente_bloco_id, autor_id, titulo, corpo, publica)
	values (
		p_comite, case when p_bloco_remetente is null then v_delegacao end, p_bloco_remetente,
		auth.uid(), trim(p_titulo), trim(p_corpo), p_publica
	)
	returning id into v_id;
	insert into public.carta_destinatario (carta_id, comite_id, delegacao_id)
	select v_id, p_comite, d from (select distinct unnest(p_destinatarios) as d) x;
	insert into public.carta_destinatario (carta_id, comite_id, bloco_id)
	select v_id, p_comite, b from (select distinct unnest(p_blocos_destinatarios) as b) x;
	return v_id;
end $$;

revoke execute on function
	public.pode_ver_dpo(uuid), public.pode_ver_carta(uuid), public.salvar_dpo(uuid, int, text, text[]),
	public.enviar_dpo(uuid), public.avaliar_dpo(uuid, text, text),
	public.enviar_carta(uuid, text, text, boolean, uuid[], uuid[], uuid)
from public, anon;
grant execute on function
	public.pode_ver_dpo(uuid), public.pode_ver_carta(uuid), public.salvar_dpo(uuid, int, text, text[]),
	public.enviar_dpo(uuid), public.avaliar_dpo(uuid, text, text),
	public.enviar_carta(uuid, text, text, boolean, uuid[], uuid[], uuid)
to authenticated;

alter publication supabase_realtime add table public.dpo, public.carta;
