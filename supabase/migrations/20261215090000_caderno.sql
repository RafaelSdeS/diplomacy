-- Passo 34: o caderno da delegação. Notas da sessão, anotações sobre outras delegações
-- e rascunhos de fala, de todos os delegados da delegação. Cada anotação pode ser
-- compartilhada, só para leitura, com as delegações escolhidas (EUA e Israel, por
-- exemplo). A mesa nunca lê o caderno.

create table public.anotacao (
	id uuid primary key, -- gerado no aparelho: a caixa de saída reenvia sem duplicar
	comite_id uuid not null,
	delegacao_id uuid not null, -- a dona
	tipo text not null check (tipo in ('nota', 'sobre', 'fala')),
	sobre_delegacao_id uuid, -- no tipo 'sobre'
	topico int check (topico > 0),
	orador_delegacao_id uuid, -- quem falava quando a nota foi feita
	titulo text check (char_length(titulo) <= 120),
	texto text not null check (char_length(texto) between 1 and 4000),
	autor_id uuid references public.pessoa on delete set null,
	criado_em timestamptz not null default clock_timestamp(),
	atualizado_em timestamptz not null default clock_timestamp(),
	unique (id, comite_id),
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade,
	foreign key (sobre_delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade,
	foreign key (orador_delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete set null (orador_delegacao_id),
	check (tipo <> 'sobre' or sobre_delegacao_id is not null)
);
create index on public.anotacao (delegacao_id);

create table public.anotacao_compartilhada (
	anotacao_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid not null, -- quem recebe
	primary key (anotacao_id, delegacao_id),
	foreign key (anotacao_id, comite_id) references public.anotacao (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);
create index on public.anotacao_compartilhada (delegacao_id);

alter table public.anotacao enable row level security;
alter table public.anotacao_compartilhada enable row level security;

-- Conjuntos calculados uma vez por consulta (como em 20261207100000_mensagens_rapidas.sql),
-- em funções security definer: as duas regras se consultariam e entrariam em recursão.
create function public.anotacoes_compartilhadas_comigo()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
	select anotacao_id from public.anotacao_compartilhada where delegacao_id in (select public.minhas_delegacoes());
$$;
create function public.anotacoes_minhas()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
	select id from public.anotacao where delegacao_id in (select public.minhas_delegacoes());
$$;

create policy "caderno: a delegação dona e quem recebeu" on public.anotacao
	for select to authenticated using (
		delegacao_id in (select public.minhas_delegacoes())
		or id in (select public.anotacoes_compartilhadas_comigo())
	);
create policy "compartilhamentos: a dona e quem recebeu" on public.anotacao_compartilhada
	for select to authenticated using (
		delegacao_id in (select public.minhas_delegacoes())
		or anotacao_id in (select public.anotacoes_minhas())
	);

-- A anotação da delegação de quem chama (para escrever).
create function public.exigir_minha_anotacao(p_id uuid)
returns public.anotacao
language plpgsql stable security definer set search_path = ''
as $$
declare
	a public.anotacao := (select x from public.anotacao x where x.id = p_id);
begin
	if a.id is null or a.delegacao_id is distinct from public.minha_delegacao(a.comite_id) then
		raise exception 'Só a delegação dona mexe nesta anotação.' using errcode = '42501';
	end if;
	return a;
end $$;

-- Cria ou atualiza (o id vem do aparelho).
create function public.salvar_anotacao(
	p_id uuid, p_comite uuid, p_tipo text, p_texto text,
	p_titulo text default null, p_sobre uuid default null, p_topico int default null, p_orador uuid default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_minha uuid := public.minha_delegacao(p_comite);
begin
	if v_minha is null then
		raise exception 'Só delegados do comitê escrevem no caderno.' using errcode = '42501';
	end if;
	if exists (select 1 from public.anotacao where id = p_id) then
		perform public.exigir_minha_anotacao(p_id);
		update public.anotacao set
			texto = trim(p_texto), titulo = nullif(trim(p_titulo), ''), sobre_delegacao_id = p_sobre,
			atualizado_em = clock_timestamp()
		where id = p_id;
	else
		insert into public.anotacao (id, comite_id, delegacao_id, tipo, sobre_delegacao_id, topico, orador_delegacao_id, titulo, texto, autor_id)
		values (p_id, p_comite, v_minha, p_tipo, p_sobre, p_topico, p_orador, nullif(trim(p_titulo), ''), trim(p_texto), auth.uid());
	end if;
end $$;

create function public.apagar_anotacao(p_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_minha_anotacao(p_id);
	delete from public.anotacao where id = p_id;
end $$;

-- Substitui a lista de quem recebe a anotação: só delegações do comitê, nunca a dona.
create function public.compartilhar_anotacao(p_id uuid, p_delegacoes uuid[])
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	a public.anotacao := public.exigir_minha_anotacao(p_id);
begin
	if a.delegacao_id = any (p_delegacoes)
		or exists (
			select 1 from unnest(p_delegacoes) as d(id)
			where not exists (select 1 from public.delegacao x where x.id = d.id and x.comite_id = a.comite_id)
		) then
		raise exception 'Compartilhe com outras delegações do comitê.' using errcode = '22023';
	end if;
	delete from public.anotacao_compartilhada where anotacao_id = p_id;
	insert into public.anotacao_compartilhada (anotacao_id, comite_id, delegacao_id)
	select p_id, a.comite_id, d from unnest(p_delegacoes) as d on conflict do nothing;
end $$;

-- Ao vivo: os delegados da própria delegação e quem recebe.
create trigger transmitir after insert or update or delete on public.anotacao
	for each row execute function public.transmitir('delegacao', 'delegacao_id');
create trigger transmitir after insert or update or delete on public.anotacao_compartilhada
	for each row execute function public.transmitir('delegacao', 'delegacao_id');
-- Com tecnologia restrita, os delegados não escrevem durante a sessão.
create trigger bloquear_tecnologia_restrita before insert or update on public.anotacao
	for each row execute function public.bloquear_tecnologia_restrita();
create trigger bloquear_tecnologia_restrita before insert or update on public.anotacao_compartilhada
	for each row execute function public.bloquear_tecnologia_restrita();

-- LGPD: "meus dados" traz as anotações da pessoa, e o fim do evento apaga o caderno.
alter function public.meus_dados() rename to meus_dados_ate_o_passo_33;
revoke execute on function public.meus_dados_ate_o_passo_33() from public, anon, authenticated;
create function public.meus_dados()
returns jsonb
language sql stable security definer set search_path = ''
as $$
	select public.meus_dados_ate_o_passo_33() || jsonb_build_object('anotacoes', coalesce((
		select jsonb_agg(jsonb_build_object('tipo', tipo, 'titulo', titulo, 'texto', texto, 'criado_em', criado_em))
		from public.anotacao where autor_id = auth.uid()
	), '[]'));
$$;
revoke execute on function public.meus_dados() from public, anon;
grant execute on function public.meus_dados() to authenticated;

alter function public.apagar_dados_pessoais(uuid) rename to apagar_dados_pessoais_ate_o_passo_33;
revoke execute on function public.apagar_dados_pessoais_ate_o_passo_33(uuid) from public, anon, authenticated;
create function public.apagar_dados_pessoais(p_evento uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
begin
	-- A função de antes confere quem chama (secretaria); o caderno sai antes dela.
	delete from public.anotacao where comite_id in (select id from public.comite where evento_id = p_evento)
		and public.eh_secretaria(p_evento);
	return public.apagar_dados_pessoais_ate_o_passo_33(p_evento);
end $$;
revoke execute on function public.apagar_dados_pessoais(uuid) from public, anon;
grant execute on function public.apagar_dados_pessoais(uuid) to authenticated;

revoke execute on function public.exigir_minha_anotacao(uuid) from public, anon, authenticated;
revoke execute on function public.anotacoes_compartilhadas_comigo(), public.anotacoes_minhas() from public, anon;
grant execute on function public.anotacoes_compartilhadas_comigo(), public.anotacoes_minhas() to authenticated;
revoke execute on function
	public.salvar_anotacao(uuid, uuid, text, text, text, uuid, int, uuid), public.apagar_anotacao(uuid),
	public.compartilhar_anotacao(uuid, uuid[])
from public, anon;
grant execute on function
	public.salvar_anotacao(uuid, uuid, text, text, text, uuid, int, uuid), public.apagar_anotacao(uuid),
	public.compartilhar_anotacao(uuid, uuid[])
to authenticated;
