-- Passo 03: convites da secretaria, criação automática da pessoa e das
-- participações, e a visão com as participações de quem está logado.
--
-- Não há cadastro livre (config.toml: enable_signup = false). As contas são
-- criadas pelo seed ou pelo administrador; os convites definem o papel.

create table public.convite (
	id uuid primary key default gen_random_uuid(),
	email text not null check (email = lower(email) and position('@' in email) > 1),
	evento_id uuid not null references public.evento on delete cascade,
	papel public.papel not null,
	comite_id uuid,
	delegacao_id uuid,
	criado_em timestamptz not null default now(),
	-- As mesmas regras da participação.
	foreign key (comite_id, evento_id) references public.comite (id, evento_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade,
	check (papel <> 'delegado' or delegacao_id is not null),
	check (papel <> 'secretaria' or comite_id is null),
	check (papel = 'secretaria' or comite_id is not null),
	unique nulls not distinct (email, evento_id, papel, comite_id)
);

create index on public.convite (email);

alter table public.convite enable row level security;

create policy "só a secretaria vê os convites do evento"
	on public.convite for select to authenticated
	using (public.eh_secretaria(evento_id));

create policy "só a secretaria cria convites"
	on public.convite for insert to authenticated
	with check (public.eh_secretaria(evento_id));

create policy "só a secretaria altera convites"
	on public.convite for update to authenticated
	using (public.eh_secretaria(evento_id))
	with check (public.eh_secretaria(evento_id));

create policy "só a secretaria remove convites"
	on public.convite for delete to authenticated
	using (public.eh_secretaria(evento_id));

-- Transforma os convites de um e-mail em participações da conta.
create function public.aplicar_convites(p_usuario uuid, p_email text)
returns void
language sql security definer set search_path = ''
as $$
	insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id)
	select p_usuario, c.evento_id, c.papel, c.comite_id, c.delegacao_id
	from public.convite c
	where c.email = lower(p_email)
	on conflict (pessoa_id, evento_id, papel, comite_id) do nothing;
$$;

-- Ninguém chama direto: só os gatilhos abaixo. Senão um usuário poderia
-- aplicar os convites de outro e-mail à própria conta.
revoke execute on function public.aplicar_convites(uuid, text) from public, anon, authenticated;

-- Conta nova: cria a pessoa (nome do cadastro, da conta Google ou do e-mail)
-- e aplica os convites do e-mail.
create function public.nova_conta()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	insert into public.pessoa (id, nome)
	values (
		new.id,
		coalesce(
			nullif(new.raw_user_meta_data ->> 'nome', ''),
			nullif(new.raw_user_meta_data ->> 'full_name', ''),
			nullif(split_part(new.email, '@', 1), ''),
			'Sem nome'
		)
	)
	on conflict (id) do nothing;

	if new.email is not null then
		perform public.aplicar_convites(new.id, new.email);
	end if;

	return new;
end;
$$;

create trigger nova_conta
	after insert on auth.users
	for each row execute function public.nova_conta();

-- Convite novo para quem já tem conta: a participação vale na hora.
create function public.convite_criado()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	insert into public.participacao (pessoa_id, evento_id, papel, comite_id, delegacao_id)
	select p.id, new.evento_id, new.papel, new.comite_id, new.delegacao_id
	from auth.users u
	join public.pessoa p on p.id = u.id
	where lower(u.email) = new.email
	on conflict (pessoa_id, evento_id, papel, comite_id) do nothing;

	return new;
end;
$$;

create trigger convite_criado
	after insert on public.convite
	for each row execute function public.convite_criado();

-- As participações de quem está logado, já com evento, comitê e delegação.
-- security_invoker: valem as regras de acesso das tabelas de origem.
create view public.minhas_participacoes
with (security_invoker = true)
as
select
	pa.id,
	pa.papel,
	pa.evento_id,
	e.nome as evento_nome,
	pa.comite_id,
	c.sigla as comite_sigla,
	c.nome as comite_nome,
	pa.delegacao_id,
	d.nome as delegacao_nome,
	d.bandeira as delegacao_bandeira
from public.participacao pa
join public.evento e on e.id = pa.evento_id
left join public.comite c on c.id = pa.comite_id
left join public.delegacao d on d.id = pa.delegacao_id
where pa.pessoa_id = auth.uid();
