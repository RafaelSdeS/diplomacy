-- Passo 45, parte B: a coletiva como fluxo oral. A pauta ganha estado, ordem e horários;
-- a Diretoria da Press chama, inicia e conclui cada resposta; o texto da pergunta só se
-- abre ao evento quando a delegação começa a responder (depois de ouvi-la). A resposta é
-- falada: nada aqui guarda o que a delegação disse.

alter table public.coletiva_pergunta
	add column status text not null default 'na_pauta'
		check (status in ('na_pauta', 'chamando', 'respondendo', 'concluida', 'retirada')),
	add column ordem int,
	add column chamada_em timestamptz,
	add column resposta_iniciada_em timestamptz,
	add column resposta_concluida_em timestamptz,
	add column presente boolean not null default false,
	add column retirada_motivo text check (char_length(retirada_motivo) <= 200);

-- A ordem da pauta é a de chegada.
update public.coletiva_pergunta p set ordem = o.n
from (select id, row_number() over (partition by coletiva_id order by criada_em) as n from public.coletiva_pergunta) o
where o.id = p.id;
alter table public.coletiva_pergunta alter column ordem set not null;

-- Pergunta retirada não conta no limite nem impede outra para a mesma delegação.
alter table public.coletiva_pergunta drop constraint coletiva_pergunta_coletiva_id_veiculo_id_delegacao_id_key;
create unique index coletiva_pergunta_uma_por_delegacao on public.coletiva_pergunta (coletiva_id, veiculo_id, delegacao_id)
	where status <> 'retirada';

-- O texto: a press do veículo e a Diretoria leem sempre; o evento, a partir de Respondendo.
drop policy "a press do veículo e a Diretoria da Press leem a pergunta" on public.coletiva_pergunta_texto;
create policy "a press do veículo, a Diretoria e, depois de feita, o evento leem a pergunta" on public.coletiva_pergunta_texto
	for select to authenticated
	using (exists (
		select 1 from public.coletiva_pergunta p
		where p.id = pergunta_id
			and (
				public.tem_papel(p.comite_id, '{press}')
				or public.eh_diretoria_press(public.evento_do_comite(p.comite_id))
				or (p.status in ('respondendo', 'concluida') and public.eh_participante(public.evento_do_comite(p.comite_id)))
			)
	));

-- A nota da press depois da fala: só a press do veículo e a Diretoria leem.
create table public.coletiva_nota (
	pergunta_id uuid primary key references public.coletiva_pergunta on delete cascade,
	texto text not null check (char_length(texto) between 1 and 1000),
	atualizada_em timestamptz not null default now()
);
alter table public.coletiva_nota enable row level security;
create policy "a press do veículo e a Diretoria leem a nota" on public.coletiva_nota
	for select to authenticated
	using (exists (
		select 1 from public.coletiva_pergunta p
		where p.id = pergunta_id
			and (public.tem_papel(p.comite_id, '{press}') or public.eh_diretoria_press(public.evento_do_comite(p.comite_id)))
	));

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
	if (select count(*) from public.coletiva_pergunta
		where coletiva_id = p_coletiva and veiculo_id = v_veiculo and status <> 'retirada') >= 4 then
		raise exception 'Cada veículo leva até 4 perguntas à coletiva.';
	end if;
	insert into public.coletiva_pergunta (coletiva_id, comite_id, veiculo_id, delegacao_id, autor_id, ordem)
	values (p_coletiva, d.comite_id, v_veiculo, d.id, auth.uid(),
		coalesce((select max(ordem) from public.coletiva_pergunta where coletiva_id = p_coletiva), 0) + 1)
	returning id into v_id;
	insert into public.coletiva_pergunta_texto (pergunta_id, texto) values (v_id, trim(p_pergunta));
exception when unique_violation then
	raise exception 'O seu veículo já tem uma pergunta para essa delegação.' using errcode = '23505';
end $$;

-- A pergunta e a coletiva dela, conferindo que quem chama é a Diretoria da Press.
create function public.pergunta_da_diretoria(p_pergunta uuid)
returns public.coletiva_pergunta
language plpgsql security definer set search_path = ''
as $$
declare
	p public.coletiva_pergunta := (select x from public.coletiva_pergunta x where x.id = p_pergunta);
begin
	if p.id is null or not public.eh_diretoria_press(public.evento_do_comite(p.comite_id)) then
		raise exception 'Só a Diretoria da Press conduz a coletiva.' using errcode = '42501';
	end if;
	return p;
end $$;

