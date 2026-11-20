-- Passo 17: comunicação completa. Diretoria da Press com papel próprio; mensagens
-- (bilhetes entre delegações, canal interno da mesa com a crise, conversa da
-- delegação com a mesa); entrevistas e coletiva da press.

-- 1. Diretoria da Press: papel do evento todo, como a secretaria (sem comitê)

alter table public.participacao drop constraint participacao_check1, drop constraint participacao_check2;
alter table public.participacao add constraint participacao_papel_do_evento
	check ((papel in ('secretaria', 'diretoria_press')) = (comite_id is null));
alter table public.convite drop constraint convite_check1, drop constraint convite_check2;
alter table public.convite add constraint convite_papel_do_evento
	check ((papel in ('secretaria', 'diretoria_press')) = (comite_id is null));

-- A Diretoria da Press (ou a secretaria) do evento.
create function public.eh_diretoria_press(p_evento uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.participacao
		where pessoa_id = auth.uid() and evento_id = p_evento and papel in ('diretoria_press', 'secretaria')
	);
$$;

create or replace function public.exigir_moderacao(p_noticia uuid)
returns public.noticia
language plpgsql stable security definer set search_path = ''
as $$
declare
	n public.noticia := (select x from public.noticia x where x.id = p_noticia);
begin
	if n.id is null or not public.eh_diretoria_press(public.evento_do_comite(n.comite_id)) then
		raise exception 'Só a Diretoria da Press modera as notícias.' using errcode = '42501';
	end if;
	return n;
end $$;

create or replace function public.pode_ver_noticia(p_noticia uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.noticia n
		where n.id = p_noticia and (
			(n.status = 'publicada' and public.eh_participante(public.evento_do_comite(n.comite_id)))
			or public.tem_papel(n.comite_id, '{press,secretaria}')
			or public.eh_diretoria_press(public.evento_do_comite(n.comite_id))
		)
	);
$$;

drop policy "só a secretaria lê as denúncias" on public.denuncia;
create policy "a Diretoria da Press lê as denúncias" on public.denuncia
	for select to authenticated
	using (public.eh_diretoria_press((select public.evento_do_comite(n.comite_id) from public.noticia n where n.id = noticia_id)));
drop policy "só a secretaria lê o registro" on public.registro;
create policy "a Diretoria da Press e a secretaria leem o registro" on public.registro
	for select to authenticated using (public.eh_diretoria_press(evento_id));

