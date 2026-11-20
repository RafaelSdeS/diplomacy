-- Passo 04: cronograma, avisos (com tempo real), perfil (minibiografia e foto)
-- e as informações da página do comitê.

alter table public.comite
	add column topicos text[] not null default '{}',
	add column guia_url text check (guia_url ~ '^https://');

alter table public.pessoa
	add column bio text check (char_length(bio) <= 500),
	add column foto_path text,
	add column avisos_vistos_em timestamptz;

-- A pessoa logada participa do comitê (com qualquer papel), ou é da secretaria
-- do evento dele.
create function public.participa_do_comite(p_comite uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select public.tem_papel(p_comite, enum_range(null::public.papel));
$$;

revoke execute on function public.participa_do_comite(uuid) from public, anon;
grant execute on function public.participa_do_comite(uuid) to authenticated;

-- Quem está no comitê vê quem é quem nele (mesa, delegações), como no evento real.
drop policy "cada um vê a própria participação; mesa e secretaria veem as do comitê" on public.participacao;
create policy "quem está no comitê vê as participações dele; a secretaria vê as do evento"
	on public.participacao for select to authenticated
	using (
		pessoa_id = auth.uid()
		or public.eh_secretaria(evento_id)
		or (comite_id is not null and public.participa_do_comite(comite_id))
	);

create policy "cada um edita o próprio perfil"
	on public.pessoa for update to authenticated
	using (id = auth.uid())
	with check (id = auth.uid());

-- Cronograma: geral (sem comitê) ou de um comitê.

create table public.cronograma_item (
	id uuid primary key default gen_random_uuid(),
	evento_id uuid not null references public.evento on delete cascade,
	comite_id uuid,
	titulo text not null check (char_length(titulo) between 1 and 120),
	local text check (char_length(local) <= 120),
	inicio timestamptz not null,
	fim timestamptz not null,
	check (fim > inicio),
	foreign key (comite_id, evento_id) references public.comite (id, evento_id) on delete cascade,
	unique nulls not distinct (evento_id, comite_id, inicio, titulo)
);

create index on public.cronograma_item (evento_id, inicio);

alter table public.cronograma_item enable row level security;

create policy "participantes veem o cronograma geral e o do próprio comitê"
	on public.cronograma_item for select to authenticated
	using (public.eh_participante(evento_id) and (comite_id is null or public.participa_do_comite(comite_id)));

create policy "só a secretaria cria itens do cronograma"
	on public.cronograma_item for insert to authenticated
	with check (public.eh_secretaria(evento_id));

create policy "só a secretaria altera itens do cronograma"
	on public.cronograma_item for update to authenticated
	using (public.eh_secretaria(evento_id))
	with check (public.eh_secretaria(evento_id));

create policy "só a secretaria remove itens do cronograma"
	on public.cronograma_item for delete to authenticated
	using (public.eh_secretaria(evento_id));

-- Avisos: gerais (só a secretaria) ou de um comitê (secretaria ou mesa dele).

create table public.aviso (
	id uuid primary key default gen_random_uuid(),
	evento_id uuid not null references public.evento on delete cascade,
	comite_id uuid,
	texto text not null check (char_length(texto) between 1 and 1000),
	autor_id uuid default auth.uid() references public.pessoa on delete set null,
	criado_em timestamptz not null default now(),
	foreign key (comite_id, evento_id) references public.comite (id, evento_id) on delete cascade
);

create index on public.aviso (evento_id, criado_em desc);

alter table public.aviso enable row level security;

create policy "participantes veem os avisos gerais e os do próprio comitê"
	on public.aviso for select to authenticated
	using (public.eh_participante(evento_id) and (comite_id is null or public.participa_do_comite(comite_id)));

create policy "secretaria publica avisos; a mesa, só do próprio comitê"
	on public.aviso for insert to authenticated
	with check (
		autor_id = auth.uid()
		and (
			public.eh_secretaria(evento_id)
			or (comite_id is not null and public.tem_papel(comite_id, '{mesa}'))
		)
	);

create policy "a secretaria e o autor removem avisos"
	on public.aviso for delete to authenticated
	using (public.eh_secretaria(evento_id) or autor_id = auth.uid());

-- Avisos chegam na hora (a RLS de leitura vale também no tempo real).
alter publication supabase_realtime add table public.aviso;

-- Marca os avisos como vistos com o relógio do servidor (o do aparelho pode
-- estar adiantado e esconder avisos novos).
create function public.marcar_avisos_vistos()
returns void
language sql security invoker set search_path = ''
as $$
	update public.pessoa set avisos_vistos_em = now() where id = auth.uid();
$$;

revoke execute on function public.marcar_avisos_vistos() from public, anon;
grant execute on function public.marcar_avisos_vistos() to authenticated;

-- Fotos de perfil: privadas, cada uma na pasta da própria pessoa
-- (<id da pessoa>/foto). Só quem pode ver a pessoa vê a foto dela.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 204800, array['image/webp', 'image/jpeg']);

create policy "fotos: quem pode ver a pessoa vê a foto"
	on storage.objects for select to authenticated
	using (
		bucket_id = 'fotos'
		and (
			(storage.foldername(name))[1] = auth.uid()::text
			or public.pode_ver_pessoa(((storage.foldername(name))[1])::uuid)
		)
	);

create policy "fotos: cada um envia a própria"
	on storage.objects for insert to authenticated
	with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos: cada um troca a própria"
	on storage.objects for update to authenticated
	using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text)
	with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos: cada um apaga a própria"
	on storage.objects for delete to authenticated
	using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
