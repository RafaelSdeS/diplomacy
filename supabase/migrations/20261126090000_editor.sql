-- Passo 09: editor de resoluções. Blocos com redator; working papers, projetos e
-- resoluções de crise em cláusulas; propostas de alteração e comentários por
-- cláusula; cláusula acordada travada; rodadas com fim; assinaturas e envio à mesa.
-- Como nos passos anteriores, toda escrita passa por funções que checam quem pode.

create table public.bloco (
	id uuid primary key default gen_random_uuid(),
	comite_id uuid not null references public.comite on delete cascade,
	nome text not null check (char_length(nome) between 1 and 80), -- pode ser "Aliança dos Estados do Sahel"
	criado_em timestamptz not null default clock_timestamp(),
	unique (id, comite_id),
	unique (comite_id, nome)
);

create table public.bloco_membro (
	bloco_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid not null,
	redator boolean not null default false,
	primary key (bloco_id, delegacao_id),
	foreign key (bloco_id, comite_id) references public.bloco (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);

create table public.documento (
	id uuid primary key default gen_random_uuid(),
	comite_id uuid not null,
	bloco_id uuid not null,
	tipo text not null check (tipo in ('working_paper', 'projeto', 'resolucao_crise')),
	numero int, -- dado no envio à mesa, por tipo e comitê
	titulo text not null check (char_length(titulo) between 1 and 200),
	topico int check (topico > 0),
	ponto_pauta_id uuid references public.ponto_pauta on delete set null, -- subtópico do working paper
	atualizacao_crise_id uuid references public.atualizacao_crise on delete set null,
	status text not null default 'rascunho'
		check (status in ('rascunho', 'enviado', 'aprovado_mesa', 'em_votacao', 'aprovado', 'rejeitado')),
	aprovacao text check (aprovacao in ('consenso', 'votacao')), -- projeto: escolhida no envio
	clausula_em_foco_id uuid,
	max_rodadas int not null default 3 check (max_rodadas between 1 and 10),
	criado_em timestamptz not null default clock_timestamp(),
	unique (id, comite_id),
	foreign key (bloco_id, comite_id) references public.bloco (id, comite_id) on delete cascade
);
create index on public.documento (comite_id);

create table public.clausula (
	id uuid primary key default gen_random_uuid(),
	documento_id uuid not null,
	comite_id uuid not null,
	tipo text not null check (tipo in ('preambular', 'operativa', 'subitem', 'texto')), -- texto: bloco livre do working paper
	pai_id uuid references public.clausula on delete cascade,
	ordem numeric not null,
	texto text not null check (char_length(texto) between 1 and 2000),
	status text not null default 'proposta' check (status in ('proposta', 'em_discussao', 'acordada')),
	versao int not null default 1,
	origem_id uuid references public.clausula on delete set null, -- de onde veio, na fusão
	atualizado_em timestamptz not null default clock_timestamp(),
	foreign key (documento_id, comite_id) references public.documento (id, comite_id) on delete cascade,
	check ((tipo = 'subitem') = (pai_id is not null))
);
create index on public.clausula (documento_id, ordem);

alter table public.documento add foreign key (clausula_em_foco_id) references public.clausula on delete set null;

create table public.proposta_alteracao (
	id uuid primary key default gen_random_uuid(),
	clausula_id uuid not null references public.clausula on delete cascade,
	documento_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid not null,
	texto_novo text not null check (char_length(texto_novo) between 1 and 2000),
	status text not null default 'aberta' check (status in ('aberta', 'aceita', 'recusada')),
	criado_em timestamptz not null default clock_timestamp(),
	foreign key (documento_id, comite_id) references public.documento (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);

create table public.comentario (
	id uuid primary key default gen_random_uuid(),
	clausula_id uuid not null references public.clausula on delete cascade,
	documento_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid,
	autor_id uuid references public.pessoa on delete set null,
	texto text not null check (char_length(texto) between 1 and 1000),
	estacionado boolean not null default false, -- fora do foco, para voltar depois
	criado_em timestamptz not null default clock_timestamp(),
	foreign key (documento_id, comite_id) references public.documento (id, comite_id) on delete cascade
);

-- Reabrir uma cláusula acordada exige o pedido de várias delegações (regra do comitê).
create table public.pedido_reabertura (
	clausula_id uuid not null references public.clausula on delete cascade,
	delegacao_id uuid not null,
	comite_id uuid not null,
	primary key (clausula_id, delegacao_id),
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);

create table public.rodada (
	documento_id uuid not null,
	comite_id uuid not null,
	numero int not null,
	inicio timestamptz not null default clock_timestamp(),
	fim timestamptz not null,
	primary key (documento_id, numero),
	foreign key (documento_id, comite_id) references public.documento (id, comite_id) on delete cascade
);

create table public.assinatura (
	documento_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid not null,
	criado_em timestamptz not null default clock_timestamp(),
	primary key (documento_id, delegacao_id),
	foreign key (documento_id, comite_id) references public.documento (id, comite_id) on delete cascade,
	foreign key (delegacao_id, comite_id) references public.delegacao (id, comite_id) on delete cascade
);

-- Leitura

create function public.sou_do_bloco(p_bloco uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.bloco_membro m
		where m.bloco_id = p_bloco and m.delegacao_id = public.minha_delegacao(m.comite_id)
	);
$$;

create function public.sou_redator(p_bloco uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.bloco_membro m
		where m.bloco_id = p_bloco and m.redator and m.delegacao_id = public.minha_delegacao(m.comite_id)
	);
$$;

-- O bloco vê os próprios documentos; a mesa, tudo o que foi enviado; o comitê,
-- o que a mesa aprovou (um working paper só pode ser mencionado depois disso).
create function public.pode_ver_documento(p_documento uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.documento d
		where d.id = p_documento and (
			public.sou_do_bloco(d.bloco_id)
			or (d.status <> 'rascunho' and public.tem_papel(d.comite_id, '{mesa}'))
			or (d.status not in ('rascunho', 'enviado') and public.participa_do_comite(d.comite_id))
		)
	);
$$;

alter table public.bloco enable row level security;
alter table public.bloco_membro enable row level security;
alter table public.documento enable row level security;
alter table public.clausula enable row level security;
alter table public.proposta_alteracao enable row level security;
alter table public.comentario enable row level security;
alter table public.pedido_reabertura enable row level security;
alter table public.rodada enable row level security;
alter table public.assinatura enable row level security;

create policy "quem está no comitê vê os blocos" on public.bloco
	for select to authenticated using (public.participa_do_comite(comite_id));
create policy "quem está no comitê vê quem está em cada bloco" on public.bloco_membro
	for select to authenticated using (public.participa_do_comite(comite_id));
create policy "documento: bloco, mesa depois do envio, comitê depois da aprovação" on public.documento
	for select to authenticated using (public.pode_ver_documento(id));
create policy "cláusulas de quem vê o documento" on public.clausula
	for select to authenticated using (public.pode_ver_documento(documento_id));
create policy "propostas de quem vê o documento" on public.proposta_alteracao
	for select to authenticated using (public.pode_ver_documento(documento_id));
create policy "comentários de quem vê o documento" on public.comentario
	for select to authenticated using (public.pode_ver_documento(documento_id));
create policy "pedidos de reabertura de quem vê o documento" on public.pedido_reabertura
	for select to authenticated
	using (public.pode_ver_documento((select documento_id from public.clausula c where c.id = clausula_id)));
create policy "rodadas de quem vê o documento" on public.rodada
	for select to authenticated using (public.pode_ver_documento(documento_id));
create policy "assinaturas de quem vê o documento" on public.assinatura
	for select to authenticated using (public.pode_ver_documento(documento_id));

-- Funções internas

-- O documento ainda aceita mudanças: rascunho, e sem ter passado da última rodada.
create function public.exigir_editavel(p_documento uuid)
returns public.documento
language plpgsql stable security definer set search_path = ''
as $$
declare
	d public.documento;
begin
	select * into d from public.documento where id = p_documento;
	if d.id is null then
		raise exception 'Documento não encontrado.' using errcode = 'P0002';
	end if;
	if d.status <> 'rascunho' then
		raise exception 'O documento já foi enviado à mesa e não muda mais (só por emenda).';
	end if;
	if (select count(*) from public.rodada where documento_id = d.id) >= d.max_rodadas
		and (select max(fim) from public.rodada where documento_id = d.id) <= clock_timestamp() then
		raise exception 'As rodadas terminaram: o documento só pode ser enviado à mesa.';
	end if;
	return d;
end $$;

create function public.exigir_redator(p_bloco uuid)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
	if not public.sou_redator(p_bloco) then
		raise exception 'Só o redator do bloco altera o texto. Os outros membros propõem alterações.' using errcode = '42501';
	end if;
end $$;

create function public.exigir_membro(p_bloco uuid)
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.minha_delegacao((select comite_id from public.bloco where id = p_bloco));
begin
	if v_delegacao is null or not public.sou_do_bloco(p_bloco) then
		raise exception 'Só as delegações do bloco fazem isso.' using errcode = '42501';
	end if;
	return v_delegacao;
end $$;

-- Blocos

create function public.criar_bloco(p_comite uuid, p_nome text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.minha_delegacao(p_comite);
	v_bloco uuid;
begin
	if v_delegacao is null then
		raise exception 'Só delegados do comitê criam blocos.' using errcode = '42501';
	end if;
	insert into public.bloco (comite_id, nome) values (p_comite, trim(p_nome)) returning id into v_bloco;
	-- Quem cria entra como redator.
	insert into public.bloco_membro (bloco_id, comite_id, delegacao_id, redator) values (v_bloco, p_comite, v_delegacao, true);
	return v_bloco;
exception when unique_violation then
	raise exception 'Já existe um bloco com esse nome.' using errcode = '23505';
end $$;

create function public.entrar_bloco(p_bloco uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_comite uuid := (select comite_id from public.bloco where id = p_bloco);
	v_delegacao uuid := public.minha_delegacao(v_comite);
begin
	if v_delegacao is null then
		raise exception 'Só delegados do comitê entram em blocos.' using errcode = '42501';
	end if;
	insert into public.bloco_membro (bloco_id, comite_id, delegacao_id) values (p_bloco, v_comite, v_delegacao)
	on conflict do nothing;
end $$;

create function public.sair_bloco(p_bloco uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.exigir_membro(p_bloco);
begin
	delete from public.bloco_membro where bloco_id = p_bloco and delegacao_id = v_delegacao;
end $$;

-- O redator passa (ou divide) a redação com outra delegação do bloco.
create function public.definir_redator(p_bloco uuid, p_delegacao uuid, p_redator boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_redator(p_bloco);
	update public.bloco_membro set redator = p_redator where bloco_id = p_bloco and delegacao_id = p_delegacao;
	if not exists (select 1 from public.bloco_membro where bloco_id = p_bloco and redator) then
		raise exception 'O bloco precisa de pelo menos um redator.';
	end if;
end $$;

-- Documentos

create function public.criar_documento(
	p_bloco uuid, p_tipo text, p_titulo text, p_topico int default null,
	p_ponto_pauta uuid default null, p_atualizacao uuid default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.exigir_membro(p_bloco);
	v_comite uuid := (select comite_id from public.bloco where id = p_bloco);
	v_id uuid;
begin
	-- Observadoras apresentam working papers, mas não projetos.
	if p_tipo <> 'working_paper'
		and (select situacao from public.delegacao where id = v_delegacao) <> 'membro' then
		raise exception 'Delegação observadora apresenta só working papers.';
	end if;
	insert into public.documento (comite_id, bloco_id, tipo, titulo, topico, ponto_pauta_id, atualizacao_crise_id)
	values (v_comite, p_bloco, p_tipo, trim(p_titulo), p_topico, p_ponto_pauta, p_atualizacao)
	returning id into v_id;
	return v_id;
end $$;

create function public.adicionar_clausula(p_documento uuid, p_tipo text, p_texto text, p_pai uuid default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := public.exigir_editavel(p_documento);
	v_id uuid;
begin
	perform public.exigir_redator(d.bloco_id);
	insert into public.clausula (documento_id, comite_id, tipo, pai_id, ordem, texto)
	values (
		d.id, d.comite_id, p_tipo, p_pai,
		coalesce((select max(ordem) from public.clausula where documento_id = d.id), 0) + 1,
		trim(p_texto)
	)
	returning id into v_id;
	return v_id;
end $$;

-- Concorrência: o redator edita a versão que viu. Se outra pessoa mudou antes,
-- nada muda e o app recarrega a cláusula.
create function public.editar_clausula(p_clausula uuid, p_texto text, p_versao int)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
	c public.clausula;
	d public.documento;
	v_versao int;
begin
	select * into c from public.clausula where id = p_clausula;
	d := public.exigir_editavel(c.documento_id);
	perform public.exigir_redator(d.bloco_id);
	if c.status = 'acordada' then
		raise exception 'Cláusula acordada não muda. Para reabrir, várias delegações precisam pedir.';
	end if;
	update public.clausula set texto = trim(p_texto), versao = versao + 1, atualizado_em = clock_timestamp()
	where id = p_clausula and versao = p_versao
	returning versao into v_versao;
	if v_versao is null then
		raise exception 'Outra pessoa alterou esta cláusula antes. A versão nova foi carregada.' using errcode = '40001';
	end if;
	return v_versao;
end $$;

create function public.remover_clausula(p_clausula uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	c public.clausula := (select x from public.clausula x where x.id = p_clausula);
	d public.documento := public.exigir_editavel(c.documento_id);
begin
	perform public.exigir_redator(d.bloco_id);
	if c.status = 'acordada' then
		raise exception 'Cláusula acordada não sai do texto.';
	end if;
	delete from public.clausula where id = p_clausula;
end $$;

-- Sobe ou desce uma cláusula entre as irmãs (mesmo pai).
create function public.mover_clausula(p_clausula uuid, p_para_cima boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	c public.clausula := (select x from public.clausula x where x.id = p_clausula);
	d public.documento := public.exigir_editavel(c.documento_id);
	vizinha public.clausula;
begin
	perform public.exigir_redator(d.bloco_id);
	select * into vizinha from public.clausula
	where documento_id = c.documento_id and pai_id is not distinct from c.pai_id
		and case when p_para_cima then ordem < c.ordem else ordem > c.ordem end
	order by case when p_para_cima then -ordem else ordem end
	limit 1;
	if vizinha.id is null then
		return;
	end if;
	update public.clausula set ordem = vizinha.ordem where id = c.id;
	update public.clausula set ordem = c.ordem where id = vizinha.id;
end $$;

create function public.marcar_clausula(p_clausula uuid, p_status text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	c public.clausula := (select x from public.clausula x where x.id = p_clausula);
	d public.documento := public.exigir_editavel(c.documento_id);
begin
	perform public.exigir_redator(d.bloco_id);
	if c.status = 'acordada' then
		raise exception 'Cláusula acordada só reabre com o pedido de várias delegações.';
	end if;
	update public.clausula set status = p_status, atualizado_em = clock_timestamp() where id = p_clausula;
end $$;

-- Reabrir uma cláusula acordada: cada delegação do bloco pede uma vez; com o mínimo
-- de pedidos das regras, ela volta à discussão.
create function public.pedir_reabertura(p_clausula uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	c public.clausula := (select x from public.clausula x where x.id = p_clausula);
	d public.documento := public.exigir_editavel(c.documento_id);
	v_delegacao uuid := public.exigir_membro(d.bloco_id);
	v_minimo int := (public.regras(d.comite_id) ->> 'reabrir_clausula_min_delegacoes')::int;
begin
	if c.status <> 'acordada' then
		raise exception 'Só uma cláusula acordada precisa ser reaberta.';
	end if;
	perform 1 from public.clausula where id = p_clausula for update;
	insert into public.pedido_reabertura (clausula_id, delegacao_id, comite_id)
	values (p_clausula, v_delegacao, d.comite_id)
	on conflict do nothing;
	if (select count(*) from public.pedido_reabertura where clausula_id = p_clausula) >= v_minimo then
		update public.clausula set status = 'em_discussao', atualizado_em = clock_timestamp() where id = p_clausula;
		delete from public.pedido_reabertura where clausula_id = p_clausula;
	end if;
end $$;

create function public.focar_clausula(p_documento uuid, p_clausula uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := public.exigir_editavel(p_documento);
begin
	perform public.exigir_redator(d.bloco_id);
	update public.documento set clausula_em_foco_id = p_clausula where id = p_documento;
end $$;

-- Propostas e comentários

create function public.propor_alteracao(p_clausula uuid, p_texto text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	c public.clausula := (select x from public.clausula x where x.id = p_clausula);
	d public.documento := public.exigir_editavel(c.documento_id);
	v_delegacao uuid := public.exigir_membro(d.bloco_id);
begin
	if c.status = 'acordada' then
		raise exception 'Cláusula acordada não recebe propostas. Peça a reabertura.';
	end if;
	insert into public.proposta_alteracao (clausula_id, documento_id, comite_id, delegacao_id, texto_novo)
	values (p_clausula, d.id, d.comite_id, v_delegacao, trim(p_texto));
end $$;

-- O redator aceita (o texto da cláusula vira o proposto) ou recusa.
create function public.responder_proposta(p_proposta uuid, p_aceitar boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	p public.proposta_alteracao := (select x from public.proposta_alteracao x where x.id = p_proposta);
	d public.documento := public.exigir_editavel(p.documento_id);
begin
	perform public.exigir_redator(d.bloco_id);
	if p.status <> 'aberta' then
		raise exception 'Esta proposta já foi respondida.';
	end if;
	if p_aceitar then
		if (select status from public.clausula where id = p.clausula_id) = 'acordada' then
			raise exception 'Cláusula acordada não muda.';
		end if;
		update public.clausula set texto = p.texto_novo, versao = versao + 1, atualizado_em = clock_timestamp()
		where id = p.clausula_id;
	end if;
	update public.proposta_alteracao set status = case when p_aceitar then 'aceita' else 'recusada' end
	where id = p_proposta;
end $$;

create function public.comentar(p_clausula uuid, p_texto text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	c public.clausula := (select x from public.clausula x where x.id = p_clausula);
	d public.documento := (select x from public.documento x where x.id = c.documento_id);
	v_delegacao uuid := public.exigir_membro(d.bloco_id);
begin
	insert into public.comentario (clausula_id, documento_id, comite_id, delegacao_id, autor_id, texto)
	values (p_clausula, d.id, d.comite_id, v_delegacao, auth.uid(), trim(p_texto));
end $$;

create function public.estacionar_comentario(p_comentario uuid, p_estacionado boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_redator((select d.bloco_id from public.comentario c join public.documento d on d.id = c.documento_id
		where c.id = p_comentario));
	update public.comentario set estacionado = p_estacionado where id = p_comentario;
end $$;

-- Rodadas: a próxima só abre quando a anterior terminou, até o máximo.
create function public.abrir_rodada(p_documento uuid, p_minutos int)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := public.exigir_editavel(p_documento);
	v_feitas int := (select count(*) from public.rodada where documento_id = p_documento);
begin
	perform public.exigir_redator(d.bloco_id);
	if p_minutos not between 1 and 120 then
		raise exception 'Uma rodada dura de 1 a 120 minutos.' using errcode = '22023';
	end if;
	if exists (select 1 from public.rodada where documento_id = p_documento and fim > clock_timestamp()) then
		raise exception 'A rodada atual ainda não terminou.';
	end if;
	if v_feitas >= d.max_rodadas then
		raise exception 'O documento já teve as % rodadas.', d.max_rodadas;
	end if;
	insert into public.rodada (documento_id, comite_id, numero, fim)
	values (p_documento, d.comite_id, v_feitas + 1, clock_timestamp() + make_interval(mins => p_minutos));
end $$;

-- Fusão: traz cláusulas de outros documentos (que a pessoa vê) para este,
-- guardando a origem de cada uma.
create function public.importar_clausulas(p_documento uuid, p_clausulas uuid[])
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := public.exigir_editavel(p_documento);
	c public.clausula;
	v_ordem numeric := coalesce((select max(ordem) from public.clausula where documento_id = p_documento), 0);
begin
	perform public.exigir_redator(d.bloco_id);
	for c in
		select * from public.clausula where id = any (p_clausulas) and tipo <> 'subitem' order by documento_id, ordem
	loop
		if c.comite_id <> d.comite_id or not public.pode_ver_documento(c.documento_id) then
			raise exception 'Só dá para trazer cláusulas de documentos do comitê que você vê.' using errcode = '42501';
		end if;
		v_ordem := v_ordem + 1;
		insert into public.clausula (documento_id, comite_id, tipo, ordem, texto, origem_id)
		values (p_documento, d.comite_id, case when c.tipo = 'texto' then 'operativa' else c.tipo end, v_ordem, c.texto, c.id);
	end loop;
end $$;

-- Assinaturas e envio

create function public.assinar(p_documento uuid, p_assinar boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
	v_delegacao uuid := public.exigir_membro(d.bloco_id);
begin
	if d.status <> 'rascunho' then
		raise exception 'Depois do envio, as assinaturas não mudam.';
	end if;
	if p_assinar then
		insert into public.assinatura (documento_id, comite_id, delegacao_id) values (d.id, d.comite_id, v_delegacao)
		on conflict do nothing;
	else
		delete from public.assinatura where documento_id = d.id and delegacao_id = v_delegacao;
	end if;
end $$;

-- O redator envia à mesa. O projeto precisa do mínimo de signatários e da forma
-- de aprovação (consenso ou votação). No envio o documento ganha número e trava.
create function public.enviar_documento(p_documento uuid, p_aprovacao text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
	v_minimo int;
begin
	perform public.exigir_redator(d.bloco_id);
	if d.status <> 'rascunho' then
		raise exception 'O documento já foi enviado.';
	end if;
	if not exists (select 1 from public.clausula where documento_id = d.id) then
		raise exception 'O documento está vazio.';
	end if;
	if d.tipo <> 'working_paper' then
		v_minimo := (public.regras(d.comite_id) ->> 'assinaturas_projeto_min')::int;
		if (select count(*) from public.assinatura where documento_id = d.id) < v_minimo then
			raise exception 'O projeto precisa de pelo menos % signatários.', v_minimo;
		end if;
		if p_aprovacao is null then
			raise exception 'Escolha a aprovação: por consenso ou por votação.' using errcode = '22023';
		end if;
	end if;
	update public.documento set
		status = 'enviado',
		aprovacao = case when d.tipo = 'working_paper' then null else p_aprovacao end,
		clausula_em_foco_id = null,
		numero = coalesce((select max(numero) from public.documento where comite_id = d.comite_id and tipo = d.tipo), 0) + 1
	where id = d.id;
end $$;

-- A mesa aprova (o comitê passa a ver o documento) ou devolve ao bloco.
create function public.aprovar_documento(p_documento uuid, p_aprovar boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
begin
	perform public.exigir_mesa(d.comite_id);
	if d.status <> 'enviado' then
		raise exception 'Só um documento enviado espera a mesa.';
	end if;
	update public.documento set status = case when p_aprovar then 'aprovado_mesa' else 'rascunho' end where id = d.id;
end $$;

-- Permissões

revoke execute on function
	public.exigir_editavel(uuid), public.exigir_redator(uuid), public.exigir_membro(uuid)
from public, anon, authenticated;

revoke execute on function
	public.sou_do_bloco(uuid), public.sou_redator(uuid), public.pode_ver_documento(uuid),
	public.criar_bloco(uuid, text), public.entrar_bloco(uuid), public.sair_bloco(uuid),
	public.definir_redator(uuid, uuid, boolean), public.criar_documento(uuid, text, text, int, uuid, uuid),
	public.adicionar_clausula(uuid, text, text, uuid), public.editar_clausula(uuid, text, int),
	public.remover_clausula(uuid), public.mover_clausula(uuid, boolean), public.marcar_clausula(uuid, text),
	public.pedir_reabertura(uuid), public.focar_clausula(uuid, uuid), public.propor_alteracao(uuid, text),
	public.responder_proposta(uuid, boolean), public.comentar(uuid, text), public.estacionar_comentario(uuid, boolean),
	public.abrir_rodada(uuid, int), public.importar_clausulas(uuid, uuid[]), public.assinar(uuid, boolean),
	public.enviar_documento(uuid, text), public.aprovar_documento(uuid, boolean)
from public, anon;

grant execute on function
	public.sou_do_bloco(uuid), public.sou_redator(uuid), public.pode_ver_documento(uuid),
	public.criar_bloco(uuid, text), public.entrar_bloco(uuid), public.sair_bloco(uuid),
	public.definir_redator(uuid, uuid, boolean), public.criar_documento(uuid, text, text, int, uuid, uuid),
	public.adicionar_clausula(uuid, text, text, uuid), public.editar_clausula(uuid, text, int),
	public.remover_clausula(uuid), public.mover_clausula(uuid, boolean), public.marcar_clausula(uuid, text),
	public.pedir_reabertura(uuid), public.focar_clausula(uuid, uuid), public.propor_alteracao(uuid, text),
	public.responder_proposta(uuid, boolean), public.comentar(uuid, text), public.estacionar_comentario(uuid, boolean),
	public.abrir_rodada(uuid, int), public.importar_clausulas(uuid, uuid[]), public.assinar(uuid, boolean),
	public.enviar_documento(uuid, text), public.aprovar_documento(uuid, boolean)
to authenticated;

alter publication supabase_realtime add table
	public.documento, public.clausula, public.proposta_alteracao, public.comentario, public.assinatura, public.rodada,
	public.pedido_reabertura, public.bloco_membro;
