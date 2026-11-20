-- Passo 19: LGPD e pós-evento. Registro das ações sensíveis, direitos do titular
-- (meus dados, pedido de exclusão), exclusão no prazo, pesquisa de satisfação,
-- arquivo da edição e cópia dos modelos para a próxima edição.

-- 1. Registro das ações sensíveis

-- Mudar papel (convite aceito, papel trocado ou removido).
create function public.registrar_papel()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
	p public.participacao := coalesce(new, old);
begin
	insert into public.registro (evento_id, pessoa_id, acao, alvo, detalhe)
	values (
		p.evento_id, auth.uid(),
		case tg_op when 'INSERT' then 'papel_concedido' when 'DELETE' then 'papel_removido' else 'papel_alterado' end,
		p.pessoa_id,
		p.papel::text || coalesce(' · ' || (select sigla from public.comite where id = p.comite_id), '')
	);
	return null;
end $$;
create trigger registrar_papel after insert or update or delete on public.participacao
	for each row execute function public.registrar_papel();

-- Responder nota de crise.
create function public.registrar_resposta_nota()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	insert into public.registro (evento_id, pessoa_id, acao, alvo, detalhe)
	values (public.evento_do_comite(new.comite_id), auth.uid(), 'responder_nota', new.id, new.status::text);
	return null;
end $$;
create trigger registrar_resposta_nota after update of status on public.nota_crise
	for each row when (new.status in ('aprovada', 'rejeitada', 'pede_ajuste') and old.status is distinct from new.status)
	execute function public.registrar_resposta_nota();

-- Só a secretaria lê o registro; a Diretoria da Press, só o que é da press.
drop policy "a Diretoria da Press e a secretaria leem o registro" on public.registro;
create policy "a secretaria lê o registro; a Diretoria da Press, o da press" on public.registro
	for select to authenticated
	using (
		public.eh_secretaria(evento_id)
		or (public.eh_diretoria_press(evento_id) and acao in ('ocultar_noticia', 'aprovar_noticia'))
	);

-- 2. Direitos do titular

-- Tudo o que o app guarda sobre quem está logado, em JSON (nunca o hash das credenciais).
create function public.meus_dados()
returns jsonb
language sql stable security definer set search_path = ''
as $$
	with eu as (
		select p.id, p.nome, p.bio, p.foto_path, lower(u.email) as email, u.created_at
		from public.pessoa p join auth.users u on u.id = p.id
		where p.id = auth.uid()
	)
	select jsonb_build_object(
		'conta', (select jsonb_build_object('nome', nome, 'email', email, 'bio', bio, 'foto', foto_path, 'criada_em', created_at) from eu),
		'participacoes', coalesce((
			select jsonb_agg(jsonb_build_object('evento', e.nome || ' ' || e.ano, 'papel', pa.papel, 'comite', c.sigla, 'delegacao', d.nome))
			from public.participacao pa join public.evento e on e.id = pa.evento_id
			left join public.comite c on c.id = pa.comite_id left join public.delegacao d on d.id = pa.delegacao_id
			where pa.pessoa_id = (select id from eu)
		), '[]'),
		'convites', coalesce((
			select jsonb_agg(jsonb_build_object('nome', nome, 'papel', papel, 'criado_em', criado_em))
			from public.convite where lower(email) = (select email from eu)
		), '[]'),
		'notas_de_crise', coalesce((
			select jsonb_agg(jsonb_build_object('titulo', titulo, 'texto', texto, 'status', status, 'criado_em', criado_em))
			from public.nota_crise where autor_id = (select id from eu)
		), '[]'),
		'mensagens', coalesce((
			select jsonb_agg(jsonb_build_object('tipo', tipo, 'texto', texto, 'criado_em', criado_em))
			from public.mensagem where autor_id = (select id from eu)
		), '[]'),
		'cartas', coalesce((
			select jsonb_agg(jsonb_build_object('titulo', titulo, 'corpo', corpo, 'enviada_em', enviada_em))
			from public.carta where autor_id = (select id from eu)
		), '[]'),
		'noticias', coalesce((
			select jsonb_agg(jsonb_build_object('titulo', titulo, 'status', status, 'publicada_em', publicada_em))
			from public.noticia where autor_id = (select id from eu)
		), '[]'),
		'comentarios', coalesce((
			select jsonb_agg(jsonb_build_object('texto', texto, 'criado_em', criado_em))
			from public.comentario where autor_id = (select id from eu)
		), '[]'),
		'denuncias', coalesce((
			select jsonb_agg(jsonb_build_object('motivo', motivo, 'criado_em', criado_em))
			from public.denuncia where autor_id = (select id from eu)
		), '[]'),
		'checkins', coalesce((select jsonb_agg(dia) from public.checkin where email = (select email from eu)), '[]'),
		'certificados', coalesce((
			select jsonb_agg(jsonb_build_object('codigo', codigo, 'funcao', funcao)) from public.certificado where email = (select email from eu)
		), '[]'),
		'credenciais', coalesce((
			select jsonb_agg(jsonb_build_object('tipo', tipo, 'criada_em', criada_em, 'revogada', revogada))
			from public.credencial where email = (select email from eu)
		), '[]')
	);
