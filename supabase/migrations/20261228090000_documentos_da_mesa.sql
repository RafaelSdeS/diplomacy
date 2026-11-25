-- Passo 58: documentos da mesa para o comitê (um esclarecimento de regra, o roteiro do dia, o
-- guia revisado). A mesa escreve um rascunho, que só ela vê, e publica; o comitê lê a última
-- publicação, ao vivo, e vê o que mudou desde a anterior. Duas pessoas da mesa no mesmo
-- documento não editam ao mesmo tempo: salvar confere a versão do rascunho, e quem salvou
-- depois escolhe (decidido em 20/11/2026). Texto e PDF anexo, os dois (24/11/2026).

-- O que o comitê lê: a última publicação (versao 0 = nunca publicado, só a mesa vê).
create table public.documento_mesa (
	id uuid primary key default gen_random_uuid(),
	comite_id uuid not null references public.comite on delete cascade,
	titulo text not null check (char_length(titulo) between 1 and 200),
	corpo text not null default '' check (char_length(corpo) <= 50000),
	arquivo text, -- o PDF no bucket documentos-mesa: <comitê>/<documento>.pdf
	fixado boolean not null default false,
	versao int not null default 0,
	publicado_em timestamptz,
	criado_em timestamptz not null default now()
);
create index on public.documento_mesa (comite_id);

-- O rascunho da mesa: o texto em edição e a versão de cada salvamento.
create table public.documento_mesa_rascunho (
	documento_id uuid primary key references public.documento_mesa on delete cascade,
	comite_id uuid not null,
	titulo text not null check (char_length(titulo) between 1 and 200),
	corpo text not null default '' check (char_length(corpo) <= 50000),
	versao int not null default 1,
	atualizado_em timestamptz not null default now(),
	atualizado_por uuid references public.pessoa on delete set null
);

-- Cada publicação, para "Ver alterações" (só as publicações, não cada salvamento).
create table public.documento_mesa_versao (
	documento_id uuid not null references public.documento_mesa on delete cascade,
	comite_id uuid not null,
	numero int not null,
	titulo text not null,
	corpo text not null,
	publicado_em timestamptz not null default now(),
	primary key (documento_id, numero)
);

alter table public.documento_mesa enable row level security;
alter table public.documento_mesa_rascunho enable row level security;
alter table public.documento_mesa_versao enable row level security;
create policy "documentos da mesa: a mesa e a secretaria veem todos; o comitê, os publicados"
	on public.documento_mesa for select to authenticated
	using (public.tem_papel(comite_id, '{mesa,secretaria}') or (versao > 0 and public.participa_do_comite(comite_id)));
create policy "rascunhos da mesa: só a mesa e a secretaria"
	on public.documento_mesa_rascunho for select to authenticated
	using (public.tem_papel(comite_id, '{mesa,secretaria}'));
create policy "publicações da mesa: quem está no comitê"
	on public.documento_mesa_versao for select to authenticated
	using (public.participa_do_comite(comite_id) or public.tem_papel(comite_id, '{mesa,secretaria}'));
create policy "documentos da mesa: a mesa apaga"
	on public.documento_mesa for delete to authenticated
	using (public.tem_papel(comite_id, '{mesa}'));
create trigger transmitir after insert or update or delete on public.documento_mesa
	for each row execute function public.transmitir('comite', 'comite_id');
create trigger transmitir after insert or update or delete on public.documento_mesa_rascunho
	for each row execute function public.transmitir('mesa', 'comite_id');

