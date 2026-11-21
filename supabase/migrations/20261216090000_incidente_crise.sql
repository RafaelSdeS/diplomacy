-- Passo 35: crise com prazo. A equipe de crise lança um incidente tenso e inesperado
-- para um ou mais comitês, com prazo, que toma o telão e o celular de todos; pode
-- deixar delegações sem voz (sem placa, pontos, moções, votos e assinatura de moção)
-- por um tempo ou até o fim. A atingida continua mandando notas de crise e bilhetes:
-- a negociação acontece por aí. No fim, a equipe registra o desfecho, que vira uma
-- atualização de crise. A crise não pausa a sessão sozinha: a mesa decide.

create table public.incidente_crise (
	id uuid primary key default gen_random_uuid(),
	evento_id uuid not null references public.evento on delete cascade,
	titulo text not null check (char_length(titulo) between 1 and 120),
	texto text not null check (char_length(texto) between 1 and 3000),
	prazo timestamptz not null,
	desfecho text check (desfecho in ('resolvido', 'fracassou')),
	desfecho_texto text check (char_length(desfecho_texto) <= 3000),
	autor_id uuid references public.pessoa on delete set null,
	criado_em timestamptz not null default clock_timestamp(),
	encerrado_em timestamptz,
	unique (id, evento_id)
);

create table public.incidente_comite (
	incidente_id uuid not null,
	comite_id uuid not null references public.comite on delete cascade,
	evento_id uuid not null,
	encerrado_em timestamptz, -- repete o do incidente: o fim chega ao canal do comitê
	primary key (incidente_id, comite_id),
	foreign key (incidente_id, evento_id) references public.incidente_crise (id, evento_id) on delete cascade
);
create index on public.incidente_comite (comite_id);

create table public.incidente_efeito (
	incidente_id uuid not null references public.incidente_crise on delete cascade,
	comite_id uuid not null,
	delegacao_id uuid not null,
	texto text not null check (char_length(texto) between 1 and 200),
	ate timestamptz, -- nulo: até o fim do incidente
	primary key (incidente_id, delegacao_id),
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);
create index on public.incidente_efeito (delegacao_id);

alter table public.incidente_crise enable row level security;
alter table public.incidente_comite enable row level security;
alter table public.incidente_efeito enable row level security;
create policy "incidentes: quem participa de um comitê do incidente" on public.incidente_crise
	for select to authenticated using (
		exists (select 1 from public.incidente_comite c where c.incidente_id = incidente_crise.id and public.participa_do_comite(c.comite_id))
	);
create policy "comitês do incidente: quem está no comitê" on public.incidente_comite
	for select to authenticated using (public.participa_do_comite(comite_id));
create policy "efeitos do incidente: quem está no comitê" on public.incidente_efeito
	for select to authenticated using (public.participa_do_comite(comite_id));

-- A delegação está sem voz agora?
create function public.delegacao_sem_voz(p_delegacao uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.incidente_efeito e
		join public.incidente_crise i on i.id = e.incidente_id
		where e.delegacao_id = p_delegacao and i.encerrado_em is null and (e.ate is null or e.ate > now())
	);
$$;

-- p_efeitos: [{"delegacao_id": "...", "texto": "...", "minutos": 10}], minutos opcional.
create function public.lancar_incidente(p_comites uuid[], p_titulo text, p_texto text, p_minutos int, p_efeitos jsonb default '[]')
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_comite uuid;
	v_evento uuid;
	v_id uuid;
	v_efeito jsonb;
begin
	if coalesce(array_length(p_comites, 1), 0) = 0 then
		raise exception 'Escolha pelo menos um comitê.' using errcode = '22023';
	end if;
	if p_minutos is null or p_minutos not between 1 and 240 then
		raise exception 'O prazo vai de 1 a 240 minutos.' using errcode = '22023';
	end if;
	foreach v_comite in array p_comites loop
		perform public.exigir_crise(v_comite);
	end loop;
	select evento_id into v_evento from public.comite where id = p_comites[1];
	if exists (select 1 from public.comite where id = any (p_comites) and evento_id <> v_evento) then
		raise exception 'Uma crise vale para comitês de um mesmo evento.';
	end if;
	insert into public.incidente_crise (evento_id, titulo, texto, prazo, autor_id)
	values (v_evento, trim(p_titulo), trim(p_texto), now() + make_interval(mins => p_minutos), auth.uid())
	returning id into v_id;
	insert into public.incidente_comite (incidente_id, comite_id, evento_id)
	select v_id, c, v_evento from (select distinct unnest(p_comites) as c) as comites;
	for v_efeito in select * from jsonb_array_elements(coalesce(p_efeitos, '[]')) loop
		insert into public.incidente_efeito (incidente_id, comite_id, delegacao_id, texto, ate)
		select v_id, d.comite_id, d.id, trim(v_efeito ->> 'texto'),
			case when (v_efeito ->> 'minutos') is not null then now() + make_interval(mins => (v_efeito ->> 'minutos')::int) end
		from public.delegacao d
		where d.id = (v_efeito ->> 'delegacao_id')::uuid and d.comite_id = any (p_comites);
		if not found then
			raise exception 'A delegação atingida precisa ser de um dos comitês da crise.' using errcode = '22023';
		end if;
	end loop;
	return v_id;
