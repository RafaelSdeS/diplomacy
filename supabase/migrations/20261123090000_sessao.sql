-- Passo 06: sessão, chamada, presidência em rodízio, placa digital, cronômetro,
-- pontos e moções.
--
-- Quem preside age só por funções (security definer) que checam pode_presidir;
-- ninguém escreve direto no estado da sessão, nos pedidos de fala nem nos pontos.
-- Assim ninguém fura a fila mudando o horário de um pedido, por exemplo.

create type public.forma_debate as enum ('formal_formal', 'formal_informal', 'informal_informal');
create type public.situacao_presenca as enum ('presente', 'presente_e_votando');

create table public.sessao (
	id uuid primary key default gen_random_uuid(),
	comite_id uuid not null references public.comite on delete cascade,
	numero int not null check (numero > 0),
	de_votacao boolean not null default false,
	presidencia_delegacao_id uuid, -- nulo: o bureau preside
	informal_min_usados int not null default 0,
	inicio timestamptz not null default now(),
	fim timestamptz,
	unique (comite_id, numero),
	unique (id, comite_id),
	foreign key (presidencia_delegacao_id, comite_id) references public.delegacao (id, comite_id)
);

create table public.presenca (
	sessao_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid not null,
	situacao public.situacao_presenca not null default 'presente',
	primary key (sessao_id, delegacao_id),
	foreign key (sessao_id, comite_id) references public.sessao (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);

-- Ordem sorteada entre as delegações voluntárias. As que sobram depois das
-- sessões formam a lista de espera para quando a presidência é passada.
create table public.rodizio_presidencia (
	comite_id uuid not null references public.comite on delete cascade,
	ordem int not null,
	delegacao_id uuid not null,
	vez_usada boolean not null default false,
	primary key (comite_id, ordem),
	unique (comite_id, delegacao_id),
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);

-- Uma linha por comitê, atualizada ao vivo. O cronômetro guarda só início,
-- duração e o que restava na pausa: cada aparelho calcula o tempo que falta.
create table public.estado_sessao (
	comite_id uuid primary key references public.comite on delete cascade,
	sessao_id uuid,
	forma public.forma_debate not null default 'formal_formal',
	orador_delegacao_id uuid,
	tempo_fala_seg int not null default 90 check (tempo_fala_seg between 1 and 3600),
	cronometro_inicio timestamptz,
	cronometro_duracao_seg int,
	cronometro_pausado_restante_seg int,
	atualizado_em timestamptz not null default now(),
	foreign key (sessao_id, comite_id) references public.sessao (id, comite_id),
	foreign key (orador_delegacao_id, comite_id) references public.delegacao (id, comite_id)
);

-- A placa digital: cada delegação tem no máximo uma placa levantada por sessão.
create table public.pedido_fala (
	id uuid primary key default gen_random_uuid(),
	sessao_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid not null,
	situacao text not null default 'aberto' check (situacao in ('aberto', 'atendido', 'baixado')),
	criado_em timestamptz not null default now(),
	foreign key (sessao_id, comite_id) references public.sessao (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);
create unique index uma_placa_levantada on public.pedido_fala (sessao_id, delegacao_id) where situacao = 'aberto';
create index on public.pedido_fala (comite_id);

create table public.ponto_mocao (
	id uuid primary key default gen_random_uuid(),
	sessao_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid not null,
	tipo text not null check (tipo in (
		'ponto_ordem', 'ponto_duvida', 'privilegio_pessoal',
		'formal_informal', 'informal_informal', 'suspensao_sessao', 'adiamento_sessao',
		'encerramento_debate', 'voto_desconfianca'
	)),
	detalhe text check (char_length(detalhe) <= 300),
	status text not null default 'aberto' check (status in ('aberto', 'aceito', 'recusado')),
	criado_em timestamptz not null default now(),
	foreign key (sessao_id, comite_id) references public.sessao (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);
create index on public.ponto_mocao (comite_id);

-- Quem está no comitê vê tudo da sessão dele; só a mesa marca a presença.

alter table public.sessao enable row level security;
alter table public.presenca enable row level security;
alter table public.rodizio_presidencia enable row level security;
alter table public.estado_sessao enable row level security;
alter table public.pedido_fala enable row level security;
alter table public.ponto_mocao enable row level security;

create policy "quem está no comitê vê as sessões" on public.sessao
	for select to authenticated using (public.participa_do_comite(comite_id));
create policy "quem está no comitê vê a chamada" on public.presenca
	for select to authenticated using (public.participa_do_comite(comite_id));
create policy "quem está no comitê vê o rodízio" on public.rodizio_presidencia
	for select to authenticated using (public.participa_do_comite(comite_id));
create policy "quem está no comitê vê o estado da sessão" on public.estado_sessao
	for select to authenticated using (public.participa_do_comite(comite_id));
create policy "quem está no comitê vê os pedidos de fala" on public.pedido_fala
	for select to authenticated using (public.participa_do_comite(comite_id));
create policy "quem está no comitê vê os pontos e moções" on public.ponto_mocao
	for select to authenticated using (public.participa_do_comite(comite_id));

create policy "a mesa marca presença" on public.presenca
	for insert to authenticated with check (public.tem_papel(comite_id, '{mesa}'));
create policy "a mesa altera presença" on public.presenca
	for update to authenticated
	using (public.tem_papel(comite_id, '{mesa}')) with check (public.tem_papel(comite_id, '{mesa}'));
create policy "a mesa remove presença" on public.presenca
	for delete to authenticated using (public.tem_papel(comite_id, '{mesa}'));

-- Leitura

create function public.agora()
returns timestamptz
language sql stable
as $$
	select now();
$$;

create function public.sessao_atual(p_comite uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
	select sessao_id from public.estado_sessao where comite_id = p_comite;
$$;

-- É da mesa (ou da secretaria), ou é delegado da delegação que preside a sessão atual.
create function public.pode_presidir(p_comite uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select public.tem_papel(p_comite, '{mesa}') or exists (
		select 1 from public.estado_sessao e
		join public.sessao s on s.id = e.sessao_id
		where e.comite_id = p_comite
			and s.presidencia_delegacao_id = public.minha_delegacao(p_comite)
	);
$$;

-- Presentes na chamada: a base das votações (passo 07).
create function public.presentes(p_sessao uuid)
returns int
language sql stable set search_path = ''
as $$
	select count(*)::int from public.presenca where sessao_id = p_sessao;
$$;

-- Funções internas

create function public.exigir_mesa(p_comite uuid)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
	if not public.tem_papel(p_comite, '{mesa}') then
		raise exception 'Só a mesa pode fazer isso.' using errcode = '42501';
	end if;
end $$;

create function public.exigir_presidencia(p_comite uuid)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
	if not public.pode_presidir(p_comite) then
		raise exception 'Só quem preside a sessão pode fazer isso.' using errcode = '42501';
	end if;
	if public.sessao_atual(p_comite) is null then
		raise exception 'Nenhuma sessão aberta.' using errcode = 'P0002';
	end if;
end $$;

-- A próxima delegação do rodízio que ainda não presidiu (e marca a vez dela),
-- ou nulo quando a lista acabou e o bureau volta a presidir.
create function public.tomar_proxima_presidencia(p_comite uuid)
returns uuid
language sql security definer set search_path = ''
as $$
	update public.rodizio_presidencia set vez_usada = true
	where comite_id = p_comite and ordem = (
		select min(ordem) from public.rodizio_presidencia where comite_id = p_comite and not vez_usada
	)
	returning delegacao_id;
$$;

-- Mesa

create function public.sortear_presidencia(p_comite uuid, p_voluntarias uuid[])
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_mesa(p_comite);
	delete from public.rodizio_presidencia where comite_id = p_comite;
	insert into public.rodizio_presidencia (comite_id, ordem, delegacao_id)
	select p_comite, row_number() over (order by random()), v
	from (select distinct unnest(p_voluntarias) as v) as voluntarias;
end $$;

-- Encerra a sessão aberta e abre a próxima. O bureau preside a primeira sessão e
-- as de votação; nas outras, a próxima delegação do rodízio.
create function public.abrir_sessao(p_comite uuid, p_votacao boolean default false)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_numero int;
	v_presidencia uuid;
	v_sessao uuid;
begin
	perform public.exigir_mesa(p_comite);
	update public.sessao set fim = now() where comite_id = p_comite and fim is null;
	select coalesce(max(numero), 0) + 1 into v_numero from public.sessao where comite_id = p_comite;
	if v_numero > 1 and not p_votacao then
		v_presidencia := public.tomar_proxima_presidencia(p_comite);
	end if;

	insert into public.sessao (comite_id, numero, de_votacao, presidencia_delegacao_id)
	values (p_comite, v_numero, p_votacao, v_presidencia)
	returning id into v_sessao;

	insert into public.estado_sessao (comite_id, sessao_id) values (p_comite, v_sessao)
	on conflict (comite_id) do update set
		sessao_id = excluded.sessao_id,
		forma = 'formal_formal',
		orador_delegacao_id = null,
		cronometro_inicio = null,
		cronometro_duracao_seg = null,
		cronometro_pausado_restante_seg = null,
		atualizado_em = now();
	return v_sessao;
end $$;

create function public.encerrar_sessao(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_mesa(p_comite);
	update public.sessao set fim = now() where comite_id = p_comite and fim is null;
	update public.estado_sessao set
		sessao_id = null, orador_delegacao_id = null, cronometro_inicio = null,
		cronometro_duracao_seg = null, cronometro_pausado_restante_seg = null, atualizado_em = now()
	where comite_id = p_comite;
end $$;

-- Presidência

-- Dá a palavra (nulo encerra a fala) e começa o tempo de fala; o pedido de fala
-- da delegação é atendido. p_seg muda o tempo de fala desta e das próximas.
create function public.dar_palavra(p_comite uuid, p_delegacao uuid, p_seg int default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia(p_comite);
	update public.estado_sessao set
		orador_delegacao_id = p_delegacao,
		tempo_fala_seg = coalesce(p_seg, tempo_fala_seg),
		cronometro_inicio = case when p_delegacao is null then null else now() end,
		cronometro_duracao_seg = case when p_delegacao is null then null else coalesce(p_seg, tempo_fala_seg) end,
		cronometro_pausado_restante_seg = null,
		atualizado_em = now()
	where comite_id = p_comite;
	update public.pedido_fala set situacao = 'atendido'
	where sessao_id = public.sessao_atual(p_comite) and delegacao_id = p_delegacao and situacao = 'aberto';
end $$;

create function public.iniciar_cronometro(p_comite uuid, p_seg int)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia(p_comite);
	update public.estado_sessao set
		cronometro_inicio = now(), cronometro_duracao_seg = p_seg,
		cronometro_pausado_restante_seg = null, atualizado_em = now()
	where comite_id = p_comite;
end $$;

create function public.pausar(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia(p_comite);
	update public.estado_sessao set
		cronometro_pausado_restante_seg =
			greatest(0, ceil(cronometro_duracao_seg - extract(epoch from now() - cronometro_inicio)))::int,
		atualizado_em = now()
	where comite_id = p_comite and cronometro_inicio is not null and cronometro_pausado_restante_seg is null;
end $$;

create function public.retomar(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia(p_comite);
	update public.estado_sessao set
		cronometro_inicio = now(), cronometro_duracao_seg = cronometro_pausado_restante_seg,
		cronometro_pausado_restante_seg = null, atualizado_em = now()
	where comite_id = p_comite and cronometro_pausado_restante_seg is not null;
end $$;

create function public.somar_segundos(p_comite uuid, p_seg int)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia(p_comite);
	update public.estado_sessao set
		cronometro_pausado_restante_seg = greatest(0, cronometro_pausado_restante_seg + p_seg),
		cronometro_duracao_seg = case
			when cronometro_pausado_restante_seg is null then cronometro_duracao_seg + p_seg
			else cronometro_duracao_seg
		end,
		atualizado_em = now()
	where comite_id = p_comite and cronometro_inicio is not null;
end $$;

-- Muda a forma de debate. Com minutos, o cronômetro conta o tempo do debate. O
-- informal-informal soma os minutos pedidos e não passa do limite das regras.
-- ponytail: os minutos contam quando o informal começa, mesmo que acabe antes.
create function public.mudar_forma(p_comite uuid, p_forma public.forma_debate, p_minutos int default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_limite int;
begin
	perform public.exigir_presidencia(p_comite);
	if p_minutos is not null and p_minutos < 1 then
		raise exception 'Os minutos precisam ser positivos.' using errcode = '22023';
	end if;
	if p_forma = 'informal_informal' then
		if p_minutos is null then
			raise exception 'Informe quantos minutos de informal-informal.' using errcode = '22023';
		end if;
		v_limite := (public.regras(p_comite) ->> 'informal_informal_max_min')::int;
		update public.sessao set informal_min_usados = informal_min_usados + p_minutos
		where id = public.sessao_atual(p_comite) and informal_min_usados + p_minutos <= v_limite;
		if not found then
			raise exception 'O informal-informal passaria de % minutos nesta sessão.', v_limite using errcode = '23514';
		end if;
	end if;
	update public.estado_sessao set
		forma = p_forma,
		orador_delegacao_id = null,
		cronometro_inicio = case when p_minutos is null then null else now() end,
		cronometro_duracao_seg = p_minutos * 60,
		cronometro_pausado_restante_seg = null,
		atualizado_em = now()
	where comite_id = p_comite;
end $$;

-- Passa a presidência da sessão atual para a próxima delegação do rodízio (ou para
-- o bureau, quando a lista acaba). Vale para quem preside e para a mesa.
create function public.passar_presidencia(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia(p_comite);
	if (select de_votacao from public.sessao where id = public.sessao_atual(p_comite)) then
		raise exception 'A mesa preside as sessões de votação.' using errcode = '42501';
	end if;
	update public.sessao set presidencia_delegacao_id = public.tomar_proxima_presidencia(p_comite)
	where id = public.sessao_atual(p_comite);
	update public.estado_sessao set atualizado_em = now() where comite_id = p_comite;
end $$;

create function public.responder_ponto(p_ponto uuid, p_status text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia((select comite_id from public.ponto_mocao where id = p_ponto));
	update public.ponto_mocao set status = p_status where id = p_ponto;
end $$;

-- Delegações

create function public.exigir_delegacao(p_comite uuid)
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.minha_delegacao(p_comite);
begin
	if v_delegacao is null then
		raise exception 'Só delegados do comitê podem fazer isso.' using errcode = '42501';
	end if;
	if public.sessao_atual(p_comite) is null then
		raise exception 'Nenhuma sessão aberta.' using errcode = 'P0002';
	end if;
	return v_delegacao;
end $$;

create function public.levantar_placa(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.exigir_delegacao(p_comite);
begin
	insert into public.pedido_fala (sessao_id, comite_id, delegacao_id)
	values (public.sessao_atual(p_comite), p_comite, v_delegacao)
	on conflict do nothing; -- já estava levantada
end $$;

create function public.baixar_placa(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.exigir_delegacao(p_comite);
begin
	update public.pedido_fala set situacao = 'baixado'
	where sessao_id = public.sessao_atual(p_comite) and delegacao_id = v_delegacao and situacao = 'aberto';
end $$;

create function public.enviar_ponto(p_comite uuid, p_tipo text, p_detalhe text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.exigir_delegacao(p_comite);
begin
	insert into public.ponto_mocao (sessao_id, comite_id, delegacao_id, tipo, detalhe)
	values (public.sessao_atual(p_comite), p_comite, v_delegacao, p_tipo, nullif(trim(p_detalhe), ''));
end $$;

-- Permissões: as funções internas não são chamadas de fora.

revoke execute on function
	public.exigir_mesa(uuid), public.exigir_presidencia(uuid), public.exigir_delegacao(uuid),
	public.tomar_proxima_presidencia(uuid)
from public, anon, authenticated;

revoke execute on function
	public.agora(), public.sessao_atual(uuid), public.pode_presidir(uuid), public.presentes(uuid),
	public.sortear_presidencia(uuid, uuid[]), public.abrir_sessao(uuid, boolean), public.encerrar_sessao(uuid),
	public.dar_palavra(uuid, uuid, int), public.iniciar_cronometro(uuid, int), public.pausar(uuid),
	public.retomar(uuid), public.somar_segundos(uuid, int), public.mudar_forma(uuid, public.forma_debate, int),
	public.passar_presidencia(uuid), public.responder_ponto(uuid, text),
	public.levantar_placa(uuid), public.baixar_placa(uuid), public.enviar_ponto(uuid, text, text)
from public, anon;

grant execute on function
	public.agora(), public.sessao_atual(uuid), public.pode_presidir(uuid), public.presentes(uuid),
	public.sortear_presidencia(uuid, uuid[]), public.abrir_sessao(uuid, boolean), public.encerrar_sessao(uuid),
	public.dar_palavra(uuid, uuid, int), public.iniciar_cronometro(uuid, int), public.pausar(uuid),
	public.retomar(uuid), public.somar_segundos(uuid, int), public.mudar_forma(uuid, public.forma_debate, int),
	public.passar_presidencia(uuid), public.responder_ponto(uuid, text),
	public.levantar_placa(uuid), public.baixar_placa(uuid), public.enviar_ponto(uuid, text, text)
to authenticated;

alter publication supabase_realtime add table
	public.estado_sessao, public.pedido_fala, public.ponto_mocao, public.presenca;
