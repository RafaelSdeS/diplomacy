-- Passo 05: regras de procedimento do Guia de Regras do UFRGSMUN como configuração.
--
-- Valem, nesta ordem (a última vence): os padrões do guia (regras_do_guia), o
-- padrão do evento (evento.regras_padrao) e os ajustes do comitê (comite.regras).

create function public.regras_do_guia()
returns jsonb
language sql immutable set search_path = ''
as $$
	select '{
		"quorum_fracao": [1, 3],
		"informal_informal_max_min": 45,
		"aviso_fala_seg": 10,
		"limite_notas_pendentes": 2,
		"votacao_substantiva": "maioria_simples",
		"membros_permanentes": [],
		"assinaturas_projeto_fracao": [1, 5],
		"assinaturas_emenda": 3,
		"reabrir_clausula_min_delegacoes": 3,
		"dpos_publicos": false,
		"mesa_le_bilhetes": false,
		"press_revisao": false
	}'::jsonb;
$$;

-- Só chaves conhecidas, cada uma com o tipo certo. O CASE garante a ordem de
-- avaliação (nada de converter um texto em número antes de checar o tipo).
create function public.regras_validas(r jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
	select jsonb_typeof(r) = 'object' and not exists (
		select 1 from jsonb_each(r) as e(chave, valor)
		where not coalesce(case
			when chave in ('quorum_fracao', 'assinaturas_projeto_fracao')
				then valor::text ~ '^\[[1-9][0-9]*, [1-9][0-9]*\]$'
			when chave in ('informal_informal_max_min', 'aviso_fala_seg', 'limite_notas_pendentes',
					'assinaturas_emenda', 'reabrir_clausula_min_delegacoes')
				then valor::text ~ '^[0-9]+$'
			when chave in ('dpos_publicos', 'mesa_le_bilhetes', 'press_revisao')
				then jsonb_typeof(valor) = 'boolean'
			when chave = 'votacao_substantiva'
				then valor::text in ('"maioria_simples"', '"csnu"', '"unanimidade"')
			when chave = 'membros_permanentes' then case
				when jsonb_typeof(valor) = 'array'
					then not exists (select 1 from jsonb_array_elements(valor) x where jsonb_typeof(x) <> 'string')
				else false
			end
			else false
		end, false)
	);
$$;

alter table public.evento add constraint regras_padrao_validas check (public.regras_validas(regras_padrao));
alter table public.comite add constraint regras_validas check (public.regras_validas(regras));

-- As regras que valem num comitê. Roda com as permissões de quem chama: quem não
-- vê o comitê recebe null.
create function public.regras(p_comite uuid)
returns jsonb
language sql stable set search_path = ''
as $$
	select public.regras_do_guia() || e.regras_padrao || c.regras
	from public.comite c
	join public.evento e on e.id = c.evento_id
	where c.id = p_comite;
$$;

-- Quórum: a fração das delegações previstas, arredondada para cima. Delegações
-- suspensas não são previstas na sala.
create function public.quorum(p_comite uuid)
returns int
language sql stable set search_path = ''
as $$
	select ceil(
		count(d.id) * (r -> 'quorum_fracao' ->> 0)::numeric / (r -> 'quorum_fracao' ->> 1)::numeric
	)::int
	from public.regras(p_comite) as r
	left join public.delegacao d on d.comite_id = p_comite and d.situacao <> 'suspensa'
	where r is not null
	group by r;
$$;

-- O primeiro número inteiro acima da metade da base.
create function public.maioria_simples(p_base int)
returns int
language sql immutable set search_path = ''
as $$
	select p_base / 2 + 1;
$$;

-- Dois terços da base, arredondados para cima (conta só com inteiros).
create function public.dois_tercos(p_base int)
returns int
language sql immutable set search_path = ''
as $$
	select (2 * p_base + 2) / 3;
$$;

revoke execute on function public.regras(uuid), public.quorum(uuid) from public, anon;
grant execute on function public.regras(uuid), public.quorum(uuid) to authenticated;

-- Só a secretaria altera o evento e os comitês dele (e, com isso, as regras).
create policy "só a secretaria altera o evento"
	on public.evento for update to authenticated
	using (public.eh_secretaria(id))
	with check (public.eh_secretaria(id));

create policy "só a secretaria altera os comitês do evento"
	on public.comite for update to authenticated
	using (public.eh_secretaria(evento_id))
	with check (public.eh_secretaria(evento_id));
