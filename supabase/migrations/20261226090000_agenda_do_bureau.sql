-- Passo 60: a agenda parte do documento do bureau. A sugestão da mesa de cada tópico é a agenda
-- do bureau: cadastrada antes, oculta das delegações até ser liberada no dia do evento. A
-- primeira sessão do tópico a altera como um working paper: as delegações (e a mesa) propõem
-- alterações por item, todas debatem e marcam apoio, ressalva ou contra, e, havendo consenso,
-- a mesa (bureau) a inclui (decidido em 25/11/2026). A presidência da sessão não decide: ela
-- conduz a fala e participa como delegação. Incluída, a alteração muda o item no lugar (o
-- andamento e os working papers ficam).

alter table public.proposta_agenda add column liberada boolean not null default false;

drop policy "quem está no comitê vê as propostas de agenda" on public.proposta_agenda;
create policy "agenda: a do bureau só depois de liberada" on public.proposta_agenda
	for select to authenticated using (
		public.participa_do_comite(comite_id)
		and (delegacao_id is not null or liberada or adotada or public.tem_papel(comite_id, '{mesa,secretaria}'))
	);
drop policy "quem está no comitê vê os pontos da agenda" on public.ponto_pauta;
create policy "pontos: os da agenda que a pessoa vê" on public.ponto_pauta
	for select to authenticated using (exists (select 1 from public.proposta_agenda p where p.id = proposta_id));

