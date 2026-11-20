-- Passo 15: a proposta de alteração ganha o id gerado no aparelho, como a nota de
-- crise e a matéria: reenviar da caixa de saída nunca duplica.
drop function public.propor_alteracao(uuid, text);

create function public.propor_alteracao(p_clausula uuid, p_texto text, p_id uuid default gen_random_uuid())
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	c public.clausula := (select x from public.clausula x where x.id = p_clausula);
	d public.documento := public.exigir_editavel(c.documento_id);
	v_delegacao uuid := public.exigir_membro(d.bloco_id);
begin
	if exists (select 1 from public.proposta_alteracao where id = p_id) then
		return;
	end if;
	if c.status = 'acordada' then
		raise exception 'Cláusula acordada não recebe propostas. Peça a reabertura.';
	end if;
	insert into public.proposta_alteracao (id, clausula_id, documento_id, comite_id, delegacao_id, texto_novo)
	values (p_id, p_clausula, d.id, d.comite_id, v_delegacao, trim(p_texto));
end $$;

revoke execute on function public.propor_alteracao(uuid, text, uuid) from public, anon;
grant execute on function public.propor_alteracao(uuid, text, uuid) to authenticated;
