-- Passo 57 (parte A): escrever documentos sem atrito. A posição num toque em cada cláusula
-- (apoio, ressalva ou contra), uma por delegação, que pode mudar; a mesa também (delegacao_id
-- nulo). O comentário tem autor à vista, é curto (280, só para os novos) e o redator o
-- resolve. A cláusula nova entra onde se quer, e mover respeita o tipo (preambular antes de
-- operativa, subitem dentro da operativa).

create table public.posicao_clausula (
	clausula_id uuid not null references public.clausula on delete cascade,
	documento_id uuid not null,
	comite_id uuid not null,
	delegacao_id uuid, -- nulo: a mesa
	posicao text not null check (posicao in ('apoio', 'ressalva', 'contra')),
	autor_id uuid references public.pessoa on delete set null,
	atualizado_em timestamptz not null default clock_timestamp(),
	unique nulls not distinct (clausula_id, delegacao_id),
	foreign key (documento_id, comite_id) references public.documento (id, comite_id) on delete cascade
);
alter table public.posicao_clausula enable row level security;
create policy "posições de quem vê o documento" on public.posicao_clausula
	for select to authenticated using (public.pode_ver_documento(documento_id));
create trigger transmitir after insert or update or delete on public.posicao_clausula
	for each row execute function public.transmitir('documento', 'documento_id');

alter table public.comentario add column resolvido boolean not null default false;

-- Quem fala no documento: a delegação do bloco ou, sem ela, a mesa do comitê (nulo).
create function public.voz_no_documento(p_documento uuid)
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
begin
	if public.sou_do_bloco(d.bloco_id) then
		return public.minha_delegacao(d.comite_id);
	end if;
	if public.tem_papel(d.comite_id, '{mesa}') and public.pode_ver_documento(d.id) then
		return null;
	end if;
	raise exception 'Só as delegações do bloco e a mesa fazem isso.' using errcode = '42501';
end $$;

create function public.marcar_posicao(p_clausula uuid, p_posicao text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	c public.clausula := (select x from public.clausula x where x.id = p_clausula);
	v_delegacao uuid := public.voz_no_documento(c.documento_id);
begin
	if p_posicao is null then
		delete from public.posicao_clausula where clausula_id = p_clausula and delegacao_id is not distinct from v_delegacao;
		return;
	end if;
	insert into public.posicao_clausula (clausula_id, documento_id, comite_id, delegacao_id, posicao, autor_id)
	values (p_clausula, c.documento_id, c.comite_id, v_delegacao, p_posicao, auth.uid())
	on conflict (clausula_id, delegacao_id) do update
		set posicao = excluded.posicao, autor_id = excluded.autor_id, atualizado_em = clock_timestamp();
end $$;

create or replace function public.comentar(p_clausula uuid, p_texto text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	c public.clausula := (select x from public.clausula x where x.id = p_clausula);
	v_delegacao uuid := public.voz_no_documento(c.documento_id);
begin
	if char_length(trim(p_texto)) not between 1 and 280 then
		raise exception 'O comentário tem até 280 caracteres.' using errcode = '22023';
	end if;
	insert into public.comentario (clausula_id, documento_id, comite_id, delegacao_id, autor_id, texto)
	values (p_clausula, c.documento_id, c.comite_id, v_delegacao, auth.uid(), trim(p_texto));
end $$;

create function public.resolver_comentario(p_comentario uuid, p_resolvido boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_redator((select d.bloco_id from public.comentario c join public.documento d on d.id = c.documento_id
		where c.id = p_comentario));
	update public.comentario set resolvido = p_resolvido where id = p_comentario;
end $$;

-- A cláusula nova entra depois de p_depois (ou no fim): as seguintes descem uma posição.
drop function public.adicionar_clausula(uuid, text, text, uuid);
create function public.adicionar_clausula(p_documento uuid, p_tipo text, p_texto text, p_pai uuid default null, p_depois uuid default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := public.exigir_editavel(p_documento);
	v_ordem int := (select ordem from public.clausula where id = p_depois and documento_id = p_documento);
	v_id uuid;
begin
	perform public.exigir_redator(d.bloco_id);
	if v_ordem is null then
		v_ordem := coalesce((select max(ordem) from public.clausula where documento_id = d.id), 0);
	else
		update public.clausula set ordem = ordem + 1 where documento_id = d.id and ordem > v_ordem;
	end if;
	insert into public.clausula (documento_id, comite_id, tipo, pai_id, ordem, texto)
	values (d.id, d.comite_id, p_tipo, p_pai, v_ordem + 1, trim(p_texto))
	returning id into v_id;
	return v_id;
end $$;

-- Mover troca com a vizinha do mesmo tipo e do mesmo pai: a operativa não passa da preambular.
create or replace function public.mover_clausula(p_clausula uuid, p_para_cima boolean)
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
	where documento_id = c.documento_id and tipo = c.tipo and pai_id is not distinct from c.pai_id
		and case when p_para_cima then ordem < c.ordem else ordem > c.ordem end
	order by case when p_para_cima then -ordem else ordem end
	limit 1;
	if vizinha.id is null then
		return;
	end if;
	update public.clausula set ordem = vizinha.ordem where id = c.id;
	update public.clausula set ordem = c.ordem where id = vizinha.id;
end $$;

revoke execute on function public.voz_no_documento(uuid) from public, anon, authenticated;
revoke execute on function
	public.marcar_posicao(uuid, text), public.resolver_comentario(uuid, boolean), public.adicionar_clausula(uuid, text, text, uuid, uuid)
from public, anon;
grant execute on function
	public.marcar_posicao(uuid, text), public.resolver_comentario(uuid, boolean), public.adicionar_clausula(uuid, text, text, uuid, uuid)
to authenticated;
