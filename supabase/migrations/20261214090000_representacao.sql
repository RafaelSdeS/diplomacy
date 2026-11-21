-- Passo 31: o bureau assume a delegação de quem faltou, com o mínimo de regras:
-- qualquer pessoa da mesa do comitê, qualquer delegação, a qualquer momento; uma
-- delegação por pessoa da mesa de cada vez. Tudo fica no registro.

create table public.representacao (
	comite_id uuid not null,
	pessoa_id uuid not null references public.pessoa on delete cascade,
	delegacao_id uuid not null,
	desde timestamptz not null default now(),
	primary key (comite_id, pessoa_id),
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);
alter table public.representacao enable row level security;
-- Todos no comitê sabem que o bureau assumiu.
create policy "quem está no comitê vê as representações" on public.representacao
	for select to authenticated using (public.participa_do_comite(comite_id));
create trigger transmitir after insert or update or delete on public.representacao
	for each row execute function public.transmitir('comite', 'comite_id');

-- Assumir (p_delegacao) ou deixar (null) uma delegação.
create function public.representar(p_comite uuid, p_delegacao uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_antes uuid := (select delegacao_id from public.representacao where comite_id = p_comite and pessoa_id = auth.uid());
begin
	perform public.exigir_mesa(p_comite);
	if p_delegacao is not null and not exists (select 1 from public.delegacao where id = p_delegacao and comite_id = p_comite) then
		raise exception 'Escolha uma delegação do comitê.' using errcode = '22023';
	end if;
	delete from public.representacao where comite_id = p_comite and pessoa_id = auth.uid();
	if v_antes is not null then
		insert into public.registro (evento_id, pessoa_id, acao, alvo, detalhe)
		values (public.evento_do_comite(p_comite), auth.uid(), 'parar de representar', v_antes, null);
	end if;
	if p_delegacao is not null then
		insert into public.representacao (comite_id, pessoa_id, delegacao_id) values (p_comite, auth.uid(), p_delegacao);
		insert into public.registro (evento_id, pessoa_id, acao, alvo, detalhe)
		values (public.evento_do_comite(p_comite), auth.uid(), 'representar', p_delegacao, null);
	end if;
end $$;

-- A delegação de quem age na sessão (substitui a do passo 06): para a mesa, a que ela
-- representa. Um ponto só de mudança: placa, ponto, moção, assinatura e lista especial.
create or replace function public.exigir_delegacao(p_comite uuid)
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.minha_delegacao(p_comite);
begin
	if v_delegacao is null and public.tem_papel(p_comite, '{mesa}') then
		v_delegacao := (select delegacao_id from public.representacao where comite_id = p_comite and pessoa_id = auth.uid());
	end if;
	if v_delegacao is null then
		raise exception 'Só delegados do comitê podem fazer isso.' using errcode = '42501';
	end if;
	if public.sessao_atual(p_comite) is null then
		raise exception 'Nenhuma sessão aberta.' using errcode = 'P0002';
	end if;
	return v_delegacao;
end $$;

-- O que a mesa faz por uma delegação fica marcado ("pela mesa").
alter table public.pedido_fala add column pela_mesa boolean not null default false;
alter table public.ponto_mocao add column pela_mesa boolean not null default false;

create function public.marcar_pela_mesa()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	new.pela_mesa := auth.uid() is not null and public.minha_delegacao(new.comite_id) is distinct from new.delegacao_id;
	return new;
end $$;
create trigger marcar_pela_mesa before insert on public.pedido_fala
	for each row execute function public.marcar_pela_mesa();
create trigger marcar_pela_mesa before insert on public.ponto_mocao
	for each row execute function public.marcar_pela_mesa();

revoke execute on function public.marcar_pela_mesa() from public, anon, authenticated;
revoke execute on function public.representar(uuid, uuid) from public, anon;
grant execute on function public.representar(uuid, uuid) to authenticated;
