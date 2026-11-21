-- Passo 28: dois cronômetros. O da fala (cronometro_*) e o do debate (debate_*), que
-- conta os minutos da forma de debate definidos pela presidência. Dar a palavra não
-- mexe mais no tempo do debate. O informal-informal desconta da sessão só os minutos
-- usados (o limite das regras, 45, vale para a soma de uma sessão).

alter table public.estado_sessao
	add column debate_inicio timestamptz,
	add column debate_duracao_seg int,
	add column debate_pausado_restante_seg int,
	-- Os minutos definidos, com os acréscimos: base para descontar só o usado.
	add column debate_total_seg int;

-- Segundos que faltam no relógio do debate (null sem relógio).
create function public.debate_restante_seg(e public.estado_sessao)
returns int
language sql stable set search_path = ''
as $$
	select case
		when e.debate_pausado_restante_seg is not null then e.debate_pausado_restante_seg
		when e.debate_inicio is null then null
		else greatest(0, ceil(e.debate_duracao_seg - extract(epoch from now() - e.debate_inicio)))::int
	end;
$$;

-- Muda a forma de debate (substitui a do passo 07). Os minutos vão para o relógio do
-- debate; o informal que termina desconta da sessão os minutos usados.
create or replace function public.aplicar_forma(p_comite uuid, p_forma public.forma_debate, p_minutos int)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	e public.estado_sessao;
	v_limite int;
	v_usados int;
begin
	if p_minutos is not null and p_minutos < 1 then
		raise exception 'Os minutos precisam ser positivos.' using errcode = '22023';
	end if;
	select * into e from public.estado_sessao where comite_id = p_comite;
	if e.forma = 'informal_informal' and e.debate_total_seg is not null then
		v_usados := ceil((e.debate_total_seg - coalesce(public.debate_restante_seg(e), 0)) / 60.0)::int;
		update public.sessao set informal_min_usados = informal_min_usados + least(greatest(v_usados, 0), ceil(e.debate_total_seg / 60.0)::int)
		where id = public.sessao_atual(p_comite);
	end if;
	if p_forma = 'informal_informal' then
		if p_minutos is null then
			raise exception 'Informe quantos minutos de informal-informal.' using errcode = '22023';
		end if;
		v_limite := (public.regras(p_comite) ->> 'informal_informal_max_min')::int;
		if (select informal_min_usados from public.sessao where id = public.sessao_atual(p_comite)) + p_minutos > v_limite then
			raise exception 'O informal-informal passaria de % minutos nesta sessão.', v_limite using errcode = '23514';
		end if;
	end if;
	update public.estado_sessao set
		forma = p_forma,
		orador_delegacao_id = null,
		cronometro_inicio = null,
		cronometro_duracao_seg = null,
		cronometro_pausado_restante_seg = null,
		debate_inicio = case when p_minutos is null then null else now() end,
		debate_duracao_seg = p_minutos * 60,
		debate_total_seg = p_minutos * 60,
		debate_pausado_restante_seg = null,
		atualizado_em = now()
	where comite_id = p_comite;
end $$;

-- Pausar, retomar e somar valem para um dos dois relógios: 'fala' (o padrão) ou 'debate'.
drop function public.pausar(uuid);
create function public.pausar(p_comite uuid, p_relogio text default 'fala')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia(p_comite);
	if p_relogio = 'debate' then
		update public.estado_sessao set
			debate_pausado_restante_seg = greatest(0, ceil(debate_duracao_seg - extract(epoch from now() - debate_inicio)))::int,
			atualizado_em = now()
		where comite_id = p_comite and debate_inicio is not null and debate_pausado_restante_seg is null;
	else
		update public.estado_sessao set
			cronometro_pausado_restante_seg =
				greatest(0, ceil(cronometro_duracao_seg - extract(epoch from now() - cronometro_inicio)))::int,
			atualizado_em = now()
		where comite_id = p_comite and cronometro_inicio is not null and cronometro_pausado_restante_seg is null;
	end if;
end $$;

drop function public.retomar(uuid);
create function public.retomar(p_comite uuid, p_relogio text default 'fala')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia(p_comite);
	if p_relogio = 'debate' then
		update public.estado_sessao set
			debate_inicio = now(), debate_duracao_seg = debate_pausado_restante_seg,
			debate_pausado_restante_seg = null, atualizado_em = now()
		where comite_id = p_comite and debate_pausado_restante_seg is not null;
	else
		update public.estado_sessao set
			cronometro_inicio = now(), cronometro_duracao_seg = cronometro_pausado_restante_seg,
			cronometro_pausado_restante_seg = null, atualizado_em = now()
		where comite_id = p_comite and cronometro_pausado_restante_seg is not null;
	end if;
