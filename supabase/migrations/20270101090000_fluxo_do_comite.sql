-- Passo 62 (lote 1, reduzido pelo passo 63 em 26/11/2026): as regras do bloco.
-- Cada delegação fica num bloco por vez no comitê: entrar em outro, ou criar um, tira do atual.
-- O bloco nunca fica sem redator: se a única redatora sai, a redação passa a quem está no bloco
-- há mais tempo. (Encerrar a sessão no meio de uma votação continua valendo, o projeto volta a
-- esperar a mesa: a tela avisa antes.)

alter table public.bloco_membro add column entrou_em timestamptz not null default clock_timestamp();

-- Quem já estava em mais de um bloco fica no mais recente.
delete from public.bloco_membro m
using public.bloco_membro outra, public.bloco b, public.bloco b_outra
where outra.comite_id = m.comite_id and outra.delegacao_id = m.delegacao_id and outra.bloco_id <> m.bloco_id
	and b.id = m.bloco_id and b_outra.id = outra.bloco_id
	and (b_outra.criado_em, b_outra.id) > (b.criado_em, b.id);

-- E o bloco que ficou sem redator ganha um.
update public.bloco_membro m set redator = true
where (m.bloco_id, m.delegacao_id) in (
	select distinct on (x.bloco_id) x.bloco_id, x.delegacao_id from public.bloco_membro x
	where not exists (select 1 from public.bloco_membro r where r.bloco_id = x.bloco_id and r.redator)
	order by x.bloco_id, x.delegacao_id
);

create unique index bloco_membro_um_por_comite on public.bloco_membro (comite_id, delegacao_id);

-- Sair do bloco; se não sobra redator, a redação passa a quem está no bloco há mais tempo.
create or replace function public.sair_bloco(p_bloco uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.exigir_membro(p_bloco);
begin
	delete from public.bloco_membro where bloco_id = p_bloco and delegacao_id = v_delegacao;
	if not exists (select 1 from public.bloco_membro where bloco_id = p_bloco and redator) then
		update public.bloco_membro set redator = true
		where bloco_id = p_bloco and delegacao_id = (
			select delegacao_id from public.bloco_membro where bloco_id = p_bloco order by entrou_em, delegacao_id limit 1
		);
	end if;
end $$;

-- O bloco atual da delegação no comitê (um só).
create function public.meu_bloco(p_comite uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
	select bloco_id from public.bloco_membro where comite_id = p_comite and delegacao_id = public.minha_delegacao(p_comite);
$$;

create or replace function public.criar_bloco(p_comite uuid, p_nome text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.minha_delegacao(p_comite);
	v_atual uuid := public.meu_bloco(p_comite);
	v_bloco uuid;
begin
	if v_delegacao is null then
		raise exception 'Só delegados do comitê criam blocos.' using errcode = '42501';
	end if;
	if v_atual is not null then
		perform public.sair_bloco(v_atual);
	end if;
	insert into public.bloco (comite_id, nome) values (p_comite, trim(p_nome)) returning id into v_bloco;
	-- Quem cria entra como redator.
	insert into public.bloco_membro (bloco_id, comite_id, delegacao_id, redator) values (v_bloco, p_comite, v_delegacao, true);
	return v_bloco;
exception when unique_violation then
	raise exception 'Já existe um bloco com esse nome.' using errcode = '23505';
end $$;

create or replace function public.entrar_bloco(p_bloco uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_comite uuid := (select comite_id from public.bloco where id = p_bloco);
	v_delegacao uuid := public.minha_delegacao(v_comite);
	v_atual uuid := public.meu_bloco(v_comite);
begin
	if v_delegacao is null then
		raise exception 'Só delegados do comitê entram em blocos.' using errcode = '42501';
	end if;
	if v_atual = p_bloco then
		return;
	end if;
	if v_atual is not null then
		perform public.sair_bloco(v_atual);
	end if;
	insert into public.bloco_membro (bloco_id, comite_id, delegacao_id) values (p_bloco, v_comite, v_delegacao);
end $$;

revoke execute on function public.meu_bloco(uuid) from public, anon;
grant execute on function public.meu_bloco(uuid) to authenticated;