-- 2. Regras: a mesa pode bloquear os bilhetes (além de poder lê-los)

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
			when chave in ('informal_informal_max_min', 'aviso_fala_seg', 'limite_notas_pendentes',
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

-- 3. Mensagens

create table public.mensagem (
	id uuid primary key, -- gerado no aparelho: a caixa de saída reenvia sem duplicar
	comite_id uuid not null references public.comite on delete cascade,
	tipo text not null check (tipo in ('bilhete', 'interno', 'mesa')),
	de_delegacao_id uuid, -- bilhete: quem escreve; conversa com a mesa: a delegação que escreve
	para_delegacao_id uuid, -- bilhete: quem recebe; conversa com a mesa: a delegação a quem a mesa responde
	autor_id uuid references public.pessoa on delete set null,
	texto text not null check (char_length(texto) between 1 and 1000),
	oculta boolean not null default false,
	criado_em timestamptz not null default clock_timestamp(),
	-- Para o canal da crise: só o canal interno passa por lá.
	crise_comite_id uuid generated always as (case when tipo = 'interno' then comite_id end) stored,
	foreign key (de_delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade,
	foreign key (para_delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade,
	check (case tipo
		when 'bilhete' then de_delegacao_id is not null and para_delegacao_id is not null and de_delegacao_id <> para_delegacao_id
		when 'interno' then de_delegacao_id is null and para_delegacao_id is null
		else (de_delegacao_id is null) <> (para_delegacao_id is null)
	end)
);
create index on public.mensagem (comite_id, criado_em);

create table public.denuncia_mensagem (
	id uuid primary key default gen_random_uuid(),
	mensagem_id uuid not null references public.mensagem on delete cascade,
	comite_id uuid not null references public.comite on delete cascade,
	autor_id uuid references public.pessoa on delete set null,
	motivo text not null check (char_length(motivo) between 1 and 500),
	criado_em timestamptz not null default now()
);

-- Bilhete: as duas delegações; a mesa, se a regra deixa (ou se foi denunciado).
-- Canal interno: mesa e crise. Conversa com a mesa: a delegação e a mesa.
create function public.pode_ver_mensagem(p_mensagem uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.mensagem m
		where m.id = p_mensagem and case m.tipo
			when 'interno' then public.tem_papel(m.comite_id, '{mesa,crise}')
			when 'mesa' then public.tem_papel(m.comite_id, '{mesa}')
				or coalesce(m.de_delegacao_id, m.para_delegacao_id) = public.minha_delegacao(m.comite_id)
			else (not m.oculta and public.minha_delegacao(m.comite_id) in (m.de_delegacao_id, m.para_delegacao_id))
				or (public.tem_papel(m.comite_id, '{mesa}') and (
					(public.regras(m.comite_id) ->> 'mesa_le_bilhetes')::boolean
					or exists (select 1 from public.denuncia_mensagem d where d.mensagem_id = m.id)
				))
		end
	);
$$;

alter table public.mensagem enable row level security;
alter table public.denuncia_mensagem enable row level security;
create policy "mensagens: quem participa da conversa" on public.mensagem
	for select to authenticated using (public.pode_ver_mensagem(id));
create policy "a mesa lê as denúncias de bilhetes" on public.denuncia_mensagem
	for select to authenticated using (public.tem_papel(comite_id, '{mesa}'));

create function public.enviar_mensagem(p_id uuid, p_comite uuid, p_tipo text, p_texto text, p_para uuid default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_minha uuid := public.minha_delegacao(p_comite);
begin
	if exists (select 1 from public.mensagem where id = p_id) then
		return; -- reenvio da caixa de saída
	end if;
	if p_tipo = 'bilhete' then
		if v_minha is null then
			raise exception 'Só delegações trocam bilhetes.' using errcode = '42501';
		end if;
		if (public.regras(p_comite) ->> 'bilhetes_bloqueados')::boolean then
			raise exception 'A mesa bloqueou os bilhetes neste comitê.';
		end if;
		if p_para is null or p_para = v_minha
			or not exists (select 1 from public.delegacao where id = p_para and comite_id = p_comite) then
			raise exception 'Escolha outra delegação do comitê.' using errcode = '22023';
		end if;
		insert into public.mensagem (id, comite_id, tipo, de_delegacao_id, para_delegacao_id, autor_id, texto)
		values (p_id, p_comite, 'bilhete', v_minha, p_para, auth.uid(), trim(p_texto));
	elsif p_tipo = 'interno' then
		if not public.tem_papel(p_comite, '{mesa,crise}') then
			raise exception 'O canal interno é da mesa com a crise.' using errcode = '42501';
		end if;
		insert into public.mensagem (id, comite_id, tipo, autor_id, texto) values (p_id, p_comite, 'interno', auth.uid(), trim(p_texto));
	elsif p_tipo = 'mesa' then
		if public.tem_papel(p_comite, '{mesa}') then
			if not exists (select 1 from public.delegacao where id = p_para and comite_id = p_comite) then
				raise exception 'Escolha a delegação.' using errcode = '22023';
			end if;
			insert into public.mensagem (id, comite_id, tipo, para_delegacao_id, autor_id, texto)
			values (p_id, p_comite, 'mesa', p_para, auth.uid(), trim(p_texto));
		elsif v_minha is not null then
			insert into public.mensagem (id, comite_id, tipo, de_delegacao_id, autor_id, texto)
			values (p_id, p_comite, 'mesa', v_minha, auth.uid(), trim(p_texto));
		else
			raise exception 'Só delegações e a mesa usam esta conversa.' using errcode = '42501';
		end if;
	else
		raise exception 'Tipo de mensagem desconhecido.' using errcode = '22023';
	end if;
end $$;

-- Qualquer uma das delegações denuncia um bilhete; a mesa passa a lê-lo.
create function public.denunciar_mensagem(p_mensagem uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	m public.mensagem := (select x from public.mensagem x where x.id = p_mensagem);
begin
	if m.id is null or m.tipo <> 'bilhete' or not public.pode_ver_mensagem(p_mensagem) then
		raise exception 'Bilhete não encontrado.' using errcode = 'P0002';
	end if;
	if coalesce(trim(p_motivo), '') = '' then
		raise exception 'Diga o motivo da denúncia.' using errcode = '22023';
	end if;
	insert into public.denuncia_mensagem (mensagem_id, comite_id, autor_id, motivo) values (p_mensagem, m.comite_id, auth.uid(), trim(p_motivo));
end $$;

create function public.ocultar_mensagem(p_mensagem uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	m public.mensagem := (select x from public.mensagem x where x.id = p_mensagem);
begin
	perform public.exigir_mesa(m.comite_id);
	update public.mensagem set oculta = true where id = p_mensagem;
	insert into public.registro (evento_id, pessoa_id, acao, alvo, detalhe)
	values (public.evento_do_comite(m.comite_id), auth.uid(), 'ocultar_bilhete', p_mensagem, nullif(trim(p_motivo), ''));
end $$;

-- A regra dos bilhetes do comitê (a mesa decide; todos veem na tela de mensagens).
create function public.definir_bilhetes(p_comite uuid, p_mesa_le boolean, p_bloqueados boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_mesa(p_comite);
	update public.comite
	set regras = regras || jsonb_build_object('mesa_le_bilhetes', p_mesa_le, 'bilhetes_bloqueados', p_bloqueados)
	where id = p_comite;
	insert into public.registro (evento_id, pessoa_id, acao, alvo, detalhe)
	values (
		public.evento_do_comite(p_comite), auth.uid(), 'regra_bilhetes', p_comite,
		format('mesa lê: %s; bloqueados: %s', p_mesa_le, p_bloqueados)
	);
end $$;

-- Canal da mesa (o Broadcast do passo 13 ganha mais um tipo de canal).
create or replace function public.pode_ouvir(p_topico text)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
	v_tipo text := split_part(p_topico, ':', 1);
	v_id uuid;
begin
	if split_part(p_topico, ':', 3) <> '' then
		return false;
	end if;
	begin
		v_id := split_part(p_topico, ':', 2)::uuid;
	exception when invalid_text_representation then
		return false;
	end;
	return case v_tipo
		when 'comite' then public.participa_do_comite(v_id)
		when 'crise' then public.tem_papel(v_id, '{crise,secretaria}')
		when 'mesa' then public.tem_papel(v_id, '{mesa,secretaria}')
		when 'delegacao' then exists (
			select 1 from public.participacao where pessoa_id = auth.uid() and delegacao_id = v_id
		)
		when 'documento' then public.pode_ver_documento(v_id)
		when 'evento' then public.eh_participante(v_id)
		else false
	end;
end $$;

create trigger transmitir after insert or update or delete on public.mensagem
	for each row execute function public.transmitir(
		'delegacao', 'de_delegacao_id', 'delegacao', 'para_delegacao_id', 'mesa', 'comite_id', 'crise', 'crise_comite_id'
	);
create trigger bloquear_tecnologia_restrita before insert or update on public.mensagem
	for each row execute function public.bloquear_tecnologia_restrita();

-- 4. Entrevistas: o jornalista pede, a delegação aceita e escolhe o horário

create table public.entrevista (
	id uuid primary key default gen_random_uuid(),
	comite_id uuid not null,
	veiculo_id uuid not null,
	delegacao_id uuid not null,
	autor_id uuid references public.pessoa on delete set null,
	tema text not null check (char_length(tema) between 1 and 300),
	status text not null default 'pedida' check (status in ('pedida', 'aceita', 'recusada')),
	horario timestamptz,
	criada_em timestamptz not null default clock_timestamp(),
	foreign key (veiculo_id, comite_id) references public.veiculo (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade,
	check (status <> 'aceita' or horario is not null)
);
create index on public.entrevista (comite_id);

alter table public.entrevista enable row level security;
create policy "entrevista: a press, a mesa e a delegação" on public.entrevista
	for select to authenticated
	using (public.tem_papel(comite_id, '{press,mesa}') or delegacao_id = public.minha_delegacao(comite_id));

create function public.pedir_entrevista(p_delegacao uuid, p_tema text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	d public.delegacao := (select x from public.delegacao x where x.id = p_delegacao);
	v_veiculo uuid := (select id from public.veiculo where comite_id = d.comite_id);
	v_id uuid;
begin
	if d.id is null or v_veiculo is null or not public.tem_papel(d.comite_id, '{press}') then
		raise exception 'Só a press do comitê pede entrevistas.' using errcode = '42501';
	end if;
	insert into public.entrevista (comite_id, veiculo_id, delegacao_id, autor_id, tema)
	values (d.comite_id, v_veiculo, d.id, auth.uid(), trim(p_tema))
	returning id into v_id;
	return v_id;
end $$;

create function public.responder_entrevista(p_entrevista uuid, p_aceitar boolean, p_horario timestamptz default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	e public.entrevista := (select x from public.entrevista x where x.id = p_entrevista);
begin
	if e.id is null or e.delegacao_id is distinct from public.minha_delegacao(e.comite_id) then
		raise exception 'Só a delegação entrevistada responde.' using errcode = '42501';
	end if;
	if p_aceitar and p_horario is null then
		raise exception 'Escolha um horário para a entrevista.' using errcode = '22023';
	end if;
	update public.entrevista
	set status = case when p_aceitar then 'aceita' else 'recusada' end, horario = case when p_aceitar then p_horario end
	where id = p_entrevista;
end $$;

create trigger transmitir after insert or update or delete on public.entrevista
	for each row execute function public.transmitir('comite', 'comite_id');

-- 5. Coletiva conjunta: a Diretoria da Press abre; cada veículo leva até 4 perguntas,
-- uma por delegação do próprio comitê

create table public.coletiva (
	id uuid primary key default gen_random_uuid(),
	evento_id uuid not null references public.evento on delete cascade,
	titulo text not null check (char_length(titulo) between 1 and 200),
	aberta boolean not null default true,
	criada_em timestamptz not null default now()
);

create table public.coletiva_pergunta (
	id uuid primary key default gen_random_uuid(),
	coletiva_id uuid not null references public.coletiva on delete cascade,
	comite_id uuid not null,
	veiculo_id uuid not null,
	delegacao_id uuid not null,
	autor_id uuid references public.pessoa on delete set null,
	pergunta text not null check (char_length(pergunta) between 1 and 300),
	criada_em timestamptz not null default clock_timestamp(),
	unique (coletiva_id, veiculo_id, delegacao_id),
	foreign key (veiculo_id, comite_id) references public.veiculo (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);

alter table public.coletiva enable row level security;
alter table public.coletiva_pergunta enable row level security;
create policy "o evento vê as coletivas" on public.coletiva
	for select to authenticated using (public.eh_participante(evento_id));
create policy "o evento vê a pauta da coletiva" on public.coletiva_pergunta
	for select to authenticated using (public.eh_participante(public.evento_do_comite(comite_id)));

create function public.abrir_coletiva(p_evento uuid, p_titulo text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_id uuid;
begin
	if not public.eh_diretoria_press(p_evento) then
		raise exception 'Só a Diretoria da Press abre a coletiva.' using errcode = '42501';
	end if;
	update public.coletiva set aberta = false where evento_id = p_evento and aberta;
	insert into public.coletiva (evento_id, titulo) values (p_evento, trim(p_titulo)) returning id into v_id;
	return v_id;
end $$;

create function public.encerrar_coletiva(p_coletiva uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	if not public.eh_diretoria_press((select evento_id from public.coletiva where id = p_coletiva)) then
		raise exception 'Só a Diretoria da Press encerra a coletiva.' using errcode = '42501';
	end if;
	update public.coletiva set aberta = false where id = p_coletiva;
end $$;

create function public.perguntar_na_coletiva(p_coletiva uuid, p_delegacao uuid, p_pergunta text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	c public.coletiva := (select x from public.coletiva x where x.id = p_coletiva);
	d public.delegacao := (select x from public.delegacao x where x.id = p_delegacao);
	v_veiculo uuid := (select id from public.veiculo where comite_id = d.comite_id);
begin
	if c.id is null or not c.aberta then
		raise exception 'A coletiva não está aberta.';
	end if;
	if d.id is null or v_veiculo is null or public.evento_do_comite(d.comite_id) <> c.evento_id
		or not public.tem_papel(d.comite_id, '{press}') then
		raise exception 'Cada jornalista pergunta às delegações do próprio comitê.' using errcode = '42501';
	end if;
	if (select count(*) from public.coletiva_pergunta where coletiva_id = p_coletiva and veiculo_id = v_veiculo) >= 4 then
		raise exception 'Cada veículo leva até 4 perguntas à coletiva.';
	end if;
	insert into public.coletiva_pergunta (coletiva_id, comite_id, veiculo_id, delegacao_id, autor_id, pergunta)
	values (p_coletiva, d.comite_id, v_veiculo, d.id, auth.uid(), trim(p_pergunta));
exception when unique_violation then
	raise exception 'O seu veículo já tem uma pergunta para essa delegação.' using errcode = '23505';
end $$;

-- Permissões

revoke execute on function public.eh_diretoria_press(uuid), public.pode_ver_mensagem(uuid) from public, anon;
grant execute on function public.eh_diretoria_press(uuid), public.pode_ver_mensagem(uuid) to authenticated;
revoke execute on function
	public.enviar_mensagem(uuid, uuid, text, text, uuid), public.denunciar_mensagem(uuid, text),
	public.ocultar_mensagem(uuid, text), public.definir_bilhetes(uuid, boolean, boolean),
	public.pedir_entrevista(uuid, text), public.responder_entrevista(uuid, boolean, timestamptz),
	public.abrir_coletiva(uuid, text), public.encerrar_coletiva(uuid), public.perguntar_na_coletiva(uuid, uuid, text)
from public, anon;
grant execute on function
	public.enviar_mensagem(uuid, uuid, text, text, uuid), public.denunciar_mensagem(uuid, text),
	public.ocultar_mensagem(uuid, text), public.definir_bilhetes(uuid, boolean, boolean),
	public.pedir_entrevista(uuid, text), public.responder_entrevista(uuid, boolean, timestamptz),
	public.abrir_coletiva(uuid, text), public.encerrar_coletiva(uuid), public.perguntar_na_coletiva(uuid, uuid, text)
to authenticated;

-- A coletiva acompanha o evento ao vivo.
create trigger transmitir after insert or update or delete on public.coletiva
	for each row execute function public.transmitir('evento', 'evento_id');
create trigger transmitir after insert or update or delete on public.coletiva_pergunta
	for each row execute function public.transmitir('evento', '$evento');
