-- Passo 56: a ordem do tópico. O working paper também só vem depois da agenda adotada
-- (decidido em 24/11/2026), como o projeto (passo 22). O projeto continua livre: em branco ou
-- com cláusulas trazidas de working papers (a origem fica em clausula.origem_id).
create or replace function public.criar_documento(
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
	-- ponytail: documento sem tópico (só pela API, a tela sempre pede o tópico) fica sem a
	-- regra, como já fica sem a de uma resolução por tópico; os testes usam isso.
	if p_tipo in ('projeto', 'working_paper') and p_topico is not null
		and not exists (select 1 from public.proposta_agenda where comite_id = v_comite and topico = p_topico and adotada) then
		if p_tipo = 'projeto' then
			raise exception 'Adote a agenda do tópico antes de apresentar um projeto de resolução.';
		end if;
		raise exception 'Adote a agenda do tópico antes de apresentar um working paper.';
	end if;
	-- O item da agenda, se vier, é da agenda adotada deste tópico.
	if p_ponto_pauta is not null and not exists (
		select 1 from public.ponto_pauta pp join public.proposta_agenda pa on pa.id = pp.proposta_id
		where pp.id = p_ponto_pauta and pa.comite_id = v_comite and pa.topico = p_topico and pa.adotada
	) then
		raise exception 'Escolha um item da agenda adotada deste tópico.' using errcode = '22023';
	end if;
	insert into public.documento (comite_id, bloco_id, tipo, titulo, topico, ponto_pauta_id, atualizacao_crise_id)
	values (v_comite, p_bloco, p_tipo, trim(p_titulo), p_topico, p_ponto_pauta, p_atualizacao)
	returning id into v_id;
	return v_id;
end $$;

-- A trilha do tópico muda ao vivo: propor, adotar e editar a agenda avisam o comitê.
create trigger transmitir after insert or update or delete on public.proposta_agenda
	for each row execute function public.transmitir('comite', 'comite_id');
create trigger transmitir after insert or update or delete on public.ponto_pauta
	for each row execute function public.transmitir('comite', 'comite_id');
