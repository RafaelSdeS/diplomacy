-- Passo 02: tabelas centrais, papéis e regras de acesso.
-- Regras de negócio ficam no banco; toda tabela tem RLS (o teste 00 confere).

create type public.papel as enum ('delegado', 'mesa', 'crise', 'press', 'secretaria');
create type public.situacao_delegacao as enum ('membro', 'observadora', 'suspensa');

create table public.evento (
	id uuid primary key default gen_random_uuid(),
	nome text not null,
	ano int not null,
	regras_padrao jsonb not null default '{}', -- passo 05
	unique (nome, ano)
);

create table public.comite (
	id uuid primary key default gen_random_uuid(),
	evento_id uuid not null references public.evento on delete cascade,
	sigla text not null,
	nome text not null,
	nome_oficial text not null, -- linha do comitê nas resoluções
	idioma text not null default 'pt' check (idioma in ('pt', 'en')),
	crise_ligada boolean not null default false,
	tecnologia_restrita boolean not null default false,
	regras jsonb not null default '{}', -- ajustes do comitê (passo 05)
	unique (evento_id, sigla),
	unique (id, evento_id) -- alvo da chave composta em participacao
);

create table public.delegacao (
	id uuid primary key default gen_random_uuid(),
	comite_id uuid not null references public.comite on delete cascade,
	nome text not null, -- "Alemanha"
	nome_oficial text not null, -- "Federal Republic of Germany"
	situacao public.situacao_delegacao not null default 'membro',
	bandeira text, -- código do flag-icons ou caminho no Storage
	unique (comite_id, nome),
	unique (id, comite_id) -- alvo da chave composta em participacao
);

create table public.pessoa (
	id uuid primary key references auth.users on delete cascade,
	nome text not null
);

-- Uma delegação pode ter um ou mais delegados: basta mais de uma participação apontando para ela.
create table public.participacao (
	id uuid primary key default gen_random_uuid(),
	pessoa_id uuid not null references public.pessoa on delete cascade,
	evento_id uuid not null references public.evento on delete cascade,
	papel public.papel not null,
	comite_id uuid,
	delegacao_id uuid,
	-- O comitê é do mesmo evento, e a delegação é do mesmo comitê.
	foreign key (comite_id, evento_id) references public.comite (id, evento_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade,
	-- Delegado sempre tem delegação; só a secretaria vale para o evento todo, sem comitê.
	check (papel <> 'delegado' or delegacao_id is not null),
	check (papel <> 'secretaria' or comite_id is null),
	check (papel = 'secretaria' or comite_id is not null),
	unique nulls not distinct (pessoa_id, evento_id, papel, comite_id)
);

create index on public.comite (evento_id);
create index on public.delegacao (comite_id);
create index on public.participacao (pessoa_id);
create index on public.participacao (comite_id);

-- Funções auxiliares das regras de acesso. São security definer para ler
-- participacao sem cair na RLS dela mesma (o que daria recursão).

create function public.eh_participante(p_evento uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.participacao
		where pessoa_id = auth.uid() and evento_id = p_evento
	);
$$;

create function public.eh_secretaria(p_evento uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.participacao
		where pessoa_id = auth.uid() and evento_id = p_evento and papel = 'secretaria'
	);
$$;

create function public.evento_do_comite(p_comite uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
	select evento_id from public.comite where id = p_comite;
$$;

-- A pessoa logada tem um destes papéis no comitê? A secretaria vale para todos
-- os comitês do evento dela.
create function public.tem_papel(p_comite uuid, p_papeis public.papel[])
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.participacao pa
		where pa.pessoa_id = auth.uid()
			and pa.papel = any (p_papeis)
			and (
				pa.comite_id = p_comite
				or (pa.papel = 'secretaria' and pa.evento_id = public.evento_do_comite(p_comite))
			)
	);
$$;

create function public.minha_delegacao(p_comite uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
	select delegacao_id from public.participacao
	where pessoa_id = auth.uid() and comite_id = p_comite and papel = 'delegado'
	limit 1;
$$;

-- A pessoa logada vê o nome de p_pessoa? Sim se as duas estão no mesmo comitê,
-- ou se a pessoa logada é da secretaria de um evento de que p_pessoa participa.
create function public.pode_ver_pessoa(p_pessoa uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1
		from public.participacao eu
		join public.participacao outra on outra.pessoa_id = p_pessoa
		where eu.pessoa_id = auth.uid()
			and (
				eu.comite_id = outra.comite_id
				or (eu.papel = 'secretaria' and eu.evento_id = outra.evento_id)
			)
	);
$$;

revoke execute on function
	public.eh_participante(uuid),
	public.eh_secretaria(uuid),
	public.evento_do_comite(uuid),
	public.tem_papel(uuid, public.papel[]),
	public.minha_delegacao(uuid),
	public.pode_ver_pessoa(uuid)
from public, anon;

grant execute on function
	public.eh_participante(uuid),
	public.eh_secretaria(uuid),
	public.evento_do_comite(uuid),
	public.tem_papel(uuid, public.papel[]),
	public.minha_delegacao(uuid),
	public.pode_ver_pessoa(uuid)
to authenticated;

-- Regras de acesso. Sem regra, nada é liberado; usuários anônimos não veem nada.

alter table public.evento enable row level security;
alter table public.comite enable row level security;
alter table public.delegacao enable row level security;
alter table public.pessoa enable row level security;
alter table public.participacao enable row level security;

create policy "participantes veem o evento"
	on public.evento for select to authenticated
	using (public.eh_participante(id));

create policy "participantes veem os comitês do evento"
	on public.comite for select to authenticated
	using (public.eh_participante(evento_id));

create policy "participantes veem as delegações do evento"
	on public.delegacao for select to authenticated
	using (public.eh_participante(public.evento_do_comite(comite_id)));

create policy "cada um se vê e vê quem está no mesmo comitê"
	on public.pessoa for select to authenticated
	using (id = auth.uid() or public.pode_ver_pessoa(id));

create policy "cada um vê a própria participação; mesa e secretaria veem as do comitê"
	on public.participacao for select to authenticated
	using (
		pessoa_id = auth.uid()
		or public.eh_secretaria(evento_id)
		or (comite_id is not null and public.tem_papel(comite_id, '{mesa}'))
	);

create policy "só a secretaria cria participações"
	on public.participacao for insert to authenticated
	with check (public.eh_secretaria(evento_id));

create policy "só a secretaria altera participações"
	on public.participacao for update to authenticated
	using (public.eh_secretaria(evento_id))
	with check (public.eh_secretaria(evento_id));

create policy "só a secretaria remove participações"
	on public.participacao for delete to authenticated
	using (public.eh_secretaria(evento_id));
