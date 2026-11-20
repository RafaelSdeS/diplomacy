-- Passo 13: tempo real por Broadcast em canais privados, no lugar de Postgres Changes.
--
-- Cada mudança numa tabela ao vivo manda um aviso curto ("mudou", com o nome da
-- tabela e sem os dados da linha) aos canais interessados; a tela recarrega pela API,
-- com a RLS de sempre. Assim o canal nunca carrega dado privado, e o banco não precisa
-- conferir a RLS de cada mudança para cada pessoa conectada.
--
--   comite:<id>      sessão, votos, pauta, documentos, DPO, cartas, press, plantões
--   documento:<id>   cláusulas, propostas, comentários, assinaturas e rodadas
--   crise:<id>       notas de crise do comitê (equipe de crise)
--   delegacao:<id>   notas de crise da delegação
--   evento:<id>      avisos e a capa da press

-- Quem pode entrar em cada canal.
create function public.pode_ouvir(p_topico text)
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
		when 'delegacao' then exists (
			select 1 from public.participacao where pessoa_id = auth.uid() and delegacao_id = v_id
		)
		when 'documento' then public.pode_ver_documento(v_id)
		when 'evento' then public.eh_participante(v_id)
		else false
	end;
end $$;

revoke execute on function public.pode_ouvir(text) from public, anon;
grant execute on function public.pode_ouvir(text) to authenticated;

-- Só entra no canal quem pode ouvi-lo. Ninguém transmite pelo app: sem política de
-- insert, só os gatilhos do banco mandam mensagens.
create policy "canais do app: quem pode ouvir" on realtime.messages
	for select to authenticated
	using (extension = 'broadcast' and public.pode_ouvir((select realtime.topic())));

-- Gatilho genérico. Os argumentos vêm em pares (canal, coluna): o id do canal sai da
-- coluna da linha; "$evento" usa o evento do comitê e "$clausula" o documento da
-- cláusula. Numa mesma transação, cada canal recebe um aviso só por tabela.
create function public.transmitir()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
	v_linha jsonb := to_jsonb(coalesce(new, old));
	v_coluna text;
	v_id text;
	v_topico text;
	v_enviados text := coalesce(current_setting('diplomacy.transmitidos', true), '');
begin
	for i in 0 .. tg_nargs / 2 - 1 loop
		v_coluna := tg_argv[i * 2 + 1];
		v_id := case v_coluna
			when '$evento' then public.evento_do_comite((v_linha ->> 'comite_id')::uuid)::text
			when '$clausula' then (select documento_id::text from public.clausula where id = (v_linha ->> 'clausula_id')::uuid)
			else v_linha ->> v_coluna
		end;
		continue when v_id is null;
		v_topico := tg_argv[i * 2] || ':' || v_id;
		continue when position('|' || v_topico || '/' || tg_table_name || '|' in v_enviados) > 0;
		v_enviados := v_enviados || '|' || v_topico || '/' || tg_table_name || '|';
		perform realtime.send(jsonb_build_object('tabela', tg_table_name), 'mudou', v_topico, true);
	end loop;
	perform set_config('diplomacy.transmitidos', v_enviados, true);
	return null;
end $$;

revoke execute on function public.transmitir() from public, anon, authenticated;

do $$
declare
	-- tabela => pares (canal, coluna)
	v_tabelas jsonb := '{
		"estado_sessao": ["comite", "comite_id"],
		"pedido_fala": ["comite", "comite_id"],
		"ponto_mocao": ["comite", "comite_id"],
		"presenca": ["comite", "comite_id"],
		"lista_oradores": ["comite", "comite_id"],
		"votacao": ["comite", "comite_id"],
		"voto": ["comite", "comite_id"],
		"documento": ["comite", "comite_id", "documento", "id"],
		"bloco_membro": ["comite", "comite_id"],
		"atualizacao_comite": ["comite", "comite_id"],
		"dpo": ["comite", "comite_id"],
		"carta": ["comite", "comite_id"],
		"noticia": ["comite", "comite_id", "evento", "$evento"],
		"aviso": ["evento", "evento_id"],
		"nota_crise": ["crise", "comite_id", "delegacao", "delegacao_id"],
		"clausula": ["documento", "documento_id"],
		"proposta_alteracao": ["documento", "documento_id"],
		"comentario": ["documento", "documento_id"],
		"assinatura": ["documento", "documento_id"],
		"rodada": ["documento", "documento_id"],
		"pedido_reabertura": ["documento", "$clausula"]
	}';
	v_tabela text;
	v_args jsonb;
begin
	for v_tabela, v_args in select * from jsonb_each(v_tabelas) loop
		execute format(
			'create trigger transmitir after insert or update or delete on public.%I for each row execute function public.transmitir(%s)',
			v_tabela,
			(select string_agg(quote_literal(a), ', ') from jsonb_array_elements_text(v_args) a)
		);
		-- Postgres Changes sai de cena: menos trabalho para o banco.
		execute format('alter publication supabase_realtime drop table public.%I', v_tabela);
	end loop;
end $$;
