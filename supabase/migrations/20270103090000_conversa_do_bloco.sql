-- Passo 63 (lote 1): a conversa de cada bloco. Só os membros leem e escrevem; quem sai do bloco
-- deixa de ver. A mesa lê só o que for denunciado, como nos bilhetes.

alter table public.mensagem add column bloco_id uuid;
alter table public.mensagem add constraint mensagem_bloco_fkey
	foreign key (bloco_id, comite_id) references public.bloco (id, comite_id) on delete cascade;
create index on public.mensagem (bloco_id) where bloco_id is not null;

alter table public.mensagem drop constraint mensagem_tipo_check;
alter table public.mensagem add constraint mensagem_tipo_check check (tipo in ('bilhete', 'interno', 'mesa', 'bloco'));
alter table public.mensagem drop constraint mensagem_check;
alter table public.mensagem add constraint mensagem_check check (case tipo
	when 'bilhete' then de_delegacao_id is not null and para_delegacao_id is not null and de_delegacao_id <> para_delegacao_id
	when 'interno' then de_delegacao_id is null and para_delegacao_id is null
	when 'bloco' then de_delegacao_id is not null and para_delegacao_id is null
	else (de_delegacao_id is null) <> (para_delegacao_id is null)
end and (tipo = 'bloco') = (bloco_id is not null));

-- Os blocos das delegações da pessoa (para a regra de leitura).
create function public.meus_blocos()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
	select bloco_id from public.bloco_membro where delegacao_id in (select public.minhas_delegacoes());
$$;

drop policy "mensagens: quem participa da conversa" on public.mensagem;
create policy "mensagens: quem participa da conversa" on public.mensagem
	for select to authenticated using (
		case tipo
			when 'interno' then comite_id in (select public.meus_comites('{mesa,crise}'))
			when 'mesa' then comite_id in (select public.meus_comites('{mesa}'))
				or coalesce(de_delegacao_id, para_delegacao_id) in (select public.minhas_delegacoes())
			when 'bloco' then (not oculta and bloco_id in (select public.meus_blocos()))
				or id in (select public.bilhetes_denunciados_a_mim())
			else (not oculta and (
					de_delegacao_id in (select public.minhas_delegacoes())
					or para_delegacao_id in (select public.minhas_delegacoes())
				))
				or comite_id in (select public.comites_onde_a_mesa_le_bilhetes())
				or id in (select public.bilhetes_denunciados_a_mim())
		end
	);

create or replace function public.pode_ver_mensagem(p_mensagem uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.mensagem m
		where m.id = p_mensagem and case m.tipo
			when 'interno' then public.tem_papel(m.comite_id, '{mesa,crise}')
			when 'mesa' then public.tem_papel(m.comite_id, '{mesa}')
				or coalesce(m.de_delegacao_id, m.para_delegacao_id) = public.minha_delegacao(m.comite_id)
			when 'bloco' then (not m.oculta and public.sou_do_bloco(m.bloco_id))
				or (public.tem_papel(m.comite_id, '{mesa}') and exists (select 1 from public.denuncia_mensagem d where d.mensagem_id = m.id))
			else (not m.oculta and public.minha_delegacao(m.comite_id) in (m.de_delegacao_id, m.para_delegacao_id))
				or (public.tem_papel(m.comite_id, '{mesa}') and (
					(public.regras(m.comite_id) ->> 'mesa_le_bilhetes')::boolean
					or exists (select 1 from public.denuncia_mensagem d where d.mensagem_id = m.id)
				))
		end
	);
$$;

-- Na conversa do bloco, p_para é o bloco.
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
	elsif p_tipo = 'bloco' then
		if v_minha is null or not exists (select 1 from public.bloco where id = p_para and comite_id = p_comite) or not public.sou_do_bloco(p_para) then
			raise exception 'Só os membros do bloco escrevem na conversa dele.' using errcode = '42501';
		end if;
		insert into public.mensagem (id, comite_id, tipo, de_delegacao_id, bloco_id, autor_id, texto)
		values (p_id, p_comite, 'bloco', v_minha, p_para, auth.uid(), trim(p_texto));
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

-- Um membro denuncia uma mensagem do bloco como denuncia um bilhete; a mesa passa a lê-la.
create or replace function public.denunciar_mensagem(p_mensagem uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	m public.mensagem := (select x from public.mensagem x where x.id = p_mensagem);
begin
	if m.id is null or m.tipo not in ('bilhete', 'bloco') or not public.pode_ver_mensagem(p_mensagem) then
		raise exception 'Bilhete não encontrado.' using errcode = 'P0002';
	end if;
	if coalesce(trim(p_motivo), '') = '' then
		raise exception 'Diga o motivo da denúncia.' using errcode = '22023';
	end if;
	insert into public.denuncia_mensagem (mensagem_id, comite_id, autor_id, motivo) values (p_mensagem, m.comite_id, auth.uid(), trim(p_motivo));
end $$;

-- Os membros ficam sabendo na hora, no canal bloco:<id>.
drop trigger transmitir on public.mensagem;
create trigger transmitir after insert or update or delete on public.mensagem
	for each row execute function public.transmitir(
		'delegacao', 'de_delegacao_id', 'delegacao', 'para_delegacao_id', 'mesa', 'comite_id', 'crise', 'crise_comite_id', 'bloco', 'bloco_id'
	);

create or replace function public.pode_ouvir(p_topico text)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
	v_tipo text := split_part(p_topico, ':', 1);
	v_id uuid;
begin
	if split_part(p_topico, ':', 3) <> '' then
		return false;
	end if;
	begin
		v_id := split_part(p_topico, ':', 2)::uuid;
	exception when invalid_text_representation then
		return false;
	end;
	return case v_tipo
		when 'comite' then public.participa_do_comite(v_id)
		when 'crise' then public.tem_papel(v_id, '{crise,secretaria}')
		when 'mesa' then public.tem_papel(v_id, '{mesa,secretaria}')
		when 'delegacao' then exists (
			select 1 from public.participacao where pessoa_id = auth.uid() and delegacao_id = v_id
		)
		when 'bloco' then public.sou_do_bloco(v_id)
		when 'documento' then public.pode_ver_documento(v_id)
		when 'evento' then public.eh_participante(v_id)
		when 'edicao' then public.tem_papel((select comite_id from public.documento_mesa where id = v_id), '{mesa,secretaria}')
		else false
	end;
end $$;

revoke execute on function public.meus_blocos() from public, anon;
grant execute on function public.meus_blocos() to authenticated;
