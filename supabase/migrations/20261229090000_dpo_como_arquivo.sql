-- Passo 53: o DPO é um arquivo público, preparado antes do evento. A delegação envia um PDF
-- por tópico, e o comitê lê assim que chega, sem aprovação. A mesa comenta (só a delegação
-- lê o comentário) e pode retirar um arquivo indevido, o que fica no registro. O editor de
-- texto e a aprovação saem; a regra dpos_publicos deixa de valer (a chave fica no JSON das
-- regras, sem uso).
-- ponytail: os textos escritos no app antes deste passo continuam legíveis como texto, sem
-- virar PDF (até aqui só há dados de teste); converter, se um evento real tiver textos.

alter table public.dpo
	add column arquivo text, -- no bucket dpos: <comitê>/<delegação>/<tópico>.pdf
	add column envios timestamptz[] not null default '{}', -- a data de cada envio, o último no fim
	add column retirado_em timestamptz,
	drop constraint dpo_status_check,
	add constraint dpo_status_check check (status in ('rascunho', 'enviado', 'aprovado', 'pede_ajustes', 'retirado'));
update public.dpo set envios = array[enviado_em] where enviado_em is not null;

-- O comentário da mesa é para a delegação: fica fora da linha do DPO, que o comitê lê.
create table public.dpo_comentario (
	dpo_id uuid primary key references public.dpo on delete cascade,
	comite_id uuid not null,
	delegacao_id uuid not null,
	texto text not null check (char_length(texto) between 1 and 1000),
	criado_em timestamptz not null default clock_timestamp()
);
alter table public.dpo_comentario enable row level security;
create policy "comentário da mesa sobre o DPO: a delegação e a mesa" on public.dpo_comentario
	for select to authenticated
	using (delegacao_id = public.minha_delegacao(comite_id) or public.tem_papel(comite_id, '{mesa}'));
insert into public.dpo_comentario (dpo_id, comite_id, delegacao_id, texto)
	select id, comite_id, delegacao_id, comentario_mesa from public.dpo where comentario_mesa is not null;
alter table public.dpo drop column comentario_mesa;

-- Enviado, o DPO é do comitê. O rascunho de texto antigo e o retirado, só da delegação e da mesa.
create or replace function public.pode_ver_dpo(p_dpo uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.dpo d
		where d.id = p_dpo and (
			d.delegacao_id = public.minha_delegacao(d.comite_id)
			or public.tem_papel(d.comite_id, '{mesa}')
			or (d.status in ('enviado', 'aprovado') and public.participa_do_comite(d.comite_id))
		)
	);
$$;
alter policy "DPO: a delegação, a mesa e, se abertos, o comitê" on public.dpo rename to "DPO: a delegação, a mesa e, enviado, o comitê";

drop function public.salvar_dpo(uuid, int, text, text[]);
drop function public.enviar_dpo(uuid);
drop function public.avaliar_dpo(uuid, text, text);

-- Depois de subir o PDF, a delegação registra o envio. Enviar de novo troca o arquivo e
-- guarda a data; um DPO retirado pela mesa volta assim. O envio novo responde ao comentário
-- da mesa, que sai (como no passo 10).
create function public.enviar_dpo(p_comite uuid, p_topico int)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.minha_delegacao(p_comite);
	v_arquivo text := p_comite || '/' || v_delegacao || '/' || p_topico || '.pdf';
	v_id uuid;
begin
	if v_delegacao is null then
		raise exception 'Só a própria delegação envia o DPO.' using errcode = '42501';
	end if;
	if p_topico < 1 or p_topico > coalesce((select array_length(topicos, 1) from public.comite where id = p_comite), 0) then
		raise exception 'Escolha um dos tópicos do comitê.' using errcode = '22023';
	end if;
	if not exists (select 1 from storage.objects where bucket_id = 'dpos' and name = v_arquivo) then
		raise exception 'Envie o PDF primeiro.' using errcode = '22023';
	end if;
	insert into public.dpo (comite_id, delegacao_id, topico, arquivo, status, enviado_em, envios)
	values (p_comite, v_delegacao, p_topico, v_arquivo, 'enviado', clock_timestamp(), array[clock_timestamp()])
	on conflict (comite_id, delegacao_id, topico) do update set
		arquivo = excluded.arquivo,
		status = 'enviado',
		enviado_em = excluded.enviado_em,
		envios = public.dpo.envios || excluded.enviado_em,
		retirado_em = null,
		atualizado_em = clock_timestamp()
	returning id into v_id;
	delete from public.dpo_comentario where dpo_id = v_id;
	return v_id;
end $$;

