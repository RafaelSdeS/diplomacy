-- Passo 11: press. Cada comitê tem um veículo; a press dele publica na hora, sem
-- aprovação (a menos que o comitê ligue regras.press_revisao). No piloto, a
-- Diretoria da Press usa uma conta da secretaria: ela aprova, oculta e lê denúncias.

create table public.veiculo (
	id uuid primary key default gen_random_uuid(),
	comite_id uuid not null unique references public.comite on delete cascade, -- uma press por comitê
	nome text not null check (char_length(nome) between 1 and 80),
	linha_editorial text check (char_length(linha_editorial) <= 500),
	unique (id, comite_id)
);

create table public.noticia (
	id uuid primary key, -- gerado no aparelho: reenviar não duplica
	veiculo_id uuid not null,
	comite_id uuid not null, -- do veículo; serve ao filtro do tempo real (telão e feed)
	autor_id uuid references public.pessoa on delete set null,
	tipo text not null check (tipo in ('nota_urgente', 'reportagem', 'entrevista', 'opiniao', 'charge')),
	titulo text not null check (char_length(titulo) between 1 and 200),
	linha_fina text check (char_length(linha_fina) <= 300),
	texto text not null check (char_length(texto) between 1 and 10000),
	imagem_path text,
	imagem_descricao text check (char_length(imagem_descricao) <= 300), -- texto alternativo
	data_simulacao date, -- comitês históricos
	status text not null default 'publicada' check (status in ('publicada', 'aguardando', 'oculta')),
	motivo_ocultacao text check (char_length(motivo_ocultacao) <= 500),
	publicada_em timestamptz not null default clock_timestamp(),
	foreign key (veiculo_id, comite_id) references public.veiculo (id, comite_id) on delete cascade
);
create index on public.noticia (comite_id, publicada_em desc);
create index on public.noticia (publicada_em desc);

create table public.citacao (
	noticia_id uuid not null references public.noticia on delete cascade,
	delegacao_id uuid not null references public.delegacao on delete cascade,
	primary key (noticia_id, delegacao_id)
);
create index on public.citacao (delegacao_id);

create table public.denuncia (
	id uuid primary key default gen_random_uuid(),
	noticia_id uuid not null references public.noticia on delete cascade,
	autor_id uuid references public.pessoa on delete set null,
	motivo text not null check (char_length(motivo) between 1 and 500),
	criado_em timestamptz not null default now(),
	unique (noticia_id, autor_id)
);

-- O que a moderação fez, e quem fez.
create table public.registro (
	id bigint generated always as identity primary key,
	evento_id uuid not null references public.evento on delete cascade,
	pessoa_id uuid references public.pessoa on delete set null,
	acao text not null,
	alvo uuid,
	detalhe text,
	em timestamptz not null default now()
);
create index on public.registro (evento_id, em desc);

-- Leitura

-- Publicada: todo o evento lê. Aguardando ou oculta: só a press do veículo e a
-- secretaria do evento.
create function public.pode_ver_noticia(p_noticia uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.noticia n
		where n.id = p_noticia and (
			(n.status = 'publicada' and public.eh_participante(public.evento_do_comite(n.comite_id)))
			or public.tem_papel(n.comite_id, '{press,secretaria}')
		)
	);
$$;

alter table public.veiculo enable row level security;
alter table public.noticia enable row level security;
alter table public.citacao enable row level security;
alter table public.denuncia enable row level security;
alter table public.registro enable row level security;

create policy "o evento vê os veículos" on public.veiculo
	for select to authenticated using (public.eh_participante(public.evento_do_comite(comite_id)));
create policy "publicadas para o evento; as outras para a press do veículo e a secretaria" on public.noticia
	for select to authenticated using (public.pode_ver_noticia(id));
create policy "citações de quem vê a notícia" on public.citacao
	for select to authenticated using (public.pode_ver_noticia(noticia_id));
create policy "só a secretaria lê as denúncias" on public.denuncia
	for select to authenticated
	using (public.eh_secretaria((select public.evento_do_comite(n.comite_id) from public.noticia n where n.id = noticia_id)));
create policy "só a secretaria lê o registro" on public.registro
	for select to authenticated using (public.eh_secretaria(evento_id));

-- Escrita

create function public.exigir_moderacao(p_noticia uuid)
returns public.noticia
language plpgsql stable security definer set search_path = ''
as $$
declare
	n public.noticia := (select x from public.noticia x where x.id = p_noticia);
begin
	if n.id is null or not public.eh_secretaria(public.evento_do_comite(n.comite_id)) then
		raise exception 'Só a Diretoria da Press modera as notícias.' using errcode = '42501';
	end if;
	return n;
end $$;

