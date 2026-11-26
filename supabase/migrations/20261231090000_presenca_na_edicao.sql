-- Passo 58 (o que faltava): "Fulano está editando". Quem abre a escrita de um documento da mesa
-- se anuncia (presença do Realtime) no canal edicao:<documento>, que só a mesa e a secretaria
-- do comitê ouvem. Não trava nada: a conferência da versão ao salvar continua valendo.

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
		when 'documento' then public.pode_ver_documento(v_id)
		when 'evento' then public.eh_participante(v_id)
		when 'edicao' then public.tem_papel((select comite_id from public.documento_mesa where id = v_id), '{mesa,secretaria}')
		else false
	end;
end $$;

-- A presença vale em qualquer canal do app para quem pode ouvi-lo; só a escrita da mesa a usa.
create policy "presença: quem pode ouvir o canal vê quem está nele" on realtime.messages
	for select to authenticated
	using (extension = 'presence' and public.pode_ouvir((select realtime.topic())));
create policy "presença: quem pode ouvir o canal se anuncia" on realtime.messages
	for insert to authenticated
	with check (extension = 'presence' and public.pode_ouvir((select realtime.topic())));
