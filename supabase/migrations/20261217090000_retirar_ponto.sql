-- Passo 38: a delegação retira o próprio ponto ou moção enquanto ele espera
-- (antes de virar lista especial, votação ou resposta).

alter table public.ponto_mocao
	drop constraint ponto_mocao_status_check,
	add constraint ponto_mocao_status_check
		check (status in ('aberto', 'em_discussao', 'em_votacao', 'aceito', 'recusado', 'retirado'));

create function public.retirar_ponto(p_ponto uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v public.ponto_mocao := (select x from public.ponto_mocao x where x.id = p_ponto);
begin
	if v.id is null or v.delegacao_id is distinct from public.exigir_delegacao(v.comite_id) then
		raise exception 'Só a delegação que pediu retira o pedido.' using errcode = '42501';
	end if;
	if v.status <> 'aberto' then
		raise exception 'O pedido já foi atendido e não pode mais ser retirado.';
	end if;
	update public.ponto_mocao set status = 'retirado' where id = p_ponto;
end $$;

-- O julgamento do bureau (passo 29) não vale para quem retira o próprio pedido.
create or replace function public.exigir_julgamento_do_bureau()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	if auth.uid() is not null and old.status = 'aberto' and new.status not in ('aberto', 'retirado')
		and new.aprovado_bureau is null and not public.bureau_preside(new.comite_id)
		and not public.tem_papel(new.comite_id, '{mesa}') then
		raise exception 'O bureau ainda não aprovou este pedido.';
	end if;
	return new;
end $$;

revoke execute on function public.retirar_ponto(uuid) from public, anon;
grant execute on function public.retirar_ponto(uuid) to authenticated;
