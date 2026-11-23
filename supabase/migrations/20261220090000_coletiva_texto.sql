-- Passo 45, parte A: o texto da pergunta sai da pauta da coletiva.
--
-- A RLS filtra linhas, não colunas: com o texto em coletiva_pergunta, o select que libera
-- a pauta ao evento liberava também a pergunta, e a delegação a lia antes de ouvi-la.
-- Até existirem os estados da parte B, só a press do veículo (a do comitê) e a Diretoria
-- da Press (ou a secretaria) leem o texto. A escrita é só por perguntar_na_coletiva.
-- O tempo real continua avisando pela pauta (coletiva_pergunta): esta tabela não transmite.

create table public.coletiva_pergunta_texto (
	pergunta_id uuid primary key references public.coletiva_pergunta on delete cascade,
	texto text not null check (char_length(texto) between 1 and 300),
	atualizada_em timestamptz not null default now()
);
alter table public.coletiva_pergunta_texto enable row level security;

create policy "a press do veículo e a Diretoria da Press leem a pergunta" on public.coletiva_pergunta_texto
	for select to authenticated
	using (exists (
		select 1 from public.coletiva_pergunta p
		where p.id = pergunta_id
			and (public.tem_papel(p.comite_id, '{press}') or public.eh_diretoria_press(public.evento_do_comite(p.comite_id)))
	));

-- 1. Copia (a migração não perde nenhum texto).
insert into public.coletiva_pergunta_texto (pergunta_id, texto, atualizada_em)
select id, pergunta, criada_em from public.coletiva_pergunta;

-- 2. A função passa a gravar o texto na tabela nova.
create or replace function public.perguntar_na_coletiva(p_coletiva uuid, p_delegacao uuid, p_pergunta text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	c public.coletiva := (select x from public.coletiva x where x.id = p_coletiva);
	d public.delegacao := (select x from public.delegacao x where x.id = p_delegacao);
	v_veiculo uuid := (select id from public.veiculo where comite_id = d.comite_id);
	v_id uuid;
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
	insert into public.coletiva_pergunta (coletiva_id, comite_id, veiculo_id, delegacao_id, autor_id)
	values (p_coletiva, d.comite_id, v_veiculo, d.id, auth.uid())
	returning id into v_id;
	insert into public.coletiva_pergunta_texto (pergunta_id, texto) values (v_id, trim(p_pergunta));
exception when unique_violation then
	raise exception 'O seu veículo já tem uma pergunta para essa delegação.' using errcode = '23505';
end $$;

-- 3. Só então a coluna sai da pauta.
alter table public.coletiva_pergunta drop column pergunta;
