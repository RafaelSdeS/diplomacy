-- Passo 59: uma presidência por vez. O bureau (a mesa) conduz só quando a regra manda: a
-- plenária de abertura, a fase de ação e os casos excepcionais (mesa que assumiu). Com uma
-- delegação da vez no debate, a mesa é só bureau: julga os pontos, confirma chegadas e
-- avalia documentos. A presidência muda no fim da sessão ou na não-confiança, não à vontade.

create or replace function public.pode_presidir(p_comite uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select (public.tem_papel(p_comite, '{mesa}') and public.bureau_preside(p_comite)) or exists (
		select 1 from public.estado_sessao e
		join public.sessao s on s.id = e.sessao_id
		where e.comite_id = p_comite
			and e.fase = 'debate'
			and not e.mesa_assumiu
			and s.presidencia_delegacao_id = public.minha_delegacao(p_comite)
	);
$$;

-- A próxima do rodízio. Com a chamada da sessão aberta já feita (fim da plenária,
-- não-confiança), a ausente não assume e não gasta a vez. Na abertura da sessão, a
-- chamada ainda não foi feita: vale a ordem, e a mesa resolve a ausência depois.
create or replace function public.tomar_proxima_presidencia(p_comite uuid)
returns uuid
language sql security definer set search_path = ''
as $$
	with aberta as (
		select s.id from public.estado_sessao e join public.sessao s on s.id = e.sessao_id
		where e.comite_id = p_comite and s.fim is null
	)
	update public.rodizio_presidencia r set vezes = r.vezes + 1
	from (
		select rp.ordem from public.rodizio_presidencia rp
		where rp.comite_id = p_comite
			and rp.vezes < (public.regras(p_comite) ->> 'max_sessoes_presidencia')::int
			and (
				not exists (select 1 from public.presenca p where p.sessao_id = (select id from aberta))
				or exists (select 1 from public.presenca p where p.sessao_id = (select id from aberta) and p.delegacao_id = rp.delegacao_id)
			)
		order by rp.vezes, rp.ordem
		limit 1
	) as proxima
	where r.comite_id = p_comite and r.ordem = proxima.ordem
	returning r.delegacao_id;
$$;

-- A delegação da vez faltou à chamada: assume a próxima presente, e a ausente fica com a vez.
create function public.presidencia_ausente(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_sessao uuid := public.sessao_atual(p_comite);
	v_da_vez uuid := (select presidencia_delegacao_id from public.sessao where id = v_sessao);
begin
	perform public.exigir_mesa(p_comite);
	if v_da_vez is null or exists (select 1 from public.presenca where sessao_id = v_sessao and delegacao_id = v_da_vez) then
		raise exception 'A delegação da vez está presente.' using errcode = '22023';
	end if;
	update public.rodizio_presidencia set vezes = greatest(vezes - 1, 0) where comite_id = p_comite and delegacao_id = v_da_vez;
	update public.sessao set presidencia_delegacao_id = public.tomar_proxima_presidencia(p_comite) where id = v_sessao;
	update public.estado_sessao set atualizado_em = now() where comite_id = p_comite;
end $$;

-- Passar a presidência à vontade sai: ela muda no fim da sessão ou na não-confiança.
drop function public.passar_presidencia(uuid);

-- Assumir fica para os casos excepcionais, com um motivo curto à vista na sessão.
alter table public.estado_sessao add column motivo_mesa text check (char_length(motivo_mesa) <= 200);
drop function public.assumir_presidencia(uuid, boolean);
create function public.assumir_presidencia(p_comite uuid, p_assumir boolean, p_motivo text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_mesa(p_comite);
	update public.estado_sessao
	set mesa_assumiu = p_assumir, motivo_mesa = case when p_assumir then nullif(trim(p_motivo), '') end, atualizado_em = now()
	where comite_id = p_comite;
end $$;

revoke execute on function public.presidencia_ausente(uuid), public.assumir_presidencia(uuid, boolean, text) from public, anon;
grant execute on function public.presidencia_ausente(uuid), public.assumir_presidencia(uuid, boolean, text) to authenticated;