$$;

create table public.pedido_exclusao (
	id uuid primary key default gen_random_uuid(),
	pessoa_id uuid references public.pessoa on delete set null,
	nome text not null, -- para a secretaria saber de quem era, depois de apagado
	criado_em timestamptz not null default now(),
	atendido_em timestamptz
);
create unique index um_pedido_aberto on public.pedido_exclusao (pessoa_id) where atendido_em is null;

-- A secretaria do evento de uma pessoa.
create function public.secretaria_da_pessoa(p_pessoa uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.participacao eu
		join public.participacao outra on outra.evento_id = eu.evento_id
		where eu.pessoa_id = auth.uid() and eu.papel = 'secretaria' and outra.pessoa_id = p_pessoa
	);
$$;

alter table public.pedido_exclusao enable row level security;
create policy "o próprio pedido e a secretaria" on public.pedido_exclusao
	for select to authenticated
	using (pessoa_id = (select auth.uid()) or (pessoa_id is not null and public.secretaria_da_pessoa(pessoa_id)));

create function public.pedir_exclusao()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	insert into public.pedido_exclusao (pessoa_id, nome)
	values (auth.uid(), (select nome from public.pessoa where id = auth.uid()));
exception when unique_violation then
	raise exception 'Seu pedido já está com a secretaria.' using errcode = '23505';
end $$;

