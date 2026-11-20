-- Passo 14: login pelo crachá e pelo código da secretaria, check-in e certificados.
--
-- O banco guarda só o hash (sha256) de cada código. O código aparece uma vez, na
-- emissão, para a secretaria imprimir o crachá ou ditar o código. A Edge Function
-- entrar-com-cracha troca um código válido por um link de login (e cria a conta no
-- primeiro acesso, a partir do convite: com o cadastro livre desligado, ninguém
-- precisa criar 300 contas à mão).

alter table public.convite add column nome text check (char_length(nome) <= 120);

create table public.credencial (
	id uuid primary key default gen_random_uuid(),
	evento_id uuid not null references public.evento on delete cascade,
	email text not null,
	tipo text not null check (tipo in ('cracha', 'codigo')), -- código: curto, vale 30 min e uma vez
	hash text not null unique,
	expira_em timestamptz,
	revogada boolean not null default false,
	usada_em timestamptz,
	criada_em timestamptz not null default now()
);
create index on public.credencial (evento_id, email);

-- Tentativas erradas por origem (o IP, em hash), para frear quem tenta adivinhar.
-- Só as erradas contam: no evento, todos saem pelo mesmo IP do wi-fi.
create table public.tentativa_login (
	origem text not null,
	em timestamptz not null default now()
);
create index on public.tentativa_login (origem, em);

create table public.checkin (
	evento_id uuid not null references public.evento on delete cascade,
	email text not null,
	dia date not null default (now() at time zone 'America/Sao_Paulo')::date,
	em timestamptz not null default now(),
	primary key (evento_id, email, dia)
);

create table public.certificado (
	codigo text primary key, -- vai impresso no certificado, para conferir em /verificar
	evento_id uuid not null references public.evento on delete cascade,
	email text not null,
	nome text not null,
	funcao text not null,
	emitido_em timestamptz not null default now(),
	unique (evento_id, email)
);

alter table public.credencial enable row level security;
alter table public.tentativa_login enable row level security;
alter table public.checkin enable row level security;
alter table public.certificado enable row level security;

create policy "a secretaria vê as credenciais (só o hash)" on public.credencial
	for select to authenticated using (public.eh_secretaria(evento_id));
create policy "a secretaria vê o check-in" on public.checkin
	for select to authenticated using (public.eh_secretaria(evento_id));
create policy "a secretaria vê os certificados" on public.certificado
	for select to authenticated using (public.eh_secretaria(evento_id));
create policy "ninguém pelo app: só a Edge Function, com o service role" on public.tentativa_login
	for select to authenticated using (false);

-- Ajudantes

create function public.hash_codigo(p_codigo text)
returns text
language sql immutable set search_path = ''
as $$
	select encode(extensions.digest(trim(p_codigo), 'sha256'), 'hex');
$$;

-- Código curto, sem letras e números que se confundem (0/O, 1/I/L).
create function public.codigo_curto(p_tamanho int)
returns text
language sql volatile set search_path = ''
as $$
	select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', get_byte(b, i) % 31 + 1, 1), '')
	from extensions.gen_random_bytes(p_tamanho) b, generate_series(0, p_tamanho - 1) i;
$$;

create function public.exigir_secretaria(p_evento uuid)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
	if not public.eh_secretaria(p_evento) then
		raise exception 'Só a secretaria pode fazer isso.' using errcode = '42501';
	end if;
end $$;

-- O nome de quem tem convite: o do convite, o da conta ou o começo do e-mail.
create function public.nome_do_convidado(p_evento uuid, p_email text)
returns text
language sql stable security definer set search_path = ''
as $$
	select coalesce(
		(select nome from public.convite where evento_id = p_evento and lower(email) = lower(p_email) and nome is not null limit 1),
		(select p.nome from public.pessoa p join auth.users u on u.id = p.id where lower(u.email) = lower(p_email)),
		split_part(p_email, '@', 1)
	);
$$;

-- Crachás e códigos (secretaria)

-- Emite (ou reemite) os crachás: cada código novo revoga o anterior da pessoa. Sem
-- p_emails, todos os convidados do evento. Os códigos só aparecem aqui.
create function public.emitir_crachas(p_evento uuid, p_emails text[] default null)
returns table (email text, nome text, codigo text)
language plpgsql security definer set search_path = ''
as $$
declare
	v_email text;
	v_codigo text;
begin
	perform public.exigir_secretaria(p_evento);
	for v_email in
		select distinct lower(c.email) from public.convite c
		where c.evento_id = p_evento and (p_emails is null or lower(c.email) = any (select lower(x) from unnest(p_emails) x))
		order by 1
	loop
		update public.credencial set revogada = true
		where evento_id = p_evento and credencial.email = v_email and tipo = 'cracha' and not revogada;
		v_codigo := translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');
		insert into public.credencial (evento_id, email, tipo, hash) values (p_evento, v_email, 'cracha', public.hash_codigo(v_codigo));
		email := v_email;
		nome := public.nome_do_convidado(p_evento, v_email);
		codigo := v_codigo;
		return next;
	end loop;
end $$;

