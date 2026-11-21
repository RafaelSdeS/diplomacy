-- Passo 29: pontos e moções em duas etapas. A delegação apresenta; o bureau aprova
-- (em ordem) ou recusa (fora de ordem, com motivo); só depois a presidência concede.
-- Quando o próprio bureau preside (plenária, fase de ação, mesa assumiu, ou sem
-- delegação na presidência), as duas etapas viram um toque só.
--
-- A aprovação fica numa coluna: o pedido continua "aberto" até a presidência agir, e
-- as funções de conceder (responder_ponto, abrir_votacao, abrir_lista_especial) não
-- mudam. Um gatilho impede que o pedido saia de "aberto" sem o julgamento do bureau.

alter table public.ponto_mocao
	add column aprovado_bureau boolean, -- nulo: aguardando o bureau
	add column motivo text check (char_length(motivo) <= 200),
	add column julgado_por uuid references public.pessoa on delete set null,
	add column julgado_em timestamptz;

-- O bureau preside agora?
create function public.bureau_preside(p_comite uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select coalesce((
		select e.fase <> 'debate' or e.mesa_assumiu or s.presidencia_delegacao_id is null
		from public.estado_sessao e
		left join public.sessao s on s.id = e.sessao_id
		where e.comite_id = p_comite
	), true);
$$;

create function public.julgar_ponto(p_ponto uuid, p_em_ordem boolean, p_motivo text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_ponto public.ponto_mocao := (select x from public.ponto_mocao x where x.id = p_ponto);
begin
	perform public.exigir_mesa(v_ponto.comite_id);
	if v_ponto.status <> 'aberto' or v_ponto.aprovado_bureau is not null then
		raise exception 'Este pedido já foi julgado.';
	end if;
	update public.ponto_mocao set
		aprovado_bureau = p_em_ordem,
		status = case when p_em_ordem then 'aberto' else 'recusado' end,
		motivo = case when p_em_ordem then null else nullif(trim(p_motivo), '') end,
		julgado_por = auth.uid(),
		julgado_em = now()
	where id = p_ponto;
end $$;

-- Sair de "aberto" (conceder, votar, abrir lista, recusar) exige o julgamento do bureau,
-- a não ser que o bureau esteja presidindo ou a própria mesa aja (ela é o bureau: o
-- julgamento está implícito). Ações do sistema (sem usuário) passam.
create function public.exigir_julgamento_do_bureau()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	if auth.uid() is not null and old.status = 'aberto' and new.status <> 'aberto'
		and new.aprovado_bureau is null and not public.bureau_preside(new.comite_id)
		and not public.tem_papel(new.comite_id, '{mesa}') then
		raise exception 'O bureau ainda não aprovou este pedido.';
	end if;
	return new;
end $$;
create trigger exigir_julgamento_do_bureau before update of status on public.ponto_mocao
	for each row execute function public.exigir_julgamento_do_bureau();

revoke execute on function public.exigir_julgamento_do_bureau() from public, anon, authenticated;
revoke execute on function public.bureau_preside(uuid), public.julgar_ponto(uuid, boolean, text) from public, anon;
grant execute on function public.bureau_preside(uuid), public.julgar_ponto(uuid, boolean, text) to authenticated;
