-- Passo 44: segurança dos dados e das sessões.
--
-- 1. Revogar a participação encerra as sessões da conta e remove as inscrições de push.
--    O acesso aos dados já acaba na hora pela RLS (toda regra consulta participacao);
--    apagar as sessões impede renovar o login, e o JWT em uso vence em até 1 hora.
--    Uma pessoa com outras participações também sai: entra de novo com o que restou.
-- 2. As respostas sensíveis da API saem com "Cache-Control: private, no-store", por
--    garantia. Quem decide o cache offline é o service worker (src/lib/cache-dados.ts).

create function public.encerrar_sessoes_da_participacao()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	delete from public.assinatura_push where pessoa_id = old.pessoa_id;
	begin
		delete from auth.sessions where user_id = old.pessoa_id;
	exception when insufficient_privilege then
		-- A RLS já tirou o acesso; sem a permissão, só o login continua até vencer.
		raise warning 'sem permissão para encerrar as sessões de %', old.pessoa_id;
	end;
	return null;
end $$;
revoke execute on function public.encerrar_sessoes_da_participacao() from public, anon, authenticated;

create trigger encerrar_sessoes after delete on public.participacao
	for each row execute function public.encerrar_sessoes_da_participacao();

-- O PostgREST chama esta função antes de cada pedido (db_pre_request). Ela não pode
-- falhar: um erro aqui derrubaria a API inteira.
create function public.cabecalhos_do_pedido()
returns void
language plpgsql set search_path = ''
as $$
begin
	if coalesce(current_setting('request.path', true), '') ~ '^/(coletiva_pergunta_texto|nota_crise)$' then
		perform set_config('response.headers', '[{"Cache-Control": "private, no-store"}]', true);
	end if;
end $$;
grant execute on function public.cabecalhos_do_pedido() to anon, authenticated;

alter role authenticator set pgrst.db_pre_request = 'public.cabecalhos_do_pedido';
notify pgrst, 'reload config';
