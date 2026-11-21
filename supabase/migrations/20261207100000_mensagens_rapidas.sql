-- Passo 13 (planos de consulta, supabase/consultas/planos.sql): com o volume do
-- evento, abrir os bilhetes levava ~400 ms por delegado, porque a regra de acesso
-- chamava pode_ver_mensagem linha a linha (relendo a mensagem e os papéis da pessoa
-- a cada uma). Cada bilhete novo faz o comitê inteiro recarregar a tela.
--
-- A regra passa a usar conjuntos calculados uma vez por consulta: as delegações da
-- pessoa e os comitês em que ela é mesa ou crise. O resultado é o mesmo;
-- pode_ver_mensagem continua valendo para as funções que olham uma mensagem só.

create function public.minhas_delegacoes()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
	select delegacao_id from public.participacao
	where pessoa_id = auth.uid() and papel = 'delegado' and delegacao_id is not null;
$$;

create function public.meus_comites(p_papeis public.papel[])
returns setof uuid
language sql stable security definer set search_path = ''
as $$
	select comite_id from public.participacao
	where pessoa_id = auth.uid() and papel = any (p_papeis) and comite_id is not null;
$$;

-- Os comitês em que a pessoa é mesa e a regra deixa a mesa ler os bilhetes.
create function public.comites_onde_a_mesa_le_bilhetes()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
	select comite_id from public.participacao
	where pessoa_id = auth.uid() and papel = 'mesa' and comite_id is not null
		and (public.regras(comite_id) ->> 'mesa_le_bilhetes')::boolean;
$$;

-- As mensagens denunciadas nos comitês em que a pessoa é mesa.
create function public.bilhetes_denunciados_a_mim()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
	select d.mensagem_id from public.denuncia_mensagem d
	where d.comite_id in (select public.meus_comites('{mesa}'));
$$;

revoke execute on function
	public.minhas_delegacoes(), public.meus_comites(public.papel[]), public.comites_onde_a_mesa_le_bilhetes(),
	public.bilhetes_denunciados_a_mim()
from public, anon;
grant execute on function
	public.minhas_delegacoes(), public.meus_comites(public.papel[]), public.comites_onde_a_mesa_le_bilhetes(),
	public.bilhetes_denunciados_a_mim()
to authenticated;

drop policy "mensagens: quem participa da conversa" on public.mensagem;
create policy "mensagens: quem participa da conversa" on public.mensagem
	for select to authenticated using (
		case tipo
			when 'interno' then comite_id in (select public.meus_comites('{mesa,crise}'))
			when 'mesa' then comite_id in (select public.meus_comites('{mesa}'))
				or coalesce(de_delegacao_id, para_delegacao_id) in (select public.minhas_delegacoes())
			else (not oculta and (
					de_delegacao_id in (select public.minhas_delegacoes())
					or para_delegacao_id in (select public.minhas_delegacoes())
				))
				or comite_id in (select public.comites_onde_a_mesa_le_bilhetes())
				or id in (select public.bilhetes_denunciados_a_mim())
		end
	);