-- A secretaria apaga a conta de uma pessoa (a pedido dela). Os textos públicos ficam,
-- sem o autor; o certificado fica, sem o e-mail. As fotos saem antes, pela API do Storage.
create function public.apagar_pessoa(p_pessoa uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_email text := (select lower(email) from auth.users where id = p_pessoa);
	v_evento uuid := (select evento_id from public.participacao where pessoa_id = p_pessoa limit 1);
begin
	if not public.secretaria_da_pessoa(p_pessoa) or p_pessoa = auth.uid() then
		raise exception 'Só a secretaria do evento apaga a conta de outra pessoa.' using errcode = '42501';
	end if;
	insert into public.registro (evento_id, pessoa_id, acao, detalhe) values (v_evento, auth.uid(), 'apagar_dados', 'conta de uma pessoa');
	update public.pedido_exclusao set atendido_em = now() where pessoa_id = p_pessoa and atendido_em is null;
	delete from public.convite where lower(email) = v_email;
	delete from public.credencial where email = v_email;
	delete from public.checkin where email = v_email;
	update public.certificado set email = codigo where email = v_email;
	delete from auth.users where id = p_pessoa;
end $$;

-- 3. Exclusão no prazo: tudo o que é pessoal sai do evento; ficam os documentos
-- públicos (resoluções, working papers aprovados, DPOs aprovados, cartas públicas,
-- notícias publicadas, atualizações de crise, agenda) e os certificados.

-- As fotos de perfil das contas que a exclusão vai apagar (a tela as apaga pelo Storage).
create function public.fotos_do_evento(p_evento uuid)
returns setof text
language sql stable security definer set search_path = ''
as $$
	select p.foto_path from public.pessoa p
	where p.foto_path is not null and p.id <> auth.uid() and public.eh_secretaria(p_evento)
		and exists (select 1 from public.participacao where pessoa_id = p.id and evento_id = p_evento)
		and not exists (select 1 from public.participacao where pessoa_id = p.id and evento_id <> p_evento);
$$;

create policy "fotos: a secretaria apaga as do evento" on storage.objects
	for delete to authenticated
	using (bucket_id = 'fotos' and public.secretaria_da_pessoa(((storage.foldername(name))[1])::uuid));

create function public.apagar_dados_pessoais(p_evento uuid)
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
	delete from public.dpo where comite_id = any (v_comites) and status <> 'aprovado';
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

-- 4. Pesquisa de satisfação: anônima (a resposta não guarda quem respondeu), uma por pessoa

create table public.pesquisa_resposta (
	id uuid primary key default gen_random_uuid(),
	evento_id uuid not null references public.evento on delete cascade,
	papel public.papel not null,
	nota int not null check (nota between 1 and 5),
	respostas jsonb not null default '{}',
	criado_em timestamptz not null default now()
);
create table public.pesquisa_respondida (
	evento_id uuid not null references public.evento on delete cascade,
	pessoa_id uuid not null references public.pessoa on delete cascade,
	primary key (evento_id, pessoa_id)
);

alter table public.pesquisa_resposta enable row level security;
alter table public.pesquisa_respondida enable row level security;
create policy "a secretaria lê as respostas" on public.pesquisa_resposta
	for select to authenticated using (public.eh_secretaria(evento_id));
create policy "cada um sabe se já respondeu" on public.pesquisa_respondida
	for select to authenticated using (pessoa_id = (select auth.uid()));

create function public.responder_pesquisa(p_evento uuid, p_papel public.papel, p_nota int, p_respostas jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	if not exists (select 1 from public.participacao where pessoa_id = auth.uid() and evento_id = p_evento and papel = p_papel) then
		raise exception 'Responda pela sua função no evento.' using errcode = '42501';
	end if;
	insert into public.pesquisa_respondida (evento_id, pessoa_id) values (p_evento, auth.uid());
	insert into public.pesquisa_resposta (evento_id, papel, nota, respostas) values (p_evento, p_papel, p_nota, coalesce(p_respostas, '{}'));
exception when unique_violation then
	raise exception 'Você já respondeu a pesquisa. Obrigado!' using errcode = '23505';
end $$;

-- 5. Arquivo da edição: os dados públicos em JSON

create function public.arquivo_publico(p_evento uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
	perform public.exigir_secretaria(p_evento);
	return jsonb_build_object(
		'evento', (select jsonb_build_object('nome', nome, 'ano', ano) from public.evento where id = p_evento),
		'comites', coalesce((
			select jsonb_agg(jsonb_build_object(
				'sigla', c.sigla, 'nome', c.nome, 'nome_oficial', c.nome_oficial, 'topicos', c.topicos,
				'regras', public.regras(c.id),
				'delegacoes', (select jsonb_agg(jsonb_build_object('nome', d.nome, 'situacao', d.situacao) order by d.nome)
					from public.delegacao d where d.comite_id = c.id),
				'agenda', (select jsonb_agg(jsonb_build_object('texto', pp.texto, 'ordem', pp.ordem) order by pp.ordem)
					from public.ponto_pauta pp join public.proposta_agenda pa on pa.id = pp.proposta_id
					where pp.comite_id = c.id and pa.adotada),
				'resolucoes', (select jsonb_agg(jsonb_build_object(
						'tipo', doc.tipo, 'numero', doc.numero, 'titulo', doc.titulo, 'status', doc.status,
						'clausulas', (select jsonb_agg(jsonb_build_object('tipo', cl.tipo, 'texto', cl.texto) order by cl.ordem)
							from public.clausula cl where cl.documento_id = doc.id)
					) order by doc.numero)
					from public.documento doc where doc.comite_id = c.id and doc.tipo <> 'working_paper' and doc.status = 'aprovado'),
				'noticias', (select jsonb_agg(jsonb_build_object('titulo', n.titulo, 'linha_fina', n.linha_fina, 'texto', n.texto, 'publicada_em', n.publicada_em) order by n.publicada_em)
					from public.noticia n where n.comite_id = c.id and n.status = 'publicada')
			) order by c.sigla)
			from public.comite c where c.evento_id = p_evento
		), '[]'),
		'atualizacoes_de_crise', coalesce((
			select jsonb_agg(jsonb_build_object('texto', texto, 'publicada_em', publicada_em) order by publicada_em)
			from public.atualizacao_crise where evento_id = p_evento
		), '[]')
	);
end $$;

-- 6. Modelos para a próxima edição: comitês, regras, delegações e veículos

create function public.copiar_evento(p_origem uuid, p_nome text, p_ano int)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_novo uuid;
	c record;
	v_comite uuid;
begin
	perform public.exigir_secretaria(p_origem);
	insert into public.evento (nome, ano, regras_padrao)
	select trim(p_nome), p_ano, regras_padrao from public.evento where id = p_origem
	returning id into v_novo;
	for c in select * from public.comite where evento_id = p_origem loop
		insert into public.comite (evento_id, sigla, nome, nome_oficial, idioma, crise_ligada, tecnologia_restrita, topicos, guia_url, regras)
		values (v_novo, c.sigla, c.nome, c.nome_oficial, c.idioma, c.crise_ligada, c.tecnologia_restrita, c.topicos, c.guia_url, c.regras)
		returning id into v_comite;
		insert into public.delegacao (comite_id, nome, nome_oficial, bandeira, situacao)
		select v_comite, nome, nome_oficial, bandeira, situacao from public.delegacao where comite_id = c.id;
		insert into public.veiculo (comite_id, nome, linha_editorial)
		select v_comite, nome, linha_editorial from public.veiculo where comite_id = c.id;
	end loop;
	-- Quem copiou é a secretaria do evento novo.
	insert into public.participacao (pessoa_id, evento_id, papel) values (auth.uid(), v_novo, 'secretaria');
	return v_novo;
end $$;

-- Permissões

revoke execute on function public.registrar_papel(), public.registrar_resposta_nota() from public, anon, authenticated;
revoke execute on function
	public.meus_dados(), public.secretaria_da_pessoa(uuid), public.pedir_exclusao(), public.apagar_pessoa(uuid),
	public.fotos_do_evento(uuid), public.apagar_dados_pessoais(uuid), public.responder_pesquisa(uuid, public.papel, int, jsonb),
	public.arquivo_publico(uuid), public.copiar_evento(uuid, text, int)
from public, anon;
grant execute on function
	public.meus_dados(), public.secretaria_da_pessoa(uuid), public.pedir_exclusao(), public.apagar_pessoa(uuid),
	public.fotos_do_evento(uuid), public.apagar_dados_pessoais(uuid), public.responder_pesquisa(uuid, public.papel, int, jsonb),
	public.arquivo_publico(uuid), public.copiar_evento(uuid, text, int)
to authenticated;
