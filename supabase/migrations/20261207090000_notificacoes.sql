-- Passo 15 (bônus): notificações Web Push. Só as importantes: avisos da organização e a
-- resposta da crise a uma nota da delegação. Nenhuma função depende delas: a Agora e o
-- telão continuam sendo o canal principal.
--
-- O app chama a Edge Function enviar-push depois de publicar um aviso ou responder
-- notas; ela pede ao banco os destinatários (push_a_enviar) e manda. O banco decide
-- quem recebe e o texto, e cada aviso ou nota sai uma vez só: chamar de novo, ou
-- por outra pessoa, não repete nada.

-- Um aparelho (navegador) que aceitou notificações. O endereço vem do serviço de push
-- do navegador; as chaves cifram a mensagem, que só o aparelho lê.
create table public.assinatura_push (
	endpoint text primary key check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
	pessoa_id uuid not null references public.pessoa on delete cascade,
	p256dh text not null check (char_length(p256dh) <= 200),
	auth text not null check (char_length(auth) <= 100),
	criada_em timestamptz not null default now()
);

create index on public.assinatura_push (pessoa_id);

alter table public.assinatura_push enable row level security;

create policy "cada pessoa vê os próprios aparelhos" on public.assinatura_push
	for select to authenticated using (pessoa_id = (select auth.uid()));

-- O que já saiu: 'aviso:<id>' ou 'nota:<id>'.
create table public.push_enviado (
	chave text primary key,
	em timestamptz not null default now()
);

alter table public.push_enviado enable row level security;

create policy "ninguém pelo app: só a Edge Function, com o service role" on public.push_enviado
	for select to authenticated using (false);

-- Ativar: o mesmo aparelho, se outra pessoa entrar nele, passa a ser dela. Até 10
-- aparelhos por pessoa (os mais antigos saem).
create function public.salvar_assinatura_push(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
	if auth.uid() is null then
		raise exception 'Entre no app para ativar as notificações.' using errcode = '42501';
	end if;
	insert into public.assinatura_push (endpoint, pessoa_id, p256dh, auth)
	values (p_endpoint, auth.uid(), p_p256dh, p_auth)
	on conflict (endpoint) do update
		set pessoa_id = excluded.pessoa_id, p256dh = excluded.p256dh, auth = excluded.auth, criada_em = now();
	delete from public.assinatura_push
	where pessoa_id = auth.uid()
		and endpoint not in (
			select endpoint from public.assinatura_push where pessoa_id = auth.uid() order by criada_em desc limit 10
		);
end $$;

create function public.remover_assinatura_push(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
	delete from public.assinatura_push where endpoint = p_endpoint and pessoa_id = auth.uid();
$$;

-- O idioma de cada pessoa: o escolhido no perfil, senão o do comitê, senão português.
create function public.idioma_da_pessoa(p_pessoa uuid, p_evento uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
	select coalesce(
		(select idioma from public.pessoa where id = p_pessoa),
		(select c.idioma from public.participacao pa join public.comite c on c.id = pa.comite_id
			where pa.pessoa_id = p_pessoa and pa.evento_id = p_evento order by c.sigla limit 1),
		'pt'
	);
$$;

-- Os destinatários de um aviso ('aviso') ou da resposta a uma nota de crise ('nota'),
-- com o texto no idioma de cada um. Marca o envio: da segunda vez, não devolve nada.
-- Uma nota ainda sem resposta não é marcada (a resposta ainda vai sair).
create function public.push_a_enviar(p_tipo text, p_id uuid)
returns table (endpoint text, p256dh text, auth text, titulo text, corpo text, url text)
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_aviso public.aviso;
	v_nota public.nota_crise;
	v_sigla text;
	v_evento uuid;
begin
	if p_tipo = 'aviso' then
		select * into v_aviso from public.aviso where id = p_id;
		if not found then return; end if;
	elsif p_tipo = 'nota' then
		select * into v_nota from public.nota_crise where id = p_id;
		if not found or v_nota.status in ('pendente', 'em_analise') then return; end if;
		select c.sigla, c.evento_id into v_sigla, v_evento from public.comite c where c.id = v_nota.comite_id;
	else
		raise exception 'Tipo de notificação desconhecido.' using errcode = '22023';
	end if;

	insert into public.push_enviado (chave) values (p_tipo || ':' || p_id) on conflict do nothing;
	if not found then return; end if;

	if p_tipo = 'aviso' then
		return query
		select a.endpoint, a.p256dh, a.auth,
			case when public.idioma_da_pessoa(a.pessoa_id, v_aviso.evento_id) = 'en'
				then 'Notice from the organisers' else 'Aviso da organização' end,
			left(v_aviso.texto, 200),
			'/avisos'
		from public.assinatura_push a
		where a.pessoa_id is distinct from v_aviso.autor_id
			and exists (
				select 1 from public.participacao pa
				where pa.pessoa_id = a.pessoa_id and pa.evento_id = v_aviso.evento_id
					and (v_aviso.comite_id is null or pa.comite_id = v_aviso.comite_id or pa.comite_id is null)
			);
	else
		-- Só o título da nota: a resposta pode aparecer na tela bloqueada.
		return query
		select a.endpoint, a.p256dh, a.auth,
			case when public.idioma_da_pessoa(a.pessoa_id, v_evento) = 'en'
				then 'The crisis team answered your note' else 'A crise respondeu à sua nota' end,
			v_nota.titulo,
			'/comite/' || v_sigla || '/crise'
		from public.assinatura_push a
		where exists (
			select 1 from public.participacao pa
			where pa.pessoa_id = a.pessoa_id and pa.delegacao_id = v_nota.delegacao_id
		);
	end if;
end $$;

-- Aparelhos que o serviço de push diz não existirem mais (404 ou 410).
create function public.esquecer_assinaturas_push(p_endpoints text[])
returns void
language sql
security definer
set search_path = ''
as $$
	delete from public.assinatura_push where endpoint = any (p_endpoints);
$$;

revoke execute on function
	public.salvar_assinatura_push(text, text, text), public.remover_assinatura_push(text)
from public, anon;
grant execute on function
	public.salvar_assinatura_push(text, text, text), public.remover_assinatura_push(text)
to authenticated;

revoke execute on function
	public.idioma_da_pessoa(uuid, uuid), public.push_a_enviar(text, uuid), public.esquecer_assinaturas_push(text[])
from public, anon, authenticated;
grant execute on function
	public.push_a_enviar(text, uuid), public.esquecer_assinaturas_push(text[])
to service_role;

-- LGPD: "meus dados" passa a trazer os aparelhos com notificação (e o idioma do passo
-- 18). A função do passo 19 continua igual, com outro nome, só para uso interno.
alter function public.meus_dados() rename to meus_dados_ate_o_passo_19;
revoke execute on function public.meus_dados_ate_o_passo_19() from public, anon, authenticated;

create function public.meus_dados()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
	select jsonb_set(
		public.meus_dados_ate_o_passo_19(),
		'{conta,idioma}',
		coalesce(to_jsonb((select idioma from public.pessoa where id = auth.uid())), 'null')
	) || jsonb_build_object('aparelhos_com_notificacao', coalesce((
		select jsonb_agg(jsonb_build_object('endereco', endpoint, 'ativado_em', criada_em))
		from public.assinatura_push where pessoa_id = auth.uid()
	), '[]'));
$$;

revoke execute on function public.meus_dados() from public, anon;
grant execute on function public.meus_dados() to authenticated;