create function public.chamar_na_coletiva(p_pergunta uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	p public.coletiva_pergunta := public.pergunta_da_diretoria(p_pergunta);
begin
	if p.status <> 'na_pauta' then
		raise exception 'Só uma pergunta na pauta pode ser chamada.';
	end if;
	if exists (select 1 from public.coletiva_pergunta
		where coletiva_id = p.coletiva_id and status in ('chamando', 'respondendo')) then
		raise exception 'Conclua a pergunta em andamento antes de chamar a próxima.';
	end if;
	update public.coletiva_pergunta set status = 'chamando', chamada_em = now() where id = p.id;
end $$;

create function public.iniciar_resposta_coletiva(p_pergunta uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	p public.coletiva_pergunta := public.pergunta_da_diretoria(p_pergunta);
begin
	if p.status <> 'chamando' then
		raise exception 'A delegação precisa ter sido chamada.';
	end if;
	update public.coletiva_pergunta set status = 'respondendo', resposta_iniciada_em = now() where id = p.id;
end $$;

create function public.concluir_resposta_coletiva(p_pergunta uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	p public.coletiva_pergunta := public.pergunta_da_diretoria(p_pergunta);
begin
	if p.status <> 'respondendo' then
		raise exception 'Só uma resposta em andamento pode ser concluída.';
	end if;
	update public.coletiva_pergunta set status = 'concluida', resposta_concluida_em = now() where id = p.id;
end $$;

-- Delegação ausente ou fora de hora: a pergunta volta para o fim da pauta.
create function public.adiar_pergunta_coletiva(p_pergunta uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	p public.coletiva_pergunta := public.pergunta_da_diretoria(p_pergunta);
begin
	if p.status not in ('na_pauta', 'chamando') then
		raise exception 'Só uma pergunta ainda não respondida pode ir para o fim da pauta.';
	end if;
	update public.coletiva_pergunta
	set status = 'na_pauta', chamada_em = null, presente = false,
		ordem = (select max(ordem) from public.coletiva_pergunta where coletiva_id = p.coletiva_id) + 1
	where id = p.id;
end $$;

create function public.retirar_pergunta_da_coletiva(p_pergunta uuid, p_motivo text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	p public.coletiva_pergunta := public.pergunta_da_diretoria(p_pergunta);
begin
	if p.status in ('concluida', 'retirada') then
		raise exception 'Essa pergunta já saiu da pauta.';
	end if;
	update public.coletiva_pergunta set status = 'retirada', retirada_motivo = nullif(trim(p_motivo), '') where id = p.id;
end $$;

-- A delegação chamada avisa que está pronta para o microfone (opcional).
create function public.confirmar_chamada_coletiva(p_pergunta uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	p public.coletiva_pergunta := (select x from public.coletiva_pergunta x where x.id = p_pergunta);
begin
	-- minha_delegacao, e não exigir_delegacao: a coletiva é do evento, sem sessão aberta.
	if p.id is null or p.delegacao_id is distinct from public.minha_delegacao(p.comite_id) then
		raise exception 'Só a delegação chamada confirma.' using errcode = '42501';
	end if;
	if p.status <> 'chamando' then
		raise exception 'A sua delegação não está sendo chamada.';
	end if;
	update public.coletiva_pergunta set presente = true where id = p.id;
end $$;

-- A press do veículo registra uma nota curta depois da fala (para a matéria).
create function public.salvar_nota_coletiva(p_pergunta uuid, p_texto text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	p public.coletiva_pergunta := (select x from public.coletiva_pergunta x where x.id = p_pergunta);
begin
	if p.id is null or not public.tem_papel(p.comite_id, '{press}') then
		raise exception 'Só a press do veículo anota a fala.' using errcode = '42501';
	end if;
	if p.status <> 'concluida' then
		raise exception 'A nota vem depois da resposta.';
	end if;
	insert into public.coletiva_nota (pergunta_id, texto) values (p.id, trim(p_texto))
	on conflict (pergunta_id) do update set texto = excluded.texto, atualizada_em = now();
end $$;

revoke execute on function
	public.pergunta_da_diretoria(uuid), public.chamar_na_coletiva(uuid), public.iniciar_resposta_coletiva(uuid),
	public.concluir_resposta_coletiva(uuid), public.adiar_pergunta_coletiva(uuid), public.retirar_pergunta_da_coletiva(uuid, text),
	public.confirmar_chamada_coletiva(uuid), public.salvar_nota_coletiva(uuid, text)
from public, anon;
grant execute on function
	public.chamar_na_coletiva(uuid), public.iniciar_resposta_coletiva(uuid),
	public.concluir_resposta_coletiva(uuid), public.adiar_pergunta_coletiva(uuid), public.retirar_pergunta_da_coletiva(uuid, text),
	public.confirmar_chamada_coletiva(uuid), public.salvar_nota_coletiva(uuid, text)
to authenticated;
