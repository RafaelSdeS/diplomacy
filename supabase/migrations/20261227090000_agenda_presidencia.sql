-- Passo 60 (ajuste de 25/11/2026): a presidência da sessão também inclui (ou recusa) as
-- alterações que as delegações propõem na agenda, além da mesa.
create or replace function public.responder_alteracao_agenda(p_alteracao uuid, p_aceitar boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	a public.alteracao_agenda := (select x from public.alteracao_agenda x where x.id = p_alteracao);
	v_pai uuid;
	v_fim int;
	v_bloco uuid[];
	v_resto uuid[];
	v_nova uuid[];
	v_pos int;
begin
	if not (public.tem_papel(a.comite_id, '{mesa}') or public.pode_presidir(a.comite_id)) then
		raise exception 'Só a presidência da sessão ou a mesa incluem alterações na agenda.' using errcode = '42501';
	end if;
	if a.status <> 'aberta' then
		raise exception 'Esta alteração já foi respondida.' using errcode = '22023';
	end if;
	update public.alteracao_agenda set status = case when p_aceitar then 'aceita' else 'recusada' end where id = p_alteracao;
	if not p_aceitar then
		return;
	end if;
	if a.acao = 'alterar' then
		update public.ponto_pauta set texto = a.texto where id = a.ponto_id;
	elsif a.acao = 'retirar' then
		delete from public.ponto_pauta where id = a.ponto_id;
	elsif a.acao = 'incluir' then
		if a.depois_de is null then
			v_pai := null;
			v_fim := coalesce((select max(ordem) from public.ponto_pauta where proposta_id = a.proposta_id), 0);
		else
			v_pai := case when a.dentro then a.depois_de else (select pai_id from public.ponto_pauta where id = a.depois_de) end;
			v_fim := (select max(ordem) from public.ponto_pauta where id in (select public.subarvore_pauta(a.depois_de)));
		end if;
		update public.ponto_pauta set ordem = ordem + 1 where proposta_id = a.proposta_id and ordem > v_fim;
		insert into public.ponto_pauta (proposta_id, comite_id, pai_id, texto, ordem)
		values (a.proposta_id, a.comite_id, v_pai, a.texto, v_fim + 1);
	else -- mover: o item (com os de dentro) vai para depois de depois_de, no nível dele
		v_bloco := array(select id from public.ponto_pauta where id in (select public.subarvore_pauta(a.ponto_id)) order by ordem);
		if a.depois_de = any (v_bloco) then
			raise exception 'Um item não vai para dentro de si mesmo.' using errcode = '22023';
		end if;
		v_resto := array(select id from public.ponto_pauta where proposta_id = a.proposta_id and not (id = any (v_bloco)) order by ordem);
		if a.depois_de is null then
			v_nova := v_bloco || v_resto;
		else
			v_pos := (select max(array_position(v_resto, s)) from public.subarvore_pauta(a.depois_de) as s);
			v_nova := v_resto[1:v_pos] || v_bloco || v_resto[v_pos + 1:];
		end if;
		update public.ponto_pauta set ordem = array_position(v_nova, id) where proposta_id = a.proposta_id;
		update public.ponto_pauta set pai_id = (select pai_id from public.ponto_pauta where id = a.depois_de) where id = a.ponto_id;
	end if;
end $$;