-- A mesa comenta (texto vazio apaga o comentário). Mexer no DPO avisa a delegação ao vivo.
create function public.comentar_dpo(p_dpo uuid, p_texto text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	d public.dpo := (select x from public.dpo x where x.id = p_dpo);
begin
	perform public.exigir_mesa(d.comite_id);
	if nullif(trim(p_texto), '') is null then
		delete from public.dpo_comentario where dpo_id = p_dpo;
	else
		insert into public.dpo_comentario (dpo_id, comite_id, delegacao_id, texto)
		values (p_dpo, d.comite_id, d.delegacao_id, trim(p_texto))
		on conflict (dpo_id) do update set texto = excluded.texto, criado_em = clock_timestamp();
	end if;
	update public.dpo set atualizado_em = clock_timestamp() where id = p_dpo;
end $$;

-- A mesa retira um arquivo indevido, com o motivo (vira o comentário e fica no registro).
-- Devolve o caminho do arquivo, que a tela apaga do Storage; sem ele no DPO, ninguém mais o lê.
create function public.retirar_dpo(p_dpo uuid, p_motivo text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
	d public.dpo := (select x from public.dpo x where x.id = p_dpo);
begin
	perform public.exigir_mesa(d.comite_id);
	if nullif(trim(p_motivo), '') is null then
		raise exception 'Diga por que o DPO foi retirado.' using errcode = '22023';
	end if;
	update public.dpo
		set arquivo = null, texto = '', status = 'retirado', retirado_em = clock_timestamp(), atualizado_em = clock_timestamp()
		where id = p_dpo;
	perform public.comentar_dpo(p_dpo, p_motivo);
	insert into public.registro (evento_id, pessoa_id, acao, alvo, detalhe)
		values (public.evento_do_comite(d.comite_id), auth.uid(), 'retirar_dpo', p_dpo, left(trim(p_motivo), 1000));
	return d.arquivo;
end $$;

revoke execute on function public.enviar_dpo(uuid, int), public.comentar_dpo(uuid, text), public.retirar_dpo(uuid, text)
	from public, anon;
grant execute on function public.enviar_dpo(uuid, int), public.comentar_dpo(uuid, text), public.retirar_dpo(uuid, text)
	to authenticated;

-- O arquivo: <comitê>/<delegação>/<tópico>.pdf, até 5 MB. A delegação envia e troca o seu;
-- lê quem pode ver o DPO que aponta para ele; a mesa lê todos e apaga o retirado (apagar
-- exige ler: sem isso, o arquivo retirado ficaria no Storage sem erro).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dpos', 'dpos', false, 5242880, array['application/pdf']);

create policy "dpos: a delegação, a mesa e quem pode ver o DPO leem"
	on storage.objects for select to authenticated
	using (
		bucket_id = 'dpos' and (
			(storage.foldername(name))[2] = public.minha_delegacao(((storage.foldername(name))[1])::uuid)::text
			or public.tem_papel(((storage.foldername(name))[1])::uuid, '{mesa}')
			or exists (select 1 from public.dpo d where d.arquivo = name and public.pode_ver_dpo(d.id))
		)
	);
create policy "dpos: a delegação envia o seu"
	on storage.objects for insert to authenticated
	with check (
		bucket_id = 'dpos'
		and (storage.foldername(name))[2] = public.minha_delegacao(((storage.foldername(name))[1])::uuid)::text
		and storage.filename(name) ~ '^[0-9]+\.pdf$'
	);
create policy "dpos: a delegação troca o seu"
	on storage.objects for update to authenticated
	using (bucket_id = 'dpos' and (storage.foldername(name))[2] = public.minha_delegacao(((storage.foldername(name))[1])::uuid)::text)
	with check (
		bucket_id = 'dpos'
		and (storage.foldername(name))[2] = public.minha_delegacao(((storage.foldername(name))[1])::uuid)::text
		and storage.filename(name) ~ '^[0-9]+\.pdf$'
	);
create policy "dpos: a mesa apaga"
	on storage.objects for delete to authenticated
	using (bucket_id = 'dpos' and public.tem_papel(((storage.foldername(name))[1])::uuid, '{mesa}'));

-- LGPD: ao fim do evento, o DPO enviado fica (é público), como o aprovado antes. Igual à
-- função do passo 33, menos a linha do DPO.
create or replace function public.apagar_dados_pessoais_ate_o_passo_33(p_evento uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
	v_comites uuid[] := array(select id from public.comite where evento_id = p_evento);
	v_contas int;
begin
	perform public.exigir_secretaria(p_evento);
	insert into public.registro (evento_id, pessoa_id, acao, detalhe) values (p_evento, auth.uid(), 'apagar_dados', 'evento inteiro');

	-- Conteúdo privado.
	delete from public.mensagem where comite_id = any (v_comites);
	delete from public.carta where comite_id = any (v_comites) and not publica;
	delete from public.nota_crise where comite_id = any (v_comites);
	delete from public.entrevista where comite_id = any (v_comites);
	delete from public.denuncia where noticia_id in (select id from public.noticia where comite_id = any (v_comites));
	delete from public.dpo where comite_id = any (v_comites) and status not in ('enviado', 'aprovado');
	delete from public.documento where comite_id = any (v_comites) and status in ('rascunho', 'enviado');
	delete from public.proposta_alteracao where comite_id = any (v_comites);
	delete from public.comentario where comite_id = any (v_comites);
	delete from public.noticia where comite_id = any (v_comites) and status <> 'publicada';

	-- Contatos e credenciais.
	delete from public.credencial where evento_id = p_evento;
	delete from public.checkin where evento_id = p_evento;
	delete from public.pedido_exclusao where pessoa_id in (select pessoa_id from public.participacao where evento_id = p_evento);
	update public.certificado set email = codigo where evento_id = p_evento;
	delete from public.convite where evento_id = p_evento;

	-- As contas de quem só participou deste evento (menos a de quem executa).
	with apagadas as (
		delete from auth.users u
		where u.id <> auth.uid()
			and exists (select 1 from public.participacao where pessoa_id = u.id and evento_id = p_evento)
			and not exists (select 1 from public.participacao where pessoa_id = u.id and evento_id <> p_evento)
		returning 1
	)
	select count(*) into v_contas from apagadas;
	return v_contas;
end $$;
