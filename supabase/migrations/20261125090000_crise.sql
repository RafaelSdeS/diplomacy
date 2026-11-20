-- Passo 08: crise. Uma fila que continua clara quando todo mundo escreve ao mesmo
-- tempo, com notas que só a própria delegação e a equipe de crise veem.

create type public.status_nota as enum ('pendente', 'em_analise', 'aprovada', 'rejeitada', 'pede_ajuste');

create table public.nota_crise (
	id uuid primary key default gen_random_uuid(), -- gerado no aparelho: reenviar nunca duplica
	comite_id uuid not null,
	delegacao_id uuid not null,
	autor_id uuid references public.pessoa on delete set null,
	tipo text not null check (tipo in ('nota', 'diretiva')),
	titulo text not null check (char_length(titulo) between 1 and 120),
	texto text not null check (char_length(texto) between 1 and 2000),
	criado_em timestamptz not null default clock_timestamp(),
	status public.status_nota not null default 'pendente',
	responsavel_id uuid references public.pessoa on delete set null,
	resposta text check (char_length(resposta) <= 2000),
	respondida_em timestamptz,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);
create index on public.nota_crise (comite_id, status, criado_em);
create index on public.nota_crise (delegacao_id, status);

create table public.atualizacao_crise (
	id uuid primary key default gen_random_uuid(),
	evento_id uuid not null references public.evento on delete cascade,
	texto text not null check (char_length(texto) between 1 and 3000),
	autor_id uuid references public.pessoa on delete set null,
	publicada_em timestamptz not null default clock_timestamp(),
	unique (id, evento_id)
);

-- Crise conjunta: uma atualização, vários comitês do mesmo evento.
create table public.atualizacao_comite (
	atualizacao_id uuid not null,
	comite_id uuid not null,
	evento_id uuid not null,
	primary key (atualizacao_id, comite_id),
	foreign key (atualizacao_id, evento_id) references public.atualizacao_crise (id, evento_id) on delete cascade,
	foreign key (comite_id, evento_id) references public.comite (id, evento_id) on delete cascade
);
create index on public.atualizacao_comite (comite_id);

alter table public.nota_crise enable row level security;
alter table public.atualizacao_crise enable row level security;
alter table public.atualizacao_comite enable row level security;

-- A delegação vê só as próprias notas; a equipe de crise do comitê vê todas. A mesa
-- e a press não leem notas de crise.
create policy "a delegação vê as próprias notas; a crise do comitê vê todas" on public.nota_crise
	for select to authenticated
	using (delegacao_id = public.minha_delegacao(comite_id) or public.tem_papel(comite_id, '{crise}'));

create policy "quem está no comitê vê as atualizações dele" on public.atualizacao_comite
	for select to authenticated using (public.participa_do_comite(comite_id));

-- A atualização aparece para quem vê pelo menos um dos comitês ligados a ela (a
-- consulta respeita a regra de acesso de atualizacao_comite).
create policy "a atualização aparece nos comitês ligados a ela" on public.atualizacao_crise
	for select to authenticated
	using (exists (select 1 from public.atualizacao_comite ac where ac.atualizacao_id = atualizacao_crise.id));

-- Funções

create function public.exigir_crise(p_comite uuid)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
	if p_comite is null or not public.tem_papel(p_comite, '{crise}') then
		raise exception 'Só a equipe de crise do comitê pode fazer isso.' using errcode = '42501';
	end if;
end $$;