create function public.liberar_agenda(p_proposta uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v public.proposta_agenda := (select x from public.proposta_agenda x where x.id = p_proposta);
begin
	perform public.exigir_mesa(v.comite_id);
	if v.delegacao_id is not null then
		raise exception 'Libera-se a agenda do bureau.' using errcode = '22023';
	end if;
	update public.proposta_agenda set liberada = true where id = p_proposta;
end $$;

create table public.alteracao_agenda (
	id uuid primary key default gen_random_uuid(),
	proposta_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid, -- nulo: a mesa
	acao text not null check (acao in ('alterar', 'incluir', 'retirar', 'mover')),
	ponto_id uuid references public.ponto_pauta on delete cascade, -- o item alterado, retirado ou movido
	depois_de uuid references public.ponto_pauta on delete set null, -- incluir ou mover: depois de qual (nulo: no começo ou no fim)
	dentro boolean not null default false, -- incluir: como subitem de depois_de
	texto text check (char_length(texto) between 1 and 300),
	motivo text check (char_length(motivo) <= 280),
	status text not null default 'aberta' check (status in ('aberta', 'aceita', 'recusada')),
	autor_id uuid references public.pessoa on delete set null,
	criado_em timestamptz not null default clock_timestamp(),
	unique (id, comite_id),
	foreign key (proposta_id, comite_id) references public.proposta_agenda (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade,
	check (case acao
		when 'alterar' then ponto_id is not null and texto is not null
		when 'retirar' then ponto_id is not null
		when 'mover' then ponto_id is not null
		else texto is not null end)
);
create table public.posicao_alteracao (
	alteracao_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid, -- nulo: a mesa
	posicao text not null check (posicao in ('apoio', 'ressalva', 'contra')),
	unique nulls not distinct (alteracao_id, delegacao_id),
	foreign key (alteracao_id, comite_id) references public.alteracao_agenda (id, comite_id) on delete cascade
);
alter table public.alteracao_agenda enable row level security;
alter table public.posicao_alteracao enable row level security;
create policy "alterações: de quem vê a agenda" on public.alteracao_agenda
	for select to authenticated using (exists (select 1 from public.proposta_agenda p where p.id = proposta_id));
create policy "posições: de quem vê a alteração" on public.posicao_alteracao
	for select to authenticated using (exists (select 1 from public.alteracao_agenda a where a.id = alteracao_id));
create trigger transmitir after insert or update or delete on public.alteracao_agenda
	for each row execute function public.transmitir('comite', 'comite_id');
create trigger transmitir after insert or update or delete on public.posicao_alteracao
	for each row execute function public.transmitir('comite', 'comite_id');

-- O item e os que estão dentro dele.
create function public.subarvore_pauta(p_ponto uuid)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
	with recursive arvore as (
		select id from public.ponto_pauta where id = p_ponto
		union all
		select p.id from public.ponto_pauta p join arvore a on p.pai_id = a.id
	)
	select id from arvore;
$$;

create function public.propor_alteracao_agenda(
	p_proposta uuid, p_acao text, p_ponto uuid default null, p_texto text default null,
	p_depois uuid default null, p_dentro boolean default false, p_motivo text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v public.proposta_agenda := (select x from public.proposta_agenda x where x.id = p_proposta);
	v_minha uuid := public.minha_delegacao(v.comite_id);
	v_id uuid;
begin
	if v_minha is null and not public.tem_papel(v.comite_id, '{mesa}') then
		raise exception 'Só as delegações e a mesa propõem alterações na agenda.' using errcode = '42501';
	end if;
	if v.delegacao_id is not null or not (v.liberada or v.adotada) then
		raise exception 'Altera-se a agenda do bureau, depois de liberada.' using errcode = '22023';
	end if;
	if exists (select 1 from unnest(array[p_ponto, p_depois]) as x(id)
		where x.id is not null and not exists (select 1 from public.ponto_pauta where id = x.id and proposta_id = p_proposta)) then
		raise exception 'Escolha itens desta agenda.' using errcode = '22023';
	end if;
	insert into public.alteracao_agenda (proposta_id, comite_id, delegacao_id, acao, ponto_id, depois_de, dentro, texto, motivo, autor_id)
	values (p_proposta, v.comite_id, v_minha, p_acao, p_ponto, p_depois, coalesce(p_dentro, false),
		nullif(trim(p_texto), ''), nullif(trim(p_motivo), ''), auth.uid())
	returning id into v_id;
	return v_id;
end $$;

create function public.marcar_posicao_alteracao(p_alteracao uuid, p_posicao text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	a public.alteracao_agenda := (select x from public.alteracao_agenda x where x.id = p_alteracao);
	v_minha uuid := public.minha_delegacao(a.comite_id);
begin
	if v_minha is null and not public.tem_papel(a.comite_id, '{mesa}') then
		raise exception 'Só as delegações e a mesa marcam posição.' using errcode = '42501';
	end if;
	if p_posicao is null then
		delete from public.posicao_alteracao where alteracao_id = p_alteracao and delegacao_id is not distinct from v_minha;
		return;
	end if;
	insert into public.posicao_alteracao (alteracao_id, comite_id, delegacao_id, posicao)
	values (p_alteracao, a.comite_id, v_minha, p_posicao)
	on conflict (alteracao_id, delegacao_id) do update set posicao = excluded.posicao;
end $$;

-- Havendo consenso na sala, a mesa inclui a alteração (ou a recusa). Incluída, muda a agenda no lugar.
create function public.responder_alteracao_agenda(p_alteracao uuid, p_aceitar boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	a public.alteracao_agenda := (select x from public.alteracao_agenda x where x.id = p_alteracao);
	v_pai uuid;
	v_fim int;
	v_bloco uuid[];
	v_resto uuid[];
	v_nova uuid[];
	v_pos int;
begin
	perform public.exigir_mesa(a.comite_id);
	if a.status <> 'aberta' then
		raise exception 'Esta alteração já foi respondida.' using errcode = '22023';
	end if;
	update public.alteracao_agenda set status = case when p_aceitar then 'aceita' else 'recusada' end where id = p_alteracao;
	if not p_aceitar then
		return;
	end if;
	if a.acao = 'alterar' then
		update public.ponto_pauta set texto = a.texto where id = a.ponto_id;
	elsif a.acao = 'retirar' then
		delete from public.ponto_pauta where id = a.ponto_id;
	elsif a.acao = 'incluir' then
		if a.depois_de is null then
			v_pai := null;
			v_fim := coalesce((select max(ordem) from public.ponto_pauta where proposta_id = a.proposta_id), 0);
		else
			v_pai := case when a.dentro then a.depois_de else (select pai_id from public.ponto_pauta where id = a.depois_de) end;
			v_fim := (select max(ordem) from public.ponto_pauta where id in (select public.subarvore_pauta(a.depois_de)));
		end if;
		update public.ponto_pauta set ordem = ordem + 1 where proposta_id = a.proposta_id and ordem > v_fim;
		insert into public.ponto_pauta (proposta_id, comite_id, pai_id, texto, ordem)
		values (a.proposta_id, a.comite_id, v_pai, a.texto, v_fim + 1);
	else -- mover: o item (com os de dentro) vai para depois de depois_de, no nível dele
		v_bloco := array(select id from public.ponto_pauta where id in (select public.subarvore_pauta(a.ponto_id)) order by ordem);
		if a.depois_de = any (v_bloco) then
			raise exception 'Um item não vai para dentro de si mesmo.' using errcode = '22023';
		end if;
		v_resto := array(select id from public.ponto_pauta where proposta_id = a.proposta_id and not (id = any (v_bloco)) order by ordem);
		if a.depois_de is null then
			v_nova := v_bloco || v_resto;
		else
			v_pos := (select max(array_position(v_resto, s)) from public.subarvore_pauta(a.depois_de) as s);
			v_nova := v_resto[1:v_pos] || v_bloco || v_resto[v_pos + 1:];
		end if;
		update public.ponto_pauta set ordem = array_position(v_nova, id) where proposta_id = a.proposta_id;
		update public.ponto_pauta set pai_id = (select pai_id from public.ponto_pauta where id = a.depois_de) where id = a.ponto_id;
	end if;
end $$;


revoke execute on function public.subarvore_pauta(uuid) from public, anon, authenticated;
revoke execute on function
	public.liberar_agenda(uuid), public.propor_alteracao_agenda(uuid, text, uuid, text, uuid, boolean, text),
	public.marcar_posicao_alteracao(uuid, text), public.responder_alteracao_agenda(uuid, boolean)
from public, anon;
grant execute on function
	public.liberar_agenda(uuid), public.propor_alteracao_agenda(uuid, text, uuid, text, uuid, boolean, text),
	public.marcar_posicao_alteracao(uuid, text), public.responder_alteracao_agenda(uuid, boolean)
to authenticated;