end $$;

create function public.encerrar_incidente(p_id uuid, p_desfecho text, p_texto text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_comites uuid[] := array(select comite_id from public.incidente_comite where incidente_id = p_id);
	v_titulo text := (select titulo from public.incidente_crise where id = p_id);
begin
	if coalesce(array_length(v_comites, 1), 0) = 0 then
		raise exception 'Crise não encontrada.' using errcode = 'P0002';
	end if;
	perform public.exigir_crise(v_comites[1]);
	if p_desfecho not in ('resolvido', 'fracassou') then
		raise exception 'O desfecho é resolvido ou fracassou.' using errcode = '22023';
	end if;
	update public.incidente_crise set desfecho = p_desfecho, desfecho_texto = nullif(trim(p_texto), ''), encerrado_em = now()
	where id = p_id and encerrado_em is null;
	if not found then
		raise exception 'Esta crise já terminou.';
	end if;
	update public.incidente_comite set encerrado_em = now() where incidente_id = p_id;
	perform public.publicar_atualizacao(v_comites,
		v_titulo || ': ' || case when p_desfecho = 'resolvido' then 'resolvida' else 'fracassou' end
		|| coalesce('. ' || nullif(trim(p_texto), ''), '.'));
end $$;

-- A delegação de quem age na sessão (substitui a do passo 31): sem voz durante a crise.
create or replace function public.exigir_delegacao(p_comite uuid)
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.minha_delegacao(p_comite);
begin
	if v_delegacao is null and public.tem_papel(p_comite, '{mesa}') then
		v_delegacao := (select delegacao_id from public.representacao where comite_id = p_comite and pessoa_id = auth.uid());
	end if;
	if v_delegacao is null then
		raise exception 'Só delegados do comitê podem fazer isso.' using errcode = '42501';
	end if;
	if public.delegacao_sem_voz(v_delegacao) then
		raise exception 'Sua delegação está impedida pela crise.';
	end if;
	if public.sessao_atual(p_comite) is null then
		raise exception 'Nenhuma sessão aberta.' using errcode = 'P0002';
	end if;
	return v_delegacao;
end $$;

-- Quem pode votar (substitui a do passo 21): sem voz durante a crise.
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
	if public.delegacao_sem_voz(p_delegacao) then
		raise exception 'Sua delegação está impedida pela crise.';
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

create trigger transmitir after insert or update or delete on public.incidente_comite
	for each row execute function public.transmitir('comite', 'comite_id', 'crise', 'comite_id');
create trigger transmitir after insert or update or delete on public.incidente_efeito
	for each row execute function public.transmitir('comite', 'comite_id', 'crise', 'comite_id');

revoke execute on function public.delegacao_sem_voz(uuid) from public, anon;
grant execute on function public.delegacao_sem_voz(uuid) to authenticated;
revoke execute on function
	public.lancar_incidente(uuid[], text, text, int, jsonb), public.encerrar_incidente(uuid, text, text)
from public, anon;
grant execute on function
	public.lancar_incidente(uuid[], text, text, int, jsonb), public.encerrar_incidente(uuid, text, text)
to authenticated;

-- Notificação no lançamento: todos do comitê com notificação ligada recebem o título
-- (o briefing aparece no telão, então pode aparecer na tela bloqueada).
alter function public.push_a_enviar(text, uuid) rename to push_a_enviar_ate_o_passo_34;
create function public.push_a_enviar(p_tipo text, p_id uuid)
returns table (endpoint text, p256dh text, auth text, titulo text, corpo text, url text)
language plpgsql
security definer
set search_path = ''
as $$
declare
	v public.incidente_crise;
begin
	if p_tipo <> 'crise' then
		return query select * from public.push_a_enviar_ate_o_passo_34(p_tipo, p_id);
		return;
	end if;
	select * into v from public.incidente_crise where id = p_id;
	if not found then return; end if;
	insert into public.push_enviado (chave) values ('crise:' || p_id) on conflict do nothing;
	if not found then return; end if;
	return query
	select a.endpoint, a.p256dh, a.auth,
		case when public.idioma_da_pessoa(a.pessoa_id, v.evento_id) = 'en' then 'Crisis: ' else 'Crise: ' end || v.titulo,
		left(v.texto, 200),
		'/'
	from public.assinatura_push a
	where exists (
		select 1 from public.participacao pa join public.incidente_comite c on c.comite_id = pa.comite_id
		where c.incidente_id = p_id and pa.pessoa_id = a.pessoa_id
	);
end $$;
revoke execute on function public.push_a_enviar_ate_o_passo_34(text, uuid), public.push_a_enviar(text, uuid)
from public, anon, authenticated;
grant execute on function public.push_a_enviar(text, uuid) to service_role;