-- Código curto para quem perdeu o crachá: vale 30 minutos e uma vez.
create function public.emitir_codigo(p_evento uuid, p_email text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
	v_codigo text := public.codigo_curto(8);
begin
	perform public.exigir_secretaria(p_evento);
	if not exists (select 1 from public.convite where evento_id = p_evento and lower(email) = lower(p_email)) then
		raise exception 'Esse e-mail não tem convite neste evento.' using errcode = 'P0002';
	end if;
	update public.credencial set revogada = true
	where evento_id = p_evento and email = lower(p_email) and tipo = 'codigo' and not revogada;
	insert into public.credencial (evento_id, email, tipo, hash, expira_em)
	values (p_evento, lower(p_email), 'codigo', public.hash_codigo(v_codigo), now() + interval '30 minutes');
	return v_codigo;
end $$;

create function public.revogar_credenciais(p_evento uuid, p_email text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_secretaria(p_evento);
	update public.credencial set revogada = true where evento_id = p_evento and email = lower(p_email) and not revogada;
end $$;

-- Login (só a Edge Function, com o service role)

-- Troca um código pelo e-mail da pessoa. Código errado: nada (e a tentativa conta).
create function public.entrar_com_codigo(p_codigo text, p_origem text)
returns table (email text, nome text)
language plpgsql security definer set search_path = ''
as $$
declare
	c public.credencial;
begin
	delete from public.tentativa_login where em < now() - interval '1 hour';
	if (select count(*) from public.tentativa_login where origem = p_origem and em > now() - interval '15 minutes') >= 30 then
		raise exception 'Muitas tentativas. Espere alguns minutos.' using errcode = 'P0429';
	end if;
	select * into c from public.credencial x
	where x.hash = public.hash_codigo(p_codigo) and not x.revogada
		and (x.expira_em is null or x.expira_em > now()) and (x.tipo = 'cracha' or x.usada_em is null);
	if c.id is null then
		insert into public.tentativa_login (origem) values (p_origem);
		return;
	end if;
	if c.tipo = 'codigo' then
		update public.credencial set usada_em = now() where id = c.id;
	end if;
	email := c.email;
	nome := public.nome_do_convidado(c.evento_id, c.email);
	return next;
end $$;

-- Check-in (secretaria)

create function public.marcar_checkin(p_evento uuid, p_email text, p_presente boolean default true)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_secretaria(p_evento);
	if p_presente then
		insert into public.checkin (evento_id, email) values (p_evento, lower(p_email)) on conflict do nothing;
	else
		delete from public.checkin
		where evento_id = p_evento and email = lower(p_email) and dia = (now() at time zone 'America/Sao_Paulo')::date;
	end if;
end $$;

-- A secretaria lê o QR do crachá: o código diz de quem é (sem consumir nada).
create function public.checkin_por_cracha(p_evento uuid, p_codigo text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
	v_email text;
begin
	perform public.exigir_secretaria(p_evento);
	select email into v_email from public.credencial
	where evento_id = p_evento and hash = public.hash_codigo(p_codigo) and tipo = 'cracha' and not revogada;
	if v_email is null then
		raise exception 'Crachá não reconhecido.' using errcode = 'P0002';
	end if;
	perform public.marcar_checkin(p_evento, v_email);
	return v_email;
end $$;

-- Certificados

-- Um certificado por pessoa com check-in, com a função de cada convite no evento.
create function public.emitir_certificados(p_evento uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
	v_novos int;
begin
	perform public.exigir_secretaria(p_evento);
	insert into public.certificado (codigo, evento_id, email, nome, funcao)
	select public.codigo_curto(10), p_evento, x.email, public.nome_do_convidado(p_evento, x.email), x.funcao
	from (
		select lower(c.email) as email, string_agg(distinct
			case c.papel
				when 'delegado' then 'Delegado(a) de ' || d.nome
				when 'mesa' then 'Mesa'
				when 'crise' then 'Equipe de crise'
				when 'press' then 'Press'
				else 'Secretaria'
			end || coalesce(' · ' || co.nome, ''), '; ') as funcao
		from public.convite c
		left join public.comite co on co.id = c.comite_id
		left join public.delegacao d on d.id = c.delegacao_id
		where c.evento_id = p_evento
			and exists (select 1 from public.checkin k where k.evento_id = p_evento and k.email = lower(c.email))
		group by lower(c.email)
	) x
	on conflict (evento_id, email) do nothing;
	get diagnostics v_novos = row_count;
	return v_novos;
end $$;

-- Rota pública /verificar/[codigo]: só nome, evento e função.
create function public.verificar_certificado(p_codigo text)
returns table (nome text, evento text, funcao text)
language sql stable security definer set search_path = ''
as $$
	select c.nome, e.nome || ' ' || e.ano, c.funcao
	from public.certificado c join public.evento e on e.id = c.evento_id
	where c.codigo = upper(trim(p_codigo));
$$;

revoke execute on function
	public.codigo_curto(int), public.exigir_secretaria(uuid), public.nome_do_convidado(uuid, text),
	public.entrar_com_codigo(text, text)
from public, anon, authenticated;
grant execute on function public.entrar_com_codigo(text, text) to service_role;

revoke execute on function
	public.emitir_crachas(uuid, text[]), public.emitir_codigo(uuid, text), public.revogar_credenciais(uuid, text),
	public.marcar_checkin(uuid, text, boolean), public.checkin_por_cracha(uuid, text), public.emitir_certificados(uuid)
from public, anon;
grant execute on function
	public.emitir_crachas(uuid, text[]), public.emitir_codigo(uuid, text), public.revogar_credenciais(uuid, text),
	public.marcar_checkin(uuid, text, boolean), public.checkin_por_cracha(uuid, text), public.emitir_certificados(uuid)
to authenticated;

revoke execute on function public.verificar_certificado(text) from public;
grant execute on function public.verificar_certificado(text) to anon, authenticated;
