-- Passo 30: debate rápido. Ao fim de cada fala, "Há pontos ou moções?" por alguns
-- segundos (regra nova pausa_pontos_seg, padrão 10; 0 desliga); depois, as placas. A
-- presidência escolhe até 4 placas de uma vez, a lista curta que o telão mostra.

-- 1. A regra da pausa (substitui as do passo 17)

create or replace function public.regras_do_guia()
returns jsonb
language sql immutable set search_path = ''
as $$
	select '{
		"quorum_fracao": [1, 3],
		"informal_informal_max_min": 45,
		"aviso_fala_seg": 10,
		"pausa_pontos_seg": 10,
		"limite_notas_pendentes": 2,
		"votacao_substantiva": "maioria_simples",
		"membros_permanentes": [],
		"max_sessoes_presidencia": 2,
		"assinaturas_projeto_min": 5,
		"assinaturas_emenda": 3,
		"assinaturas_desconfianca_fracao": [1, 5],
		"reabrir_clausula_min_delegacoes": 3,
		"dpos_publicos": false,
		"mesa_le_bilhetes": false,
		"bilhetes_bloqueados": false,
		"press_revisao": false
	}'::jsonb;
$$;

create or replace function public.regras_validas(r jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
	select jsonb_typeof(r) = 'object' and not exists (
		select 1 from jsonb_each(r) as e(chave, valor)
		where not coalesce(case
			when chave in ('quorum_fracao', 'assinaturas_desconfianca_fracao')
				then valor::text ~ '^\[[1-9][0-9]*, [1-9][0-9]*\]$'
			when chave in ('informal_informal_max_min', 'aviso_fala_seg', 'pausa_pontos_seg', 'limite_notas_pendentes',
					'max_sessoes_presidencia', 'assinaturas_projeto_min', 'assinaturas_emenda',
					'reabrir_clausula_min_delegacoes')
				then valor::text ~ '^[0-9]+$'
			when chave in ('dpos_publicos', 'mesa_le_bilhetes', 'bilhetes_bloqueados', 'press_revisao')
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

-- 2. A pausa e a lista curta

alter table public.estado_sessao add column pausa_ate timestamptz;

create table public.proximo_orador (
	sessao_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid not null,
	ordem int not null check (ordem between 1 and 4),
	primary key (sessao_id, delegacao_id),
	foreign key (sessao_id, comite_id) references public.sessao (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);
create index on public.proximo_orador (comite_id);
alter table public.proximo_orador enable row level security;
create policy "quem está no comitê vê os próximos" on public.proximo_orador
	for select to authenticated using (public.participa_do_comite(comite_id));
create trigger transmitir after insert or update or delete on public.proximo_orador
	for each row execute function public.transmitir('comite', 'comite_id');

-- Dar a palavra (substitui a do passo 07): também cuida da pausa e da lista curta.
create or replace function public.dar_palavra(p_comite uuid, p_delegacao uuid, p_seg int default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia(p_comite);
	update public.estado_sessao set
		orador_delegacao_id = p_delegacao,
		tempo_fala_seg = coalesce(p_seg, tempo_fala_seg),
		cronometro_inicio = case when p_delegacao is null then null else now() end,
		cronometro_duracao_seg = case when p_delegacao is null then null else coalesce(p_seg, tempo_fala_seg) end,
		cronometro_pausado_restante_seg = null,
		atualizado_em = now()
	where comite_id = p_comite;
	-- Debate rápido (passo 30): ao encerrar uma fala no formal-informal, uma pausa para
	-- pontos e moções; ao dar a palavra, a pausa acaba e a delegação sai da lista curta.
	update public.estado_sessao set pausa_ate = case
		when p_delegacao is null and fase = 'debate' and forma = 'formal_informal'
			and coalesce((public.regras(p_comite) ->> 'pausa_pontos_seg')::int, 0) > 0
			then now() + make_interval(secs => (public.regras(p_comite) ->> 'pausa_pontos_seg')::int)
		end
	where comite_id = p_comite;
	delete from public.proximo_orador where comite_id = p_comite and delegacao_id = p_delegacao;
	update public.pedido_fala set situacao = 'atendido'
	where sessao_id = public.sessao_atual(p_comite) and delegacao_id = p_delegacao and situacao = 'aberto';
	update public.lista_oradores l set falou = true
	where l.comite_id = p_comite and l.delegacao_id = p_delegacao and not l.falou
		and (
			(l.ponto_mocao_id is null
				and (select fase from public.estado_sessao where comite_id = p_comite) = 'plenaria')
			or l.ponto_mocao_id in (
				select id from public.ponto_mocao where comite_id = p_comite and status = 'em_discussao')
		);
end $$;

create function public.encerrar_pausa(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia(p_comite);
	update public.estado_sessao set pausa_ate = null, atualizado_em = now() where comite_id = p_comite;
end $$;

-- A presidência escolhe os próximos (até 4, presentes), na ordem; substitui a lista.
create function public.definir_proximos(p_comite uuid, p_delegacoes uuid[])
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_sessao uuid := public.sessao_atual(p_comite);
begin
	perform public.exigir_presidencia(p_comite);
	if coalesce(array_length(p_delegacoes, 1), 0) > 4 then
		raise exception 'A lista curta tem no máximo 4 delegações.' using errcode = '22023';
	end if;
	if exists (
		select 1 from unnest(p_delegacoes) as d(id)
		where not exists (select 1 from public.presenca p where p.sessao_id = v_sessao and p.delegacao_id = d.id)
	) then
		raise exception 'Só delegações presentes entram na lista curta.' using errcode = '22023';
	end if;
	delete from public.proximo_orador where sessao_id = v_sessao;
	insert into public.proximo_orador (sessao_id, comite_id, delegacao_id, ordem)
	select v_sessao, p_comite, d.id, d.ordem from unnest(p_delegacoes) with ordinality as d(id, ordem);
	update public.estado_sessao set atualizado_em = now() where comite_id = p_comite;
end $$;

create function public.baixar_todas_placas(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia(p_comite);
	update public.pedido_fala set situacao = 'baixado'
	where sessao_id = public.sessao_atual(p_comite) and situacao = 'aberto';
end $$;

revoke execute on function
	public.encerrar_pausa(uuid), public.definir_proximos(uuid, uuid[]), public.baixar_todas_placas(uuid)
from public, anon;
grant execute on function
	public.encerrar_pausa(uuid), public.definir_proximos(uuid, uuid[]), public.baixar_todas_placas(uuid)
to authenticated;