end $$;

drop function public.somar_segundos(uuid, int);
create function public.somar_segundos(p_comite uuid, p_seg int, p_relogio text default 'fala')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia(p_comite);
	if p_relogio = 'debate' then
		update public.estado_sessao set
			debate_pausado_restante_seg = greatest(0, debate_pausado_restante_seg + p_seg),
			debate_duracao_seg = case
				when debate_pausado_restante_seg is null then debate_duracao_seg + p_seg
				else debate_duracao_seg
			end,
			debate_total_seg = greatest(0, debate_total_seg + p_seg),
			atualizado_em = now()
		where comite_id = p_comite and debate_inicio is not null;
	else
		update public.estado_sessao set
			cronometro_pausado_restante_seg = greatest(0, cronometro_pausado_restante_seg + p_seg),
			cronometro_duracao_seg = case
				when cronometro_pausado_restante_seg is null then cronometro_duracao_seg + p_seg
				else cronometro_duracao_seg
			end,
			atualizado_em = now()
		where comite_id = p_comite and cronometro_inicio is not null;
	end if;
end $$;

-- Aplica o tempo de fala na hora: vale para as próximas falas e ajusta a atual pela
-- diferença (o tempo já falado continua contando).
create function public.aplicar_tempo_fala(p_comite uuid, p_seg int)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia(p_comite);
	if p_seg is null or p_seg not between 1 and 3600 then
		raise exception 'O tempo de fala vai de 1 a 3600 segundos.' using errcode = '22023';
	end if;
	-- No SET, as colunas à direita ainda têm os valores de antes.
	update public.estado_sessao set
		cronometro_duracao_seg = case
			when orador_delegacao_id is not null and cronometro_inicio is not null and cronometro_pausado_restante_seg is null
				then cronometro_duracao_seg + (p_seg - tempo_fala_seg)
			else cronometro_duracao_seg
		end,
		cronometro_pausado_restante_seg = case
			when orador_delegacao_id is not null and cronometro_pausado_restante_seg is not null
				then greatest(0, cronometro_pausado_restante_seg + (p_seg - tempo_fala_seg))
			else cronometro_pausado_restante_seg
		end,
		tempo_fala_seg = p_seg,
		atualizado_em = now()
	where comite_id = p_comite;
end $$;

-- Encerrar e abrir sessão também limpam o relógio do debate (substituem as do passo 07).
create or replace function public.encerrar_sessao(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_mesa(p_comite);
	update public.sessao set fim = now() where comite_id = p_comite and fim is null;
	update public.votacao set aberta = false where comite_id = p_comite and aberta;
	update public.estado_sessao set
		sessao_id = null, orador_delegacao_id = null, cronometro_inicio = null,
		cronometro_duracao_seg = null, cronometro_pausado_restante_seg = null,
		debate_inicio = null, debate_duracao_seg = null, debate_pausado_restante_seg = null, debate_total_seg = null,
		atualizado_em = now()
	where comite_id = p_comite;
end $$;

create or replace function public.abrir_sessao(p_comite uuid)
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
	update public.votacao set aberta = false where comite_id = p_comite and aberta;
	select coalesce(max(numero), 0) + 1 into v_numero from public.sessao where comite_id = p_comite;
	if (select fase from public.estado_sessao where comite_id = p_comite) = 'debate' then
		v_presidencia := public.tomar_proxima_presidencia(p_comite);
	end if;

	insert into public.sessao (comite_id, numero, presidencia_delegacao_id)
	values (p_comite, v_numero, v_presidencia)
	returning id into v_sessao;

	insert into public.estado_sessao as e (comite_id, sessao_id) values (p_comite, v_sessao)
	on conflict (comite_id) do update set
		sessao_id = excluded.sessao_id,
		forma = case when e.fase = 'plenaria'
			then 'formal_formal'::public.forma_debate else 'formal_informal' end,
		orador_delegacao_id = null,
		cronometro_inicio = null,
		cronometro_duracao_seg = null,
		cronometro_pausado_restante_seg = null,
		debate_inicio = null,
		debate_duracao_seg = null,
		debate_pausado_restante_seg = null,
		debate_total_seg = null,
		mesa_assumiu = false,
		atualizado_em = now();
	return v_sessao;
end $$;

revoke execute on function public.debate_restante_seg(public.estado_sessao) from public, anon, authenticated;
revoke execute on function
	public.pausar(uuid, text), public.retomar(uuid, text), public.somar_segundos(uuid, int, text), public.aplicar_tempo_fala(uuid, int)
from public, anon;
grant execute on function
	public.pausar(uuid, text), public.retomar(uuid, text), public.somar_segundos(uuid, int, text), public.aplicar_tempo_fala(uuid, int)
to authenticated;
