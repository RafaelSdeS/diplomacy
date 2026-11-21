-- Passo 22: a agenda é sempre debatida e adotada antes das resoluções; a mesa pode
-- retirar a adoção e editar a agenda adotada sem perder o andamento dos itens.

-- A agenda do tópico já foi adotada? (com as permissões de quem chama)
create function public.agenda_adotada(p_comite uuid, p_topico int)
returns boolean
language sql stable set search_path = ''
as $$
	select exists (select 1 from public.proposta_agenda where comite_id = p_comite and topico = p_topico and adotada);
$$;

create function public.retirar_adocao(p_proposta uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_comite uuid := (select comite_id from public.proposta_agenda where id = p_proposta);
begin
	perform public.exigir_mesa(v_comite);
	update public.proposta_agenda set adotada = false where id = p_proposta;
end $$;

-- A mesa ajusta a agenda adotada. Itens de mesmo texto continuam os mesmos (com o
-- andamento e os working papers ligados a eles); os novos entram pendentes e os que
-- saíram são apagados (os working papers ligados a eles ficam sem item).
create function public.editar_agenda_adotada(p_proposta uuid, p_itens jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_proposta public.proposta_agenda := (select x from public.proposta_agenda x where x.id = p_proposta);
	v_pais uuid[] := '{}'; -- o último item de cada nível acima do atual
	v_usados uuid[] := '{}';
	v_item jsonb;
	v_nivel int;
	v_id uuid;
	v_ordem int := 0;
begin
	perform public.exigir_mesa(v_proposta.comite_id);
	if not coalesce(v_proposta.adotada, false) then
		raise exception 'Só a agenda adotada é editada assim.';
	end if;
	if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) not between 1 and 60 then
		raise exception 'A agenda precisa ter de 1 a 60 itens.' using errcode = '22023';
	end if;

	for v_item in select * from jsonb_array_elements(p_itens) loop
		v_nivel := least(greatest(coalesce((v_item ->> 'nivel')::int, 0), 0), 2, coalesce(array_length(v_pais, 1), 0));
		v_ordem := v_ordem + 1;
		select id into v_id from public.ponto_pauta
		where proposta_id = p_proposta and trim(texto) = trim(v_item ->> 'texto') and not (id = any (v_usados))
		order by ordem limit 1;
		if v_id is null then
			insert into public.ponto_pauta (proposta_id, comite_id, pai_id, texto, ordem)
			values (p_proposta, v_proposta.comite_id, case when v_nivel > 0 then v_pais[v_nivel] end, trim(v_item ->> 'texto'), v_ordem)
			returning id into v_id;
		else
			update public.ponto_pauta set pai_id = case when v_nivel > 0 then v_pais[v_nivel] end, ordem = v_ordem
			where id = v_id;
		end if;
		v_usados := v_usados || v_id;
		v_pais := v_pais[1:v_nivel] || v_id;
	end loop;
	-- Os que sobraram não apontam para nenhum item usado: o cascade não alcança os usados.
	delete from public.ponto_pauta where proposta_id = p_proposta and not (id = any (v_usados));
end $$;

-- Projeto de resolução só depois da agenda adotada do tópico (substitui o do passo 09).
create or replace function public.criar_documento(
	p_bloco uuid, p_tipo text, p_titulo text, p_topico int default null,
	p_ponto_pauta uuid default null, p_atualizacao uuid default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.exigir_membro(p_bloco);
	v_comite uuid := (select comite_id from public.bloco where id = p_bloco);
	v_id uuid;
begin
	-- Observadoras apresentam working papers, mas não projetos.
	if p_tipo <> 'working_paper'
		and (select situacao from public.delegacao where id = v_delegacao) <> 'membro' then
		raise exception 'Delegação observadora apresenta só working papers.';
	end if;
	-- ponytail: projeto sem tópico (só pela API, a tela sempre pede o tópico) fica sem a
	-- regra, como já fica sem a de uma resolução por tópico; os testes usam isso.
	if p_tipo = 'projeto' and p_topico is not null
		and not exists (select 1 from public.proposta_agenda where comite_id = v_comite and topico = p_topico and adotada) then
		raise exception 'Adote a agenda do tópico antes de apresentar um projeto de resolução.';
	end if;
	insert into public.documento (comite_id, bloco_id, tipo, titulo, topico, ponto_pauta_id, atualizacao_crise_id)
	values (v_comite, p_bloco, p_tipo, trim(p_titulo), p_topico, p_ponto_pauta, p_atualizacao)
	returning id into v_id;
	return v_id;
end $$;

revoke execute on function
	public.agenda_adotada(uuid, int), public.retirar_adocao(uuid), public.editar_agenda_adotada(uuid, jsonb)
from public, anon;
grant execute on function
	public.agenda_adotada(uuid, int), public.retirar_adocao(uuid), public.editar_agenda_adotada(uuid, jsonb)
to authenticated;