create function public.criar_documento_mesa(p_comite uuid, p_titulo text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_id uuid;
begin
	perform public.exigir_mesa(p_comite);
	insert into public.documento_mesa (comite_id, titulo) values (p_comite, p_titulo) returning id into v_id;
	insert into public.documento_mesa_rascunho (documento_id, comite_id, titulo, atualizado_por) values (v_id, p_comite, p_titulo, auth.uid());
	return v_id;
end $$;

-- Salva o rascunho se ninguém salvou depois da versão que a pessoa tem; devolve a nova versão.
create function public.salvar_documento_mesa(p_documento uuid, p_titulo text, p_corpo text, p_versao int)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
	v_comite uuid := (select comite_id from public.documento_mesa where id = p_documento);
	v_versao int;
begin
	perform public.exigir_mesa(v_comite);
	update public.documento_mesa_rascunho
		set titulo = p_titulo, corpo = p_corpo, versao = versao + 1, atualizado_em = now(), atualizado_por = auth.uid()
		where documento_id = p_documento and versao = p_versao
		returning versao into v_versao;
	if v_versao is null then
		-- Não 40001: o PostgREST repete a transação nesse código.
		raise exception 'Outra pessoa da mesa salvou este documento antes.' using errcode = 'DM409';
	end if;
	return v_versao;
end $$;

-- Publica o rascunho: o comitê passa a ler este texto. Avisar manda um aviso ao comitê.
create function public.publicar_documento_mesa(p_documento uuid, p_avisar boolean default true)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	r public.documento_mesa_rascunho := (select x from public.documento_mesa_rascunho x where x.documento_id = p_documento);
	v_versao int;
begin
	perform public.exigir_mesa(r.comite_id);
	update public.documento_mesa
		set titulo = r.titulo, corpo = r.corpo, versao = versao + 1, publicado_em = now()
		where id = p_documento
		returning versao into v_versao;
	insert into public.documento_mesa_versao (documento_id, comite_id, numero, titulo, corpo)
		values (p_documento, r.comite_id, v_versao, r.titulo, r.corpo);
	if p_avisar then
		insert into public.aviso (evento_id, comite_id, texto) values (
			public.evento_do_comite(r.comite_id), r.comite_id,
			left(case when v_versao = 1 then 'A mesa publicou: ' else 'A mesa atualizou: ' end || r.titulo, 1000)
		);
	end if;
end $$;

-- Fixar no topo e anexar (ou tirar) o PDF valem na hora, sem publicar.
create function public.ajustar_documento_mesa(p_documento uuid, p_fixado boolean, p_arquivo text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_comite uuid := (select comite_id from public.documento_mesa where id = p_documento);
begin
	perform public.exigir_mesa(v_comite);
	if p_arquivo is not null and p_arquivo <> v_comite || '/' || p_documento || '.pdf' then
		raise exception 'O PDF fica na pasta do comitê, com o nome do documento.' using errcode = '22023';
	end if;
	update public.documento_mesa set fixado = p_fixado, arquivo = p_arquivo where id = p_documento;
end $$;

revoke execute on function public.criar_documento_mesa(uuid, text) from public, anon;
revoke execute on function public.salvar_documento_mesa(uuid, text, text, int) from public, anon;
revoke execute on function public.publicar_documento_mesa(uuid, boolean) from public, anon;
revoke execute on function public.ajustar_documento_mesa(uuid, boolean, text) from public, anon;
grant execute on function public.criar_documento_mesa(uuid, text) to authenticated;
grant execute on function public.salvar_documento_mesa(uuid, text, text, int) to authenticated;
grant execute on function public.publicar_documento_mesa(uuid, boolean) to authenticated;
grant execute on function public.ajustar_documento_mesa(uuid, boolean, text) to authenticated;

-- O PDF anexo: <comitê>/<documento>.pdf, até 10 MB. Quem está no comitê lê; a mesa envia.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos-mesa', 'documentos-mesa', false, 10485760, array['application/pdf']);

create policy "documentos-mesa: quem está no comitê lê"
	on storage.objects for select to authenticated
	using (
		bucket_id = 'documentos-mesa'
		and (public.participa_do_comite(((storage.foldername(name))[1])::uuid) or public.tem_papel(((storage.foldername(name))[1])::uuid, '{mesa,secretaria}'))
	);
create policy "documentos-mesa: a mesa envia"
	on storage.objects for insert to authenticated
	with check (bucket_id = 'documentos-mesa' and public.tem_papel(((storage.foldername(name))[1])::uuid, '{mesa}'));
create policy "documentos-mesa: a mesa troca"
	on storage.objects for update to authenticated
	using (bucket_id = 'documentos-mesa' and public.tem_papel(((storage.foldername(name))[1])::uuid, '{mesa}'))
	with check (bucket_id = 'documentos-mesa' and public.tem_papel(((storage.foldername(name))[1])::uuid, '{mesa}'));
create policy "documentos-mesa: a mesa apaga"
	on storage.objects for delete to authenticated
	using (bucket_id = 'documentos-mesa' and public.tem_papel(((storage.foldername(name))[1])::uuid, '{mesa}'));