-- Envia uma nota ou diretiva. O id vem do aparelho: reenviar a mesma nota (rede
-- ruim) não duplica. A trava na delegação põe os envios simultâneos em fila, e o
-- limite de pendentes das regras nunca é ultrapassado.
create function public.enviar_nota(p_id uuid, p_comite uuid, p_tipo text, p_titulo text, p_texto text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.minha_delegacao(p_comite);
	v_limite int;
begin
	if v_delegacao is null then
		raise exception 'Só delegados do comitê enviam notas de crise.' using errcode = '42501';
	end if;
	if not (select crise_ligada from public.comite where id = p_comite) then
		raise exception 'Este comitê não tem crise.';
	end if;
	perform 1 from public.delegacao where id = v_delegacao for update;
	if exists (select 1 from public.nota_crise where id = p_id) then
		return; -- já recebida
	end if;
	v_limite := (public.regras(p_comite) ->> 'limite_notas_pendentes')::int;
	if (
		select count(*) from public.nota_crise
		where delegacao_id = v_delegacao and status in ('pendente', 'em_analise')
	) >= v_limite then
		raise exception 'Sua delegação já tem % notas esperando resposta. Aguarde uma resposta para enviar outra.', v_limite;
	end if;
	insert into public.nota_crise (id, comite_id, delegacao_id, autor_id, tipo, titulo, texto)
	values (p_id, p_comite, v_delegacao, auth.uid(), p_tipo, trim(p_titulo), trim(p_texto));
end $$;

-- Assume uma nota pendente. Se duas pessoas tentam ao mesmo tempo, só uma consegue.
create function public.assumir_nota(p_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_crise((select comite_id from public.nota_crise where id = p_id));
	update public.nota_crise set responsavel_id = auth.uid(), status = 'em_analise'
	where id = p_id and responsavel_id is null and status = 'pendente';
	if not found then
		raise exception 'Outra pessoa da crise já assumiu esta nota.';
	end if;
end $$;

-- Responde uma ou várias notas (parecidas) com a mesma resposta.
create function public.responder_notas(p_ids uuid[], p_status public.status_nota, p_resposta text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_comite uuid;
begin
	if p_status not in ('aprovada', 'rejeitada', 'pede_ajuste') then
		raise exception 'A resposta aprova, rejeita ou pede ajuste.' using errcode = '22023';
	end if;
	if coalesce(trim(p_resposta), '') = '' then
		raise exception 'Escreva a resposta.' using errcode = '22023';
	end if;
	for v_comite in select distinct comite_id from public.nota_crise where id = any (p_ids) loop
		perform public.exigir_crise(v_comite);
	end loop;
	update public.nota_crise set
		status = p_status,
		resposta = trim(p_resposta),
		respondida_em = clock_timestamp(),
		responsavel_id = coalesce(responsavel_id, auth.uid())
	where id = any (p_ids);
end $$;

-- Posição da nota na fila: quantas notas pendentes do comitê são mais antigas, mais
-- um. A delegação sabe a posição sem ver as notas das outras.
create function public.posicao_na_fila(p_id uuid)
returns int
language sql stable security definer set search_path = ''
as $$
	select (
		select count(*)::int + 1 from public.nota_crise o
		where o.comite_id = n.comite_id and o.status = 'pendente' and o.criado_em < n.criado_em
	)
	from public.nota_crise n
	where n.id = p_id
		and n.status = 'pendente'
		and (n.delegacao_id = public.minha_delegacao(n.comite_id) or public.tem_papel(n.comite_id, '{crise}'));
$$;

-- Publica uma atualização para um ou vários comitês do mesmo evento. Quem publica
-- precisa ser da crise de todos eles.
create function public.publicar_atualizacao(p_comites uuid[], p_texto text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_comite uuid;
	v_evento uuid;
	v_id uuid;
begin
	if coalesce(array_length(p_comites, 1), 0) = 0 then
		raise exception 'Escolha pelo menos um comitê.' using errcode = '22023';
	end if;
	foreach v_comite in array p_comites loop
		perform public.exigir_crise(v_comite);
	end loop;
	select evento_id into v_evento from public.comite where id = p_comites[1];
	if exists (select 1 from public.comite where id = any (p_comites) and evento_id <> v_evento) then
		raise exception 'Uma atualização vale para comitês de um mesmo evento.';
	end if;
	insert into public.atualizacao_crise (evento_id, texto, autor_id)
	values (v_evento, trim(p_texto), auth.uid())
	returning id into v_id;
	insert into public.atualizacao_comite (atualizacao_id, comite_id, evento_id)
	select v_id, c, v_evento from (select distinct unnest(p_comites) as c) as comites;
	return v_id;
end $$;

revoke execute on function public.exigir_crise(uuid) from public, anon, authenticated;
revoke execute on function
	public.enviar_nota(uuid, uuid, text, text, text), public.assumir_nota(uuid),
	public.responder_notas(uuid[], public.status_nota, text), public.posicao_na_fila(uuid),
	public.publicar_atualizacao(uuid[], text)
from public, anon;
grant execute on function
	public.enviar_nota(uuid, uuid, text, text, text), public.assumir_nota(uuid),
	public.responder_notas(uuid[], public.status_nota, text), public.posicao_na_fila(uuid),
	public.publicar_atualizacao(uuid[], text)
to authenticated;

alter publication supabase_realtime add table public.nota_crise, public.atualizacao_comite;
