-- Passo 24: uma delegação deixa de receber bilhetes de outra (Israel e Irã, por
-- exemplo). A bloqueada fica sabendo: cortar a comunicação é um gesto diplomático.
-- A mesa vê os bloqueios do comitê, mas não desfaz. Os bilhetes antigos ficam.

create table public.bloqueio_bilhete (
	comite_id uuid not null,
	delegacao_id uuid not null, -- quem bloqueia
	bloqueada_id uuid not null,
	criado_em timestamptz not null default now(),
	primary key (delegacao_id, bloqueada_id),
	check (delegacao_id <> bloqueada_id),
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade,
	foreign key (bloqueada_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);
create index on public.bloqueio_bilhete (comite_id);
create index on public.bloqueio_bilhete (bloqueada_id);
alter table public.bloqueio_bilhete enable row level security;

-- Conjuntos calculados uma vez por consulta (como em 20261207100000_mensagens_rapidas.sql).
create policy "bloqueios: as duas delegações e a mesa" on public.bloqueio_bilhete
	for select to authenticated using (
		delegacao_id in (select public.minhas_delegacoes())
		or bloqueada_id in (select public.minhas_delegacoes())
		or comite_id in (select public.meus_comites('{mesa}'))
	);

create function public.bloquear_bilhetes(p_comite uuid, p_delegacao uuid, p_bloquear boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_minha uuid := public.minha_delegacao(p_comite);
begin
	if v_minha is null then
		raise exception 'Só delegações bloqueiam bilhetes.' using errcode = '42501';
	end if;
	if p_delegacao = v_minha
		or not exists (select 1 from public.delegacao where id = p_delegacao and comite_id = p_comite) then
		raise exception 'Escolha outra delegação do comitê.' using errcode = '22023';
	end if;
	if p_bloquear then
		insert into public.bloqueio_bilhete (comite_id, delegacao_id, bloqueada_id)
		values (p_comite, v_minha, p_delegacao)
		on conflict do nothing;
	else
		delete from public.bloqueio_bilhete where delegacao_id = v_minha and bloqueada_id = p_delegacao;
	end if;
end $$;

-- Enviar mensagem (substitui a do passo 17): o bilhete para quem bloqueou o remetente é recusado.
create or replace function public.enviar_mensagem(p_id uuid, p_comite uuid, p_tipo text, p_texto text, p_para uuid default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_minha uuid := public.minha_delegacao(p_comite);
begin
	if exists (select 1 from public.mensagem where id = p_id) then
		return; -- reenvio da caixa de saída
	end if;
	if p_tipo = 'bilhete' then
		if v_minha is null then
			raise exception 'Só delegações trocam bilhetes.' using errcode = '42501';
		end if;
		if (public.regras(p_comite) ->> 'bilhetes_bloqueados')::boolean then
			raise exception 'A mesa bloqueou os bilhetes neste comitê.';
		end if;
		if p_para is null or p_para = v_minha
			or not exists (select 1 from public.delegacao where id = p_para and comite_id = p_comite) then
			raise exception 'Escolha outra delegação do comitê.' using errcode = '22023';
		end if;
		if exists (select 1 from public.bloqueio_bilhete where delegacao_id = p_para and bloqueada_id = v_minha) then
			raise exception 'A delegação de % não aceita bilhetes da sua delegação.',
				(select nome from public.delegacao where id = p_para);
		end if;
		insert into public.mensagem (id, comite_id, tipo, de_delegacao_id, para_delegacao_id, autor_id, texto)
		values (p_id, p_comite, 'bilhete', v_minha, p_para, auth.uid(), trim(p_texto));
	elsif p_tipo = 'interno' then
		if not public.tem_papel(p_comite, '{mesa,crise}') then
			raise exception 'O canal interno é da mesa com a crise.' using errcode = '42501';
		end if;
		insert into public.mensagem (id, comite_id, tipo, autor_id, texto) values (p_id, p_comite, 'interno', auth.uid(), trim(p_texto));
	elsif p_tipo = 'mesa' then
		if public.tem_papel(p_comite, '{mesa}') then
			if not exists (select 1 from public.delegacao where id = p_para and comite_id = p_comite) then
				raise exception 'Escolha a delegação.' using errcode = '22023';
			end if;
			insert into public.mensagem (id, comite_id, tipo, para_delegacao_id, autor_id, texto)
			values (p_id, p_comite, 'mesa', p_para, auth.uid(), trim(p_texto));
		elsif v_minha is not null then
			insert into public.mensagem (id, comite_id, tipo, de_delegacao_id, autor_id, texto)
			values (p_id, p_comite, 'mesa', v_minha, auth.uid(), trim(p_texto));
		else
			raise exception 'Só delegações e a mesa usam esta conversa.' using errcode = '42501';
		end if;
	else
		raise exception 'Tipo de mensagem desconhecido.' using errcode = '22023';
	end if;
end $$;

-- As duas delegações e a mesa ficam sabendo na hora.
create trigger transmitir after insert or update or delete on public.bloqueio_bilhete
	for each row execute function public.transmitir('delegacao', 'delegacao_id', 'delegacao', 'bloqueada_id', 'mesa', 'comite_id');
-- Com tecnologia restrita, os delegados não escrevem durante a sessão.
create trigger bloquear_tecnologia_restrita before insert or update on public.bloqueio_bilhete
	for each row execute function public.bloquear_tecnologia_restrita();

revoke execute on function public.bloquear_bilhetes(uuid, uuid, boolean) from public, anon;
grant execute on function public.bloquear_bilhetes(uuid, uuid, boolean) to authenticated;
