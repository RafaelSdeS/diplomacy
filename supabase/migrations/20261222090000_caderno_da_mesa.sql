-- Passo 55 (parte B): o caderno da mesa. A mesa anota sobre as delegações (o desempenho,
-- útil para a premiação), e só a mesa do comitê lê. A dona é a mesa quando delegacao_id é
-- nulo. A regra do passo 34 continua: a mesa nunca lê o caderno das delegações, e as notas
-- da mesa não se compartilham.

alter table public.anotacao alter column delegacao_id drop not null;

create policy "caderno da mesa: só a mesa do comitê" on public.anotacao
	for select to authenticated using (delegacao_id is null and public.tem_papel(comite_id, '{mesa}'));

-- A anotação de quem chama: da delegação dele ou, se nula, da mesa do comitê.
create or replace function public.exigir_minha_anotacao(p_id uuid)
returns public.anotacao
language plpgsql stable security definer set search_path = ''
as $$
declare
	a public.anotacao := (select x from public.anotacao x where x.id = p_id);
begin
	if a.id is null or (
		case when a.delegacao_id is null then not public.tem_papel(a.comite_id, '{mesa}')
		else a.delegacao_id is distinct from public.minha_delegacao(a.comite_id) end
	) then
		raise exception 'Só a delegação dona mexe nesta anotação.' using errcode = '42501';
	end if;
	return a;
end $$;

create or replace function public.salvar_anotacao(
	p_id uuid, p_comite uuid, p_tipo text, p_texto text,
	p_titulo text default null, p_sobre uuid default null, p_topico int default null, p_orador uuid default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_minha uuid := public.minha_delegacao(p_comite);
begin
	if v_minha is null and not public.tem_papel(p_comite, '{mesa}') then
		raise exception 'Só delegados e a mesa do comitê escrevem no caderno.' using errcode = '42501';
	end if;
	if exists (select 1 from public.anotacao where id = p_id) then
		perform public.exigir_minha_anotacao(p_id);
		update public.anotacao set
			texto = trim(p_texto), titulo = nullif(trim(p_titulo), ''), sobre_delegacao_id = p_sobre,
			atualizado_em = clock_timestamp()
		where id = p_id;
	else
		-- Sem delegação, a dona é a mesa (delegacao_id nulo).
		insert into public.anotacao (id, comite_id, delegacao_id, tipo, sobre_delegacao_id, topico, orador_delegacao_id, titulo, texto, autor_id)
		values (p_id, p_comite, v_minha, p_tipo, p_sobre, p_topico, p_orador, nullif(trim(p_titulo), ''), trim(p_texto), auth.uid());
	end if;
end $$;

create or replace function public.compartilhar_anotacao(p_id uuid, p_delegacoes uuid[])
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	a public.anotacao := public.exigir_minha_anotacao(p_id);
begin
	if a.delegacao_id is null then
		raise exception 'As anotações da mesa não se compartilham.' using errcode = '22023';
	end if;
	if a.delegacao_id = any (p_delegacoes)
		or exists (
			select 1 from unnest(p_delegacoes) as d(id)
			where not exists (select 1 from public.delegacao x where x.id = d.id and x.comite_id = a.comite_id)
		) then
		raise exception 'Compartilhe com outras delegações do comitê.' using errcode = '22023';
	end if;
	delete from public.anotacao_compartilhada where anotacao_id = p_id;
	insert into public.anotacao_compartilhada (anotacao_id, comite_id, delegacao_id)
	select p_id, a.comite_id, d from unnest(p_delegacoes) as d on conflict do nothing;
end $$;