-- Publica no veículo. O id vem do aparelho: se a notícia já existe, devolve a
-- situação dela sem duplicar. Cada delegação citada (do mesmo evento) fica em citacao.
create function public.publicar_noticia(
	p_id uuid, p_veiculo uuid, p_tipo text, p_titulo text, p_texto text,
	p_linha_fina text default null, p_imagem_path text default null, p_imagem_descricao text default null,
	p_data_simulacao date default null, p_citadas uuid[] default '{}'
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
	v public.veiculo := (select x from public.veiculo x where x.id = p_veiculo);
	v_status text;
begin
	if v.id is null or not public.tem_papel(v.comite_id, '{press}') then
		raise exception 'Só a press do veículo publica nele.' using errcode = '42501';
	end if;
	select status into v_status from public.noticia where id = p_id;
	if found then
		return v_status;
	end if;
	if p_imagem_path is not null and p_imagem_path not like p_veiculo::text || '/%' then
		raise exception 'A imagem fica na pasta do veículo.' using errcode = '22023';
	end if;
	if p_imagem_path is not null and coalesce(trim(p_imagem_descricao), '') = '' then
		raise exception 'Descreva a imagem para quem usa leitor de tela.' using errcode = '22023';
	end if;
	v_status := case when (public.regras(v.comite_id) ->> 'press_revisao')::boolean then 'aguardando' else 'publicada' end;
	insert into public.noticia (
		id, veiculo_id, comite_id, autor_id, tipo, titulo, linha_fina, texto, imagem_path, imagem_descricao, data_simulacao, status
	)
	values (
		p_id, v.id, v.comite_id, auth.uid(), p_tipo, trim(p_titulo), nullif(trim(p_linha_fina), ''), trim(p_texto),
		p_imagem_path, trim(p_imagem_descricao), p_data_simulacao, v_status
	);
	insert into public.citacao (noticia_id, delegacao_id)
	select p_id, d.id
	from public.delegacao d
	join public.comite c on c.id = d.comite_id
	where d.id = any (p_citadas) and c.evento_id = public.evento_do_comite(v.comite_id);
	return v_status;
end $$;

-- Com a revisão ligada, a Diretoria aprova a notícia que aguarda.
create function public.aprovar_noticia(p_noticia uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	n public.noticia := public.exigir_moderacao(p_noticia);
begin
	if n.status <> 'aguardando' then
		raise exception 'A notícia não está aguardando revisão.';
	end if;
	update public.noticia set status = 'publicada', publicada_em = clock_timestamp() where id = p_noticia;
	insert into public.registro (evento_id, pessoa_id, acao, alvo)
	values (public.evento_do_comite(n.comite_id), auth.uid(), 'aprovar_noticia', p_noticia);
end $$;

create function public.ocultar_noticia(p_noticia uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	n public.noticia := public.exigir_moderacao(p_noticia);
begin
	if coalesce(trim(p_motivo), '') = '' then
		raise exception 'Diga por que a notícia foi ocultada.' using errcode = '22023';
	end if;
	update public.noticia set status = 'oculta', motivo_ocultacao = trim(p_motivo) where id = p_noticia;
	insert into public.registro (evento_id, pessoa_id, acao, alvo, detalhe)
	values (public.evento_do_comite(n.comite_id), auth.uid(), 'ocultar_noticia', p_noticia, trim(p_motivo));
end $$;

-- Qualquer um que lê a notícia pode denunciá-la (uma vez; denunciar de novo troca o motivo).
create function public.denunciar_noticia(p_noticia uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	if not public.pode_ver_noticia(p_noticia) then
		raise exception 'Notícia não encontrada.' using errcode = 'P0002';
	end if;
	if coalesce(trim(p_motivo), '') = '' then
		raise exception 'Diga o motivo da denúncia.' using errcode = '22023';
	end if;
	insert into public.denuncia (noticia_id, autor_id, motivo)
	values (p_noticia, auth.uid(), trim(p_motivo))
	on conflict (noticia_id, autor_id) do update set motivo = excluded.motivo, criado_em = now();
end $$;

revoke execute on function public.exigir_moderacao(uuid) from public, anon, authenticated;
revoke execute on function
	public.pode_ver_noticia(uuid),
	public.publicar_noticia(uuid, uuid, text, text, text, text, text, text, date, uuid[]),
	public.aprovar_noticia(uuid), public.ocultar_noticia(uuid, text), public.denunciar_noticia(uuid, text)
from public, anon;
grant execute on function
	public.pode_ver_noticia(uuid),
	public.publicar_noticia(uuid, uuid, text, text, text, text, text, text, date, uuid[]),
	public.aprovar_noticia(uuid), public.ocultar_noticia(uuid, text), public.denunciar_noticia(uuid, text)
to authenticated;

alter publication supabase_realtime add table public.noticia;

-- Imagens das matérias: reduzidas no aparelho (até 1280 px), na pasta do veículo
-- (<id do veículo>/<id da notícia>.webp). O evento vê; só a press do veículo envia.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('press', 'press', false, 1048576, array['image/webp', 'image/jpeg']);

create function public.veiculo_da_pasta(p_nome text)
returns public.veiculo
language sql stable security definer set search_path = ''
as $$
	select v from public.veiculo v where v.id::text = (storage.foldername(p_nome))[1];
$$;
revoke execute on function public.veiculo_da_pasta(text) from public, anon;
grant execute on function public.veiculo_da_pasta(text) to authenticated;

create policy "press: o evento vê as imagens"
	on storage.objects for select to authenticated
	using (bucket_id = 'press' and public.eh_participante(public.evento_do_comite((public.veiculo_da_pasta(name)).comite_id)));

create policy "press: a press do veículo envia"
	on storage.objects for insert to authenticated
	with check (bucket_id = 'press' and public.tem_papel((public.veiculo_da_pasta(name)).comite_id, '{press}'));

-- Reenviar (nova tentativa sem internet boa) sobrescreve a mesma imagem.
create policy "press: a press do veículo reenvia"
	on storage.objects for update to authenticated
	using (bucket_id = 'press' and public.tem_papel((public.veiculo_da_pasta(name)).comite_id, '{press}'))
	with check (bucket_id = 'press' and public.tem_papel((public.veiculo_da_pasta(name)).comite_id, '{press}'));
