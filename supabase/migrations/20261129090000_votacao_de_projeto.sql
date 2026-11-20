-- Passo 12: no piloto, a mesa leva a voto (ou aprova por consenso) um projeto que
-- ela aprovou. O procedimento completo (fase de ação, emendas, divisão da questão,
-- regra do CSNU) fica para o passo 16.

alter table public.documento add column enviado_em timestamptz; -- para as métricas do piloto
alter table public.votacao add column documento_id uuid references public.documento on delete set null;

-- Gatilho: o documento guarda quando foi enviado à mesa.
create function public.marcar_envio_documento()
returns trigger
language plpgsql set search_path = ''
as $$
begin
	if new.status = 'enviado' and old.status is distinct from 'enviado' then
		new.enviado_em := clock_timestamp();
	end if;
	return new;
end $$;
create trigger marcar_envio_documento before update of status on public.documento
	for each row execute function public.marcar_envio_documento();

-- Gatilho: encerrada a votação de um projeto, o resultado vale para o documento. Sem
-- resultado (sessão encerrada no meio), o projeto volta a esperar a mesa.
create function public.resultado_do_projeto()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	update public.documento
	set status = case when new.aprovada then 'aprovado' when not new.aprovada then 'rejeitado' else 'aprovado_mesa' end
	where id = new.documento_id and status = 'em_votacao';
	return null;
end $$;
create trigger resultado_do_projeto after update of aberta on public.votacao
	for each row when (old.aberta and not new.aberta and new.documento_id is not null)
	execute function public.resultado_do_projeto();

revoke execute on function public.marcar_envio_documento(), public.resultado_do_projeto() from public, anon, authenticated;

-- A mesa abre a votação substantiva do projeto. Quem preside a votação é a mesa
-- (abrir_votacao_livre confere a presidência e o quórum).
create function public.abrir_votacao_projeto(p_documento uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
	v_votacao uuid;
begin
	perform public.exigir_mesa(d.comite_id);
	if d.tipo = 'working_paper' or d.status <> 'aprovado_mesa' then
		raise exception 'Só um projeto aprovado pela mesa vai a voto.';
	end if;
	v_votacao := public.abrir_votacao_livre(
		d.comite_id,
		left(
			(case d.tipo when 'projeto' then 'Projeto de resolução' else 'Resolução de crise' end)
				|| coalesce(' ' || d.numero, '') || ': ' || d.titulo,
			200
		),
		'substantiva'
	);
	update public.votacao set documento_id = d.id where id = v_votacao;
	update public.documento set status = 'em_votacao' where id = d.id;
	return v_votacao;
end $$;

-- Sem oposição na sala, a mesa aprova o projeto por consenso.
create function public.aprovar_por_consenso(p_documento uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
begin
	perform public.exigir_mesa(d.comite_id);
	if d.tipo = 'working_paper' or d.status <> 'aprovado_mesa' then
		raise exception 'Só um projeto aprovado pela mesa é aprovado por consenso.';
	end if;
	update public.documento set status = 'aprovado' where id = d.id;
end $$;

revoke execute on function public.abrir_votacao_projeto(uuid), public.aprovar_por_consenso(uuid) from public, anon;
grant execute on function public.abrir_votacao_projeto(uuid), public.aprovar_por_consenso(uuid) to authenticated;
