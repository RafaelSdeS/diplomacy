-- Passo 21: chamada, abertura, encerramento e chegada atrasada.
--
-- No UFRGSMUN, "presente" e "presente e votando" são a mesma coisa: a chamada tem
-- dois estados (a linha existe ou não) e a abstenção deixa de depender da chamada.
-- A delegação que chega no meio da sessão avisa, e a mesa confirma.

-- ---------------------------------------------------------------------------
-- Presença com um estado só

update public.presenca set situacao = 'presente' where situacao = 'presente_e_votando';
-- ponytail: o valor 'presente_e_votando' fica no enum; tirar valor de enum exige
-- recriar o tipo e todas as colunas que o usam.
alter table public.presenca
	add constraint presenca_so_presente check (situacao = 'presente'),
	add column marcada_em timestamptz not null default now(); -- a hora da chegada

-- Quem pode votar, e como (substitui o do passo 16), sem a regra de quem está
-- "presente e votando".
create or replace function public.validar_voto(p_votacao uuid, p_delegacao uuid, p_escolha public.escolha_voto)
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
	v public.votacao;
	v_situacao text;
begin
	select * into v from public.votacao where id = p_votacao;
	if v.id is null or not v.aberta then
		raise exception 'Esta votação não está aberta.';
	end if;
	select situacao::text into v_situacao from public.delegacao where id = p_delegacao and comite_id = v.comite_id;
	if v_situacao is null then
		raise exception 'Delegação de outro comitê.' using errcode = '42501';
	end if;
	if v_situacao = 'suspensa' then
		raise exception 'Delegação suspensa não vota.';
	end if;
	if v_situacao = 'observadora' and v.tipo = 'substantiva' then
		raise exception 'Delegação observadora não vota em questão substantiva.';
	end if;
	if not exists (select 1 from public.presenca where sessao_id = v.sessao_id and delegacao_id = p_delegacao) then
		raise exception 'Só as delegações presentes na chamada votam.';
	end if;
	if p_escolha = 'abstencao' and v.tipo = 'procedimental' then
		raise exception 'Questão procedimental não aceita abstenção.';
	end if;
	if p_delegacao = any (v.partes) and p_escolha <> 'abstencao' then
		raise exception 'Parte na disputa: a delegação é obrigada a se abster.';
	end if;
	if p_escolha = 'abstencao' and exists (select 1 from public.passe where votacao_id = p_votacao and delegacao_id = p_delegacao) then
		raise exception 'Quem passou a vez não pode se abster.';
	end if;
	return v.comite_id;
end $$;

-- ---------------------------------------------------------------------------
-- Chegada atrasada: a delegação avisa, a mesa confirma marcando a presença

create table public.aviso_chegada (
	sessao_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid not null,
	criado_em timestamptz not null default now(),
	primary key (sessao_id, delegacao_id),
	foreign key (sessao_id, comite_id) references public.sessao (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);
create index on public.aviso_chegada (comite_id);
alter table public.aviso_chegada enable row level security;
create policy "quem está no comitê vê as chegadas" on public.aviso_chegada
	for select to authenticated using (public.participa_do_comite(comite_id));

-- Avisar a chegada fica fora do bloqueio da tecnologia restrita: não é escrever
-- durante a sessão, é pedir para ser contada.
create function public.avisar_chegada(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.exigir_delegacao(p_comite);
	v_sessao uuid := public.sessao_atual(p_comite);
begin
	if exists (select 1 from public.presenca where sessao_id = v_sessao and delegacao_id = v_delegacao) then
		raise exception 'Sua delegação já está presente na chamada.';
	end if;
	insert into public.aviso_chegada (sessao_id, comite_id, delegacao_id)
	values (v_sessao, p_comite, v_delegacao)
	on conflict do nothing;
end $$;

-- Marcar a presença atende o aviso.
create function public.atender_aviso_chegada()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	delete from public.aviso_chegada where sessao_id = new.sessao_id and delegacao_id = new.delegacao_id;
	return null;
end $$;
create trigger atender_aviso_chegada after insert on public.presenca
	for each row execute function public.atender_aviso_chegada();

create trigger transmitir after insert or update or delete on public.aviso_chegada
	for each row execute function public.transmitir('comite', 'comite_id');

-- ---------------------------------------------------------------------------
-- Chamada rápida e resumo da sessão

create function public.marcar_todas_presentes(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_sessao uuid := public.sessao_atual(p_comite);
begin
	perform public.exigir_mesa(p_comite);
	if v_sessao is null then
		raise exception 'Nenhuma sessão aberta.' using errcode = 'P0002';
	end if;
	insert into public.presenca (sessao_id, comite_id, delegacao_id)
	select v_sessao, p_comite, d.id from public.delegacao d
	where d.comite_id = p_comite and d.situacao <> 'suspensa'
	on conflict do nothing;
end $$;

-- O resumo que a mesa vê ao encerrar a sessão. Roda com as permissões de quem
-- chama: quem não vê o comitê recebe null. Falas ficam de fora: o app ainda não as
-- registra.
create function public.resumo_sessao(p_sessao uuid)
returns jsonb
language sql stable set search_path = ''
as $$
	select jsonb_build_object(
		'numero', s.numero,
		'inicio', s.inicio,
		'fim', s.fim,
		'presentes', (select count(*) from public.presenca p where p.sessao_id = s.id),
		'pontos', (
			select coalesce(jsonb_object_agg(status, n), '{}') from (
				select status, count(*) as n from public.ponto_mocao where sessao_id = s.id group by status
			) x
		),
		'votacoes', coalesce((
			select jsonb_agg(jsonb_build_object('objeto', objeto, 'aprovada', aprovada) order by criado_em)
			from public.votacao where sessao_id = s.id and encerrada_em is not null
		), '[]')
	)
	from public.sessao s where s.id = p_sessao;
$$;

-- ---------------------------------------------------------------------------
-- Permissões

revoke execute on function public.atender_aviso_chegada() from public, anon, authenticated;
revoke execute on function
	public.avisar_chegada(uuid), public.marcar_todas_presentes(uuid), public.resumo_sessao(uuid)
from public, anon;
grant execute on function
	public.avisar_chegada(uuid), public.marcar_todas_presentes(uuid), public.resumo_sessao(uuid)
to authenticated;
