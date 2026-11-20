-- Passo 07: plenária de abertura, lista de oradores, moções votadas, votação com
-- resultado calculado pelo banco e agenda informal. Traz também os ajustes das
-- regras do UNOCT (docs/regras-de-procedimento.md) nos passos 05 e 06 e as
-- correções da revisão (search_path de agora() e auth.uid() avaliado uma vez).

-- 1. Regras (passo 05)

create or replace function public.regras_do_guia()
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
		"max_sessoes_presidencia": 2,
		"assinaturas_projeto_min": 5,
		"assinaturas_emenda": 3,
		"assinaturas_desconfianca_fracao": [1, 5],
		"reabrir_clausula_min_delegacoes": 3,
		"dpos_publicos": false,
		"mesa_le_bilhetes": false,
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
			when chave in ('informal_informal_max_min', 'aviso_fala_seg', 'limite_notas_pendentes',
					'max_sessoes_presidencia', 'assinaturas_projeto_min', 'assinaturas_emenda',
					'reabrir_clausula_min_delegacoes')
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

-- Quórum das votações substantivas: maioria simples das delegações previstas.
create function public.quorum_votacao(p_comite uuid)
returns int
language sql stable set search_path = ''
as $$
	select public.maioria_simples(count(*)::int)
	from public.delegacao where comite_id = p_comite and situacao <> 'suspensa';
$$;

-- 2. Correções da revisão

alter function public.agora() set search_path = '';

alter policy "cada um se vê e vê quem está no mesmo comitê" on public.pessoa
	using (id = (select auth.uid()) or public.pode_ver_pessoa(id));
alter policy "quem está no comitê vê as participações dele; a secretaria vê as do evento" on public.participacao
	using (
		pessoa_id = (select auth.uid())
		or public.eh_secretaria(evento_id)
		or (comite_id is not null and public.participa_do_comite(comite_id))
	);
alter policy "cada um edita o próprio perfil" on public.pessoa
	using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy "secretaria publica avisos; a mesa, só do próprio comitê" on public.aviso
	with check (
		autor_id = (select auth.uid())
		and (
			public.eh_secretaria(evento_id)
			or (comite_id is not null and public.tem_papel(comite_id, '{mesa}'))
		)
	);
alter policy "a secretaria e o autor removem avisos" on public.aviso
	using (public.eh_secretaria(evento_id) or autor_id = (select auth.uid()));

-- 3. Andamento do comitê: plenária de abertura, debate do tópico, fase de ação

create type public.fase_comite as enum ('plenaria', 'debate', 'acao', 'encerrado');

alter table public.estado_sessao
	add column fase public.fase_comite not null default 'plenaria',
	add column etapa_plenaria text not null default 'briefing'
		check (etapa_plenaria in ('briefing', 'discursos', 'topico')),
	add column topico_atual int check (topico_atual > 0),
	add column ordem_topicos int[],
	add column mesa_assumiu boolean not null default false; -- caso excepcional: o bureau preside

-- No UNOCT não há "sessão de votação": o bureau preside a fase de ação.
alter table public.sessao drop column de_votacao;

-- Cada delegação preside no máximo `max_sessoes_presidencia` sessões.
alter table public.rodizio_presidencia drop column vez_usada, add column vezes int not null default 0;

-- 4. Pontos e moções do UNOCT

alter table public.ponto_mocao
	drop constraint ponto_mocao_tipo_check,
	add constraint ponto_mocao_tipo_check check (tipo in (
		'ponto_ordem', 'ponto_duvida', 'privilegio_pessoal',
		'topico_no_topo', 'adiamento_debate', 'adiamento_sessao', 'informal_informal', 'voto_desconfianca',
		'divisao_questao', 'votacao_nominal'
	)),
	drop constraint ponto_mocao_status_check,
	add constraint ponto_mocao_status_check
		check (status in ('aberto', 'em_discussao', 'em_votacao', 'aceito', 'recusado')),
	add column topico int check (topico > 0),
	add column minutos int check (minutos between 1 and 120);

-- 5. Lista de oradores: discursos de abertura (todas as presentes) e listas
-- especiais de uma moção (até 2 a favor e 2 contra).

create table public.lista_oradores (
	id uuid primary key default gen_random_uuid(),
	comite_id uuid not null references public.comite on delete cascade,
	delegacao_id uuid not null,
	ponto_mocao_id uuid references public.ponto_mocao on delete cascade, -- nulo: discursos de abertura
	lado text check (lado in ('a_favor', 'contra')),
	ordem int not null,
	falou boolean not null default false,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade,
	unique nulls not distinct (comite_id, ponto_mocao_id, delegacao_id),
	check ((ponto_mocao_id is null) = (lado is null))
);

