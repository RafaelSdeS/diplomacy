-- Passo 58 (o que faltava): a mesa mostra um documento publicado no telão, que o projeta no
-- lugar do painel da sessão até "Voltar à sessão". Um por comitê.
alter table public.documento_mesa add column no_telao boolean not null default false;
create unique index on public.documento_mesa (comite_id) where no_telao;

-- Sem documento, o telão volta à sessão.
create function public.mostrar_documento_mesa_no_telao(p_comite uuid, p_documento uuid default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_mesa(p_comite);
	if p_documento is not null and not exists (
		select 1 from public.documento_mesa where id = p_documento and comite_id = p_comite and versao > 0
	) then
		raise exception 'Publique o documento antes de mostrá-lo no telão.' using errcode = '22023';
	end if;
	update public.documento_mesa set no_telao = false where comite_id = p_comite and no_telao and id is distinct from p_documento;
	update public.documento_mesa set no_telao = true where id = p_documento;
end $$;
revoke execute on function public.mostrar_documento_mesa_no_telao(uuid, uuid) from public, anon;
grant execute on function public.mostrar_documento_mesa_no_telao(uuid, uuid) to authenticated;