-- 6. Votação

create type public.escolha_voto as enum ('a_favor', 'contra', 'abstencao');

create table public.votacao (
	id uuid primary key default gen_random_uuid(),
	comite_id uuid not null,
	sessao_id uuid not null,
	ponto_mocao_id uuid references public.ponto_mocao on delete set null,
	objeto text not null check (char_length(objeto) between 1 and 200),
	tipo text not null check (tipo in ('procedimental', 'substantiva')),
	regra text not null check (regra in ('maioria_simples', 'dois_tercos')), -- CSNU e unanimidade no passo 16
	aberta boolean not null default true,
	-- Resultado, gravado ao encerrar.
	base int, a_favor int, contra int, abstencoes int, necessario int, aprovada boolean,
	criado_em timestamptz not null default clock_timestamp(), -- ordem certa mesmo na mesma transação
	encerrada_em timestamptz,
	unique (id, comite_id),
	foreign key (sessao_id, comite_id) references public.sessao (id, comite_id) on delete cascade
);
create unique index uma_votacao_aberta on public.votacao (comite_id) where aberta;

create table public.voto (
	votacao_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid not null,
	escolha public.escolha_voto not null,
	registrado_pela_mesa boolean not null default false, -- voto contado na placa
	criado_em timestamptz not null default now(),
	primary key (votacao_id, delegacao_id),
	foreign key (votacao_id, comite_id) references public.votacao (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);

-- 7. Agenda informal: tópico › subtópicos › pontos

create table public.proposta_agenda (
	id uuid primary key default gen_random_uuid(),
	comite_id uuid not null references public.comite on delete cascade,
	delegacao_id uuid, -- nula: sugestão da mesa
	topico int not null check (topico > 0),
	adotada boolean not null default false,
	criado_em timestamptz not null default now(),
	unique (id, comite_id),
	unique nulls not distinct (comite_id, topico, delegacao_id),
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);
create unique index uma_agenda_adotada on public.proposta_agenda (comite_id, topico) where adotada;

create table public.ponto_pauta (
	id uuid primary key default gen_random_uuid(),
	proposta_id uuid not null,
	comite_id uuid not null,
	pai_id uuid references public.ponto_pauta on delete cascade,
	texto text not null check (char_length(texto) between 1 and 300),
	ordem int not null,
	status text not null default 'pendente' check (status in ('pendente', 'em_debate', 'debatido')),
	foreign key (proposta_id, comite_id) references public.proposta_agenda (id, comite_id) on delete cascade
);

alter table public.lista_oradores enable row level security;
alter table public.votacao enable row level security;
alter table public.voto enable row level security;
alter table public.proposta_agenda enable row level security;
alter table public.ponto_pauta enable row level security;

create policy "quem está no comitê vê as listas de oradores" on public.lista_oradores
	for select to authenticated using (public.participa_do_comite(comite_id));
create policy "quem está no comitê vê as votações" on public.votacao
	for select to authenticated using (public.participa_do_comite(comite_id));
create policy "quem está no comitê vê os votos (as placas são públicas)" on public.voto
	for select to authenticated using (public.participa_do_comite(comite_id));
create policy "quem está no comitê vê as propostas de agenda" on public.proposta_agenda
	for select to authenticated using (public.participa_do_comite(comite_id));
create policy "quem está no comitê vê os pontos da agenda" on public.ponto_pauta
	for select to authenticated using (public.participa_do_comite(comite_id));

-- 8. Presidência (ajustes do passo 06)

-- O bureau preside a plenária, a fase de ação e os casos excepcionais; a delegação
-- da vez, só o debate.
create or replace function public.pode_presidir(p_comite uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select public.tem_papel(p_comite, '{mesa}') or exists (
		select 1 from public.estado_sessao e
		join public.sessao s on s.id = e.sessao_id
		where e.comite_id = p_comite
			and e.fase = 'debate'
			and not e.mesa_assumiu
			and s.presidencia_delegacao_id = public.minha_delegacao(p_comite)
	);
$$;

-- A próxima da lista que ainda pode presidir (primeiro quem presidiu menos).
create or replace function public.tomar_proxima_presidencia(p_comite uuid)
returns uuid
language sql security definer set search_path = ''
as $$
	update public.rodizio_presidencia r set vezes = r.vezes + 1
	from (
		select ordem from public.rodizio_presidencia
		where comite_id = p_comite
			and vezes < (public.regras(p_comite) ->> 'max_sessoes_presidencia')::int
		order by vezes, ordem
		limit 1
	) as proxima
	where r.comite_id = p_comite and r.ordem = proxima.ordem
	returning r.delegacao_id;
$$;

-- O sorteio inclui todas as delegações membros (observadoras não presidem).
drop function public.sortear_presidencia(uuid, uuid[]);
create function public.sortear_presidencia(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_mesa(p_comite);
	delete from public.rodizio_presidencia where comite_id = p_comite;
	insert into public.rodizio_presidencia (comite_id, ordem, delegacao_id)
	select p_comite, row_number() over (order by random()), id
	from public.delegacao
	where comite_id = p_comite and situacao = 'membro';
end $$;

-- Encerra a sessão aberta e abre a próxima. A delegação da vez só assume no
-- debate; na plenária e na fase de ação, preside o bureau.
drop function public.abrir_sessao(uuid, boolean);
create function public.abrir_sessao(p_comite uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_numero int;
	v_presidencia uuid;
	v_sessao uuid;
begin
	perform public.exigir_mesa(p_comite);
	update public.sessao set fim = now() where comite_id = p_comite and fim is null;
	update public.votacao set aberta = false where comite_id = p_comite and aberta;
	select coalesce(max(numero), 0) + 1 into v_numero from public.sessao where comite_id = p_comite;
	if (select fase from public.estado_sessao where comite_id = p_comite) = 'debate' then
		v_presidencia := public.tomar_proxima_presidencia(p_comite);
	end if;

	insert into public.sessao (comite_id, numero, presidencia_delegacao_id)
	values (p_comite, v_numero, v_presidencia)
	returning id into v_sessao;

	insert into public.estado_sessao as e (comite_id, sessao_id) values (p_comite, v_sessao)
	on conflict (comite_id) do update set
		sessao_id = excluded.sessao_id,
		forma = case when e.fase = 'plenaria'
			then 'formal_formal'::public.forma_debate else 'formal_informal' end,
		orador_delegacao_id = null,
		cronometro_inicio = null,
		cronometro_duracao_seg = null,
		cronometro_pausado_restante_seg = null,
		mesa_assumiu = false,
		atualizado_em = now();
	return v_sessao;
end $$;

create or replace function public.encerrar_sessao(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_mesa(p_comite);
	update public.sessao set fim = now() where comite_id = p_comite and fim is null;
	update public.votacao set aberta = false where comite_id = p_comite and aberta;
	update public.estado_sessao set
		sessao_id = null, orador_delegacao_id = null, cronometro_inicio = null,
		cronometro_duracao_seg = null, cronometro_pausado_restante_seg = null, atualizado_em = now()
	where comite_id = p_comite;
end $$;

create or replace function public.passar_presidencia(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia(p_comite);
	if (select fase from public.estado_sessao where comite_id = p_comite) <> 'debate' then
		raise exception 'Nesta fase, quem preside é a mesa.' using errcode = '42501';
	end if;
	update public.sessao set presidencia_delegacao_id = public.tomar_proxima_presidencia(p_comite)
	where id = public.sessao_atual(p_comite);
	update public.estado_sessao set atualizado_em = now() where comite_id = p_comite;
end $$;

-- Caso excepcional: a mesa assume (ou devolve) a presidência do debate.
create function public.assumir_presidencia(p_comite uuid, p_assumir boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_mesa(p_comite);
	update public.estado_sessao set mesa_assumiu = p_assumir, atualizado_em = now()
	where comite_id = p_comite;
end $$;

-- Muda a forma de debate sem checar quem chama (uso interno: mudar_forma e o
-- efeito da moção de informal-informal).
create function public.aplicar_forma(p_comite uuid, p_forma public.forma_debate, p_minutos int)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_limite int;
begin
	if p_minutos is not null and p_minutos < 1 then
		raise exception 'Os minutos precisam ser positivos.' using errcode = '22023';
	end if;
	if p_forma = 'informal_informal' then
		if p_minutos is null then
			raise exception 'Informe quantos minutos de informal-informal.' using errcode = '22023';
		end if;
		v_limite := (public.regras(p_comite) ->> 'informal_informal_max_min')::int;
		-- ponytail: os minutos contam quando o informal começa, mesmo que acabe antes.
		update public.sessao set informal_min_usados = informal_min_usados + p_minutos
		where id = public.sessao_atual(p_comite) and informal_min_usados + p_minutos <= v_limite;
		if not found then
			raise exception 'O informal-informal passaria de % minutos nesta sessão.', v_limite using errcode = '23514';
		end if;
	end if;
	update public.estado_sessao set
		forma = p_forma,
		orador_delegacao_id = null,
		cronometro_inicio = case when p_minutos is null then null else now() end,
		cronometro_duracao_seg = p_minutos * 60,
		cronometro_pausado_restante_seg = null,
		atualizado_em = now()
	where comite_id = p_comite;
end $$;

-- O formal-formal só existe na plenária de abertura, e nela a forma não muda.
create or replace function public.mudar_forma(p_comite uuid, p_forma public.forma_debate, p_minutos int default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia(p_comite);
	if (select fase from public.estado_sessao where comite_id = p_comite) = 'plenaria' then
		raise exception 'Na plenária de abertura, o debate é formal-formal.';
	end if;
	if p_forma = 'formal_formal' then
		raise exception 'O formal-formal só existe na plenária de abertura.';
	end if;
	perform public.aplicar_forma(p_comite, p_forma, p_minutos);
end $$;

-- Dar a palavra também marca quem falou nas listas de oradores em uso.
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

-- 9. Plenária de abertura (só o bureau)

create function public.avancar_plenaria(p_comite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_etapa text;
begin
	perform public.exigir_mesa(p_comite);
	select etapa_plenaria into v_etapa from public.estado_sessao
	where comite_id = p_comite and fase = 'plenaria' and sessao_id is not null;
	if v_etapa is null then
		raise exception 'A plenária de abertura acontece numa sessão aberta, antes do debate.';
	end if;

	if v_etapa = 'briefing' then
		if not exists (select 1 from public.presenca where sessao_id = public.sessao_atual(p_comite)) then
			raise exception 'Faça a chamada antes dos discursos de abertura.';
		end if;
		-- Todas as delegações presentes entram na lista, em ordem alfabética.
		insert into public.lista_oradores (comite_id, delegacao_id, ordem)
		select p_comite, d.id, row_number() over (order by d.nome)
		from public.delegacao d
		join public.presenca p on p.delegacao_id = d.id and p.sessao_id = public.sessao_atual(p_comite)
		where d.comite_id = p_comite
		on conflict do nothing;
		update public.estado_sessao set etapa_plenaria = 'discursos', forma = 'formal_formal',
			orador_delegacao_id = null, cronometro_inicio = null, cronometro_duracao_seg = null,
			cronometro_pausado_restante_seg = null, atualizado_em = now()
		where comite_id = p_comite;
	elsif v_etapa = 'discursos' then
		update public.estado_sessao set etapa_plenaria = 'topico',
			orador_delegacao_id = null, cronometro_inicio = null, cronometro_duracao_seg = null,
			cronometro_pausado_restante_seg = null, atualizado_em = now()
		where comite_id = p_comite;
	else
		raise exception 'A plenária termina com a votação da moção do tópico no topo.';
	end if;
end $$;

-- 10. Pontos e moções (substitui enviar_ponto do passo 06)

drop function public.enviar_ponto(uuid, text, text);
create function public.enviar_ponto(
	p_comite uuid, p_tipo text, p_detalhe text default null, p_topico int default null, p_minutos int default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.exigir_delegacao(p_comite);
	v_estado public.estado_sessao;
	v_topicos int;
begin
	select * into v_estado from public.estado_sessao where comite_id = p_comite;
	if p_tipo = 'ponto_ordem' and v_estado.orador_delegacao_id is not null
		and v_estado.orador_delegacao_id <> v_delegacao then
		raise exception 'O ponto de ordem não interrompe o discurso de outra delegação.';
	end if;
	if p_tipo = 'topico_no_topo' then
		if v_estado.fase <> 'plenaria' or v_estado.etapa_plenaria <> 'topico' then
			raise exception 'A moção do tópico no topo vem no fim da plenária de abertura.';
		end if;
		select coalesce(array_length(topicos, 1), 0) into v_topicos from public.comite where id = p_comite;
		if p_topico is null or p_topico < 1 or p_topico > v_topicos then
			raise exception 'Escolha um dos tópicos do comitê.' using errcode = '22023';
		end if;
	elsif p_tipo = 'adiamento_sessao' then
		if v_estado.fase not in ('plenaria', 'debate') then
			raise exception 'Esta moção não está em ordem agora.';
		end if;
	elsif p_tipo in ('adiamento_debate', 'informal_informal', 'voto_desconfianca') then
		if v_estado.fase <> 'debate' then
			raise exception 'Esta moção só está em ordem durante o debate de um tópico.';
		end if;
		if p_tipo = 'informal_informal' and (p_minutos is null or p_minutos < 1) then
			raise exception 'Informe quantos minutos de informal-informal.' using errcode = '22023';
		end if;
	elsif p_tipo in ('divisao_questao', 'votacao_nominal') then
		raise exception 'Esta moção só está em ordem na votação de um projeto de resolução.';
	end if;

	insert into public.ponto_mocao (sessao_id, comite_id, delegacao_id, tipo, detalhe, topico, minutos)
	values (
		public.sessao_atual(p_comite), p_comite, v_delegacao, p_tipo, nullif(trim(p_detalhe), ''),
		case when p_tipo = 'topico_no_topo' then p_topico end,
		case when p_tipo = 'informal_informal' then p_minutos end
	);
end $$;

-- Lista especial: até 2 discursos a favor e 2 contra.
create function public.abrir_lista_especial(p_ponto uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_ponto public.ponto_mocao;
begin
	select * into v_ponto from public.ponto_mocao where id = p_ponto;
	perform public.exigir_presidencia(v_ponto.comite_id);
	if v_ponto.tipo not in ('topico_no_topo', 'adiamento_debate', 'divisao_questao') then
		raise exception 'Esta moção não tem lista especial.';
	end if;
	if v_ponto.status <> 'aberto' then
		raise exception 'Esta moção já foi tratada.';
	end if;
	update public.ponto_mocao set status = 'em_discussao' where id = p_ponto;
end $$;

create function public.inscrever_lista(p_ponto uuid, p_lado text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_ponto public.ponto_mocao;
	v_delegacao uuid;
begin
	-- A trava na moção põe as inscrições em fila: nunca passa de 2 por lado.
	select * into v_ponto from public.ponto_mocao where id = p_ponto for update;
	v_delegacao := public.exigir_delegacao(v_ponto.comite_id);
	if v_ponto.status <> 'em_discussao' then
		raise exception 'A lista especial desta moção não está aberta.';
	end if;
	if (select count(*) from public.lista_oradores where ponto_mocao_id = p_ponto and lado = p_lado) >= 2 then
		raise exception 'A lista já tem 2 discursos deste lado.';
	end if;
	insert into public.lista_oradores (comite_id, delegacao_id, ponto_mocao_id, lado, ordem)
	values (
		v_ponto.comite_id, v_delegacao, p_ponto, p_lado,
		(select coalesce(max(ordem), 0) + 1 from public.lista_oradores where ponto_mocao_id = p_ponto)
	);
exception when unique_violation then
	raise exception 'Sua delegação já está nesta lista.' using errcode = '23505';
end $$;

-- 11. Votação

-- Quem pode votar nesta votação, e como. Devolve o comitê. Uso interno.
create function public.validar_voto(p_votacao uuid, p_delegacao uuid, p_escolha public.escolha_voto)
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
	v public.votacao;
	v_situacao text;
	v_presenca public.situacao_presenca;
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
	select situacao into v_presenca from public.presenca where sessao_id = v.sessao_id and delegacao_id = p_delegacao;
	if v_presenca is null then
		raise exception 'Só as delegações presentes na chamada votam.';
	end if;
	if p_escolha = 'abstencao' and v.tipo = 'procedimental' then
		raise exception 'Questão procedimental não aceita abstenção.';
	end if;
	if p_escolha = 'abstencao' and v_presenca = 'presente_e_votando' then
		raise exception 'Delegação presente e votando não se abstém.';
	end if;
	return v.comite_id;
end $$;

create function public.votar(p_votacao uuid, p_escolha public.escolha_voto)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_comite uuid := (select comite_id from public.votacao where id = p_votacao);
	v_delegacao uuid := public.minha_delegacao(v_comite);
begin
	if v_delegacao is null then
		raise exception 'Só delegados do comitê votam.' using errcode = '42501';
	end if;
	perform public.validar_voto(p_votacao, v_delegacao, p_escolha);
	insert into public.voto (votacao_id, comite_id, delegacao_id, escolha)
	values (p_votacao, v_comite, v_delegacao, p_escolha);
exception when unique_violation then
	raise exception 'Sua delegação já votou.' using errcode = '23505';
end $$;

-- Votos contados nas placas, registrados pela mesa (ela também corrige).
create function public.registrar_voto(p_votacao uuid, p_delegacao uuid, p_escolha public.escolha_voto)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_comite uuid := (select comite_id from public.votacao where id = p_votacao);
begin
	perform public.exigir_mesa(v_comite);
	perform public.validar_voto(p_votacao, p_delegacao, p_escolha);
	insert into public.voto (votacao_id, comite_id, delegacao_id, escolha, registrado_pela_mesa)
	values (p_votacao, v_comite, p_delegacao, p_escolha, true)
	on conflict (votacao_id, delegacao_id) do update set escolha = excluded.escolha, registrado_pela_mesa = true;
end $$;

-- A base é o número de delegações presentes que votam nesse tipo de questão
-- (nas substantivas, só as membros). Maioria simples: o primeiro inteiro acima da
-- metade da base; dois terços arredondados para cima. Empate reprova.
create function public.resultado(p_votacao uuid)
returns table (a_favor int, contra int, abstencoes int, base int, necessario int, aprovada boolean)
language sql stable set search_path = ''
as $$
	with v as (
		select * from public.votacao where id = p_votacao
	), presentes as (
		select count(*)::int as n
		from v
		join public.presenca p on p.sessao_id = v.sessao_id
		join public.delegacao d on d.id = p.delegacao_id
		where d.situacao <> 'suspensa' and (v.tipo = 'procedimental' or d.situacao = 'membro')
	), contagem as (
		select
			count(*) filter (where escolha = 'a_favor')::int as af,
			count(*) filter (where escolha = 'contra')::int as co,
			count(*) filter (where escolha = 'abstencao')::int as ab
		from public.voto where votacao_id = p_votacao
	), exigido as (
		select case v.regra
			when 'dois_tercos' then public.dois_tercos(presentes.n)
			else public.maioria_simples(presentes.n)
		end as n
		from v, presentes
	)
	select contagem.af, contagem.co, contagem.ab, presentes.n, exigido.n, contagem.af >= exigido.n
	from contagem, presentes, exigido;
$$;

-- Abre a votação de uma moção, com a regra que ela pede.
create function public.abrir_votacao(p_ponto uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_ponto public.ponto_mocao;
	v_votacao uuid;
	v_limite int;
begin
	select * into v_ponto from public.ponto_mocao where id = p_ponto for update;
	perform public.exigir_presidencia(v_ponto.comite_id);
	if v_ponto.status not in ('aberto', 'em_discussao') then
		raise exception 'Esta moção já foi tratada.';
	end if;
	if v_ponto.tipo in ('ponto_ordem', 'ponto_duvida', 'privilegio_pessoal') then
		raise exception 'Pontos não são votados.';
	end if;
	if v_ponto.tipo = 'informal_informal' then
		v_limite := (public.regras(v_ponto.comite_id) ->> 'informal_informal_max_min')::int;
		if (select informal_min_usados from public.sessao where id = v_ponto.sessao_id) + v_ponto.minutos > v_limite then
			raise exception 'O informal-informal passaria de % minutos nesta sessão.', v_limite using errcode = '23514';
		end if;
	end if;

	insert into public.votacao (comite_id, sessao_id, ponto_mocao_id, objeto, tipo, regra)
	values (
		v_ponto.comite_id, v_ponto.sessao_id, p_ponto,
		case v_ponto.tipo
			when 'topico_no_topo' then 'Tópico ' || v_ponto.topico || ' no topo da agenda'
			when 'adiamento_debate' then 'Adiamento do debate'
			when 'adiamento_sessao' then 'Adiamento da sessão'
			when 'informal_informal' then 'Informal-informal de ' || v_ponto.minutos || ' minutos'
			when 'voto_desconfianca' then 'Voto de desconfiança'
			else v_ponto.tipo
		end,
		'procedimental',
		case when v_ponto.tipo = 'adiamento_debate' then 'dois_tercos' else 'maioria_simples' end
	)
	returning id into v_votacao;
	update public.ponto_mocao set status = 'em_votacao' where id = p_ponto;
	return v_votacao;
exception when unique_violation then
	raise exception 'Já há uma votação aberta neste comitê.' using errcode = '23505';
end $$;

-- Votação sem moção (por exemplo, a agenda informal). A substantiva exige o
-- quórum de votação: maioria simples das previstas presente.
create function public.abrir_votacao_livre(p_comite uuid, p_objeto text, p_tipo text default 'procedimental')
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_votacao uuid;
begin
	perform public.exigir_presidencia(p_comite);
	if p_tipo = 'substantiva' and (
		select count(*) from public.presenca p
		join public.delegacao d on d.id = p.delegacao_id
		where p.sessao_id = public.sessao_atual(p_comite) and d.situacao = 'membro'
	) < public.quorum_votacao(p_comite) then
		raise exception 'Sem quórum para votação substantiva: são precisas % delegações presentes.',
			public.quorum_votacao(p_comite);
	end if;
	insert into public.votacao (comite_id, sessao_id, objeto, tipo, regra)
	values (p_comite, public.sessao_atual(p_comite), trim(p_objeto), p_tipo, 'maioria_simples')
	returning id into v_votacao;
	return v_votacao;
exception when unique_violation then
	raise exception 'Já há uma votação aberta neste comitê.' using errcode = '23505';
end $$;

-- Encerra a votação, grava o resultado e aplica o efeito da moção.
create function public.encerrar_votacao(p_votacao uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v public.votacao;
	r record;
	v_ponto public.ponto_mocao;
	v_topicos int;
	v_ordem int[];
begin
	select * into v from public.votacao where id = p_votacao for update;
	if v.id is null or not v.aberta then
		raise exception 'Esta votação não está aberta.';
	end if;
	perform public.exigir_presidencia(v.comite_id);
	select * into r from public.resultado(p_votacao);
	update public.votacao set
		aberta = false, encerrada_em = now(), base = r.base, a_favor = r.a_favor, contra = r.contra,
		abstencoes = r.abstencoes, necessario = r.necessario, aprovada = r.aprovada
	where id = p_votacao;

	if v.ponto_mocao_id is not null then
		select * into v_ponto from public.ponto_mocao where id = v.ponto_mocao_id;
		update public.ponto_mocao set status = case when r.aprovada then 'aceito' else 'recusado' end
		where id = v_ponto.id;

		if v_ponto.tipo = 'topico_no_topo' then
			-- Aprovada, o tópico escolhido vem primeiro; rejeitada, entra o outro.
			select coalesce(array_length(topicos, 1), 0) into v_topicos from public.comite where id = v.comite_id;
			v_ordem := array(select t from generate_series(1, v_topicos) t where t <> v_ponto.topico order by t);
			v_ordem := case when r.aprovada then v_ponto.topico || v_ordem else v_ordem || v_ponto.topico end;
			update public.estado_sessao set
				fase = 'debate', ordem_topicos = v_ordem, topico_atual = v_ordem[1], forma = 'formal_informal',
				orador_delegacao_id = null, cronometro_inicio = null, cronometro_duracao_seg = null,
				cronometro_pausado_restante_seg = null
			where comite_id = v.comite_id;
			-- Terminada a plenária, a delegação da vez assume a presidência.
			update public.sessao set presidencia_delegacao_id = public.tomar_proxima_presidencia(v.comite_id)
			where id = v.sessao_id and presidencia_delegacao_id is null and fim is null;
		elsif r.aprovada and v_ponto.tipo = 'adiamento_debate' then
			update public.estado_sessao set
				topico_atual = ordem_topicos[array_position(ordem_topicos, topico_atual) % array_length(ordem_topicos, 1) + 1],
				orador_delegacao_id = null, cronometro_inicio = null, cronometro_duracao_seg = null,
				cronometro_pausado_restante_seg = null
			where comite_id = v.comite_id;
		elsif r.aprovada and v_ponto.tipo = 'adiamento_sessao' then
			update public.sessao set fim = now() where id = v.sessao_id;
			update public.estado_sessao set
				sessao_id = null, orador_delegacao_id = null, cronometro_inicio = null,
				cronometro_duracao_seg = null, cronometro_pausado_restante_seg = null
			where comite_id = v.comite_id;
		elsif r.aprovada and v_ponto.tipo = 'informal_informal' then
			perform public.aplicar_forma(v.comite_id, 'informal_informal', v_ponto.minutos);
		elsif r.aprovada and v_ponto.tipo = 'voto_desconfianca' then
			-- ponytail: as assinaturas de 1/5 das previstas entram no passo 16.
			update public.sessao set presidencia_delegacao_id = public.tomar_proxima_presidencia(v.comite_id)
			where id = v.sessao_id;
		end if;
	end if;
	update public.estado_sessao set atualizado_em = now() where comite_id = v.comite_id;
end $$;

-- 12. Agenda informal

-- Grava (ou troca) a proposta da delegação, ou a da mesa, para um tópico. Os itens
-- vêm em ordem, cada um com o nível (0 subtópico, 1 ponto, 2 subponto).
create function public.salvar_proposta_agenda(p_comite uuid, p_topico int, p_itens jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.minha_delegacao(p_comite);
	v_proposta uuid;
	v_pais uuid[] := '{}'; -- o último item de cada nível acima do atual
	v_item jsonb;
	v_nivel int;
	v_id uuid;
	v_ordem int := 0;
	v_topicos int;
begin
	if v_delegacao is null and not public.tem_papel(p_comite, '{mesa}') then
		raise exception 'Só as delegações e a mesa propõem agenda.' using errcode = '42501';
	end if;
	select coalesce(array_length(topicos, 1), 0) into v_topicos from public.comite where id = p_comite;
	if p_topico is null or p_topico < 1 or p_topico > v_topicos then
		raise exception 'Escolha um dos tópicos do comitê.' using errcode = '22023';
	end if;
	if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) not between 1 and 60 then
		raise exception 'A agenda precisa ter de 1 a 60 itens.' using errcode = '22023';
	end if;
	if exists (
		select 1 from public.proposta_agenda
		where comite_id = p_comite and topico = p_topico and delegacao_id is not distinct from v_delegacao and adotada
	) then
		raise exception 'A agenda adotada não muda mais.';
	end if;

	delete from public.proposta_agenda
	where comite_id = p_comite and topico = p_topico and delegacao_id is not distinct from v_delegacao;
	insert into public.proposta_agenda (comite_id, delegacao_id, topico)
	values (p_comite, v_delegacao, p_topico)
	returning id into v_proposta;

	for v_item in select * from jsonb_array_elements(p_itens) loop
		-- Um item fica no máximo um nível abaixo do anterior.
		v_nivel := least(greatest(coalesce((v_item ->> 'nivel')::int, 0), 0), 2, coalesce(array_length(v_pais, 1), 0));
		v_ordem := v_ordem + 1;
		insert into public.ponto_pauta (proposta_id, comite_id, pai_id, texto, ordem)
		values (v_proposta, p_comite, case when v_nivel > 0 then v_pais[v_nivel] end, trim(v_item ->> 'texto'), v_ordem)
		returning id into v_id;
		v_pais := v_pais[1:v_nivel] || v_id;
	end loop;
	return v_proposta;
end $$;

create function public.adotar_proposta(p_proposta uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_proposta public.proposta_agenda;
begin
	select * into v_proposta from public.proposta_agenda where id = p_proposta;
	perform public.exigir_mesa(v_proposta.comite_id);
	update public.proposta_agenda set adotada = false
	where comite_id = v_proposta.comite_id and topico = v_proposta.topico and adotada;
	update public.proposta_agenda set adotada = true where id = p_proposta;
end $$;

create function public.marcar_ponto_pauta(p_ponto uuid, p_status text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_comite uuid := (select comite_id from public.ponto_pauta where id = p_ponto);
begin
	perform public.exigir_presidencia(v_comite);
	if not exists (
		select 1 from public.ponto_pauta pp join public.proposta_agenda pa on pa.id = pp.proposta_id
		where pp.id = p_ponto and pa.adotada
	) then
		raise exception 'Só os pontos da agenda adotada têm andamento.';
	end if;
	update public.ponto_pauta set status = p_status where id = p_ponto;
end $$;

-- 13. Permissões

revoke execute on function
	public.aplicar_forma(uuid, public.forma_debate, int),
	public.validar_voto(uuid, uuid, public.escolha_voto)
from public, anon, authenticated;

revoke execute on function
	public.quorum_votacao(uuid), public.sortear_presidencia(uuid), public.abrir_sessao(uuid),
	public.assumir_presidencia(uuid, boolean), public.avancar_plenaria(uuid),
	public.enviar_ponto(uuid, text, text, int, int), public.abrir_lista_especial(uuid),
	public.inscrever_lista(uuid, text), public.votar(uuid, public.escolha_voto),
	public.registrar_voto(uuid, uuid, public.escolha_voto), public.resultado(uuid),
	public.abrir_votacao(uuid), public.abrir_votacao_livre(uuid, text, text), public.encerrar_votacao(uuid),
	public.salvar_proposta_agenda(uuid, int, jsonb), public.adotar_proposta(uuid),
	public.marcar_ponto_pauta(uuid, text)
from public, anon;

grant execute on function
	public.quorum_votacao(uuid), public.sortear_presidencia(uuid), public.abrir_sessao(uuid),
	public.assumir_presidencia(uuid, boolean), public.avancar_plenaria(uuid),
	public.enviar_ponto(uuid, text, text, int, int), public.abrir_lista_especial(uuid),
	public.inscrever_lista(uuid, text), public.votar(uuid, public.escolha_voto),
	public.registrar_voto(uuid, uuid, public.escolha_voto), public.resultado(uuid),
	public.abrir_votacao(uuid), public.abrir_votacao_livre(uuid, text, text), public.encerrar_votacao(uuid),
	public.salvar_proposta_agenda(uuid, int, jsonb), public.adotar_proposta(uuid),
	public.marcar_ponto_pauta(uuid, text)
to authenticated;

alter publication supabase_realtime add table public.lista_oradores, public.votacao, public.voto;
