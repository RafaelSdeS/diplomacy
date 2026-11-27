-- Passo 66 · Apoio automático e debate por lista.
--
-- 1. Quem propõe uma mudança no working paper da sala, ou uma alteração na agenda, já apoia a
--    própria proposta: a posição "apoio" é gravada junto (as abertas também ganham a sua).
-- 2. A moção de debate por lista: no debate, qualquer delegação pede; aprovada por maioria
--    simples, o debate passa ao formal-formal (quem levanta a placa entra na lista, na ordem) até
--    outra moção ou a presidência mudar a forma. A presidência também pode escolhê-lo.
-- As funções abaixo são as versões mais recentes, copiadas com a mudança marcada "Passo 66".

-- 1. Apoio automático

create or replace function public.propor_no_documento(
	p_documento uuid,
	p_acao text,
	p_clausula uuid default null,
	p_texto text default null,
	p_tipo text default null,
	p_depois uuid default null,
	p_motivo text default null,
	p_id uuid default gen_random_uuid()
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	d public.documento := (select x from public.documento x where x.id = p_documento);
	v_delegacao uuid := public.minha_delegacao(d.comite_id);
	v_bloco uuid := public.meu_bloco(d.comite_id);
begin
	if exists (select 1 from public.proposta_alteracao where id = p_id) then
		return p_id; -- a caixa de saída reenviou
	end if;
	if d.id is null or d.bloco_id is not null or d.tipo <> 'working_paper' then
		raise exception 'Só se propõe no working paper da sala.' using errcode = '22023';
	end if;
	if d.status <> 'rascunho' then
		raise exception 'Este working paper já virou projeto: as propostas estão fechadas.' using errcode = '22023';
	end if;
	if v_delegacao is null then
		raise exception 'Só as delegações do comitê propõem.' using errcode = '42501';
	end if;
	if v_bloco is not null and not public.sou_redator(v_bloco) then
		raise exception 'Quem propõe é o redator do seu bloco: leve a sugestão a ele na conversa do bloco.' using errcode = '42501';
	end if;
	if p_acao in ('alterar', 'retirar', 'mover') and p_clausula is null then
		raise exception 'Escolha a cláusula.' using errcode = '22023';
	end if;
	if exists (
		select 1 from unnest(array[p_clausula, p_depois]) as x(id)
		where x.id is not null and not exists (select 1 from public.clausula c where c.id = x.id and c.documento_id = d.id)
	) then
		raise exception 'Essa cláusula não é deste documento.' using errcode = '22023';
	end if;
	insert into public.proposta_alteracao (id, clausula_id, documento_id, comite_id, delegacao_id, texto_novo, acao, tipo, depois_de, motivo, bloco_id, autor_id)
	values (p_id, p_clausula, d.id, d.comite_id, v_delegacao, nullif(trim(p_texto), ''), p_acao, p_tipo, p_depois, nullif(trim(p_motivo), ''), v_bloco, auth.uid());
	-- Passo 66: quem propõe já apoia a própria proposta.
	insert into public.posicao_proposta (proposta_id, documento_id, comite_id, delegacao_id, posicao, autor_id)
	values (p_id, d.id, d.comite_id, v_delegacao, 'apoio', auth.uid());
	return p_id;
end $$;

create or replace function public.propor_alteracao_agenda(
	p_proposta uuid, p_acao text, p_ponto uuid default null, p_texto text default null,
	p_depois uuid default null, p_dentro boolean default false, p_motivo text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v public.proposta_agenda := (select x from public.proposta_agenda x where x.id = p_proposta);
	v_minha uuid := public.minha_delegacao(v.comite_id);
	v_id uuid;
begin
	if v_minha is null and not public.tem_papel(v.comite_id, '{mesa}') then
		raise exception 'Só as delegações e a mesa propõem alterações na agenda.' using errcode = '42501';
	end if;
	if v.delegacao_id is not null or not (v.liberada or v.adotada) then
		raise exception 'Altera-se a agenda do bureau, depois de liberada.' using errcode = '22023';
	end if;
	if exists (select 1 from unnest(array[p_ponto, p_depois]) as x(id)
		where x.id is not null and not exists (select 1 from public.ponto_pauta where id = x.id and proposta_id = p_proposta)) then
		raise exception 'Escolha itens desta agenda.' using errcode = '22023';
	end if;
	insert into public.alteracao_agenda (proposta_id, comite_id, delegacao_id, acao, ponto_id, depois_de, dentro, texto, motivo, autor_id)
	values (p_proposta, v.comite_id, v_minha, p_acao, p_ponto, p_depois, coalesce(p_dentro, false),
		nullif(trim(p_texto), ''), nullif(trim(p_motivo), ''), auth.uid())
	returning id into v_id;
	-- Passo 66: a delegação que propõe já apoia a própria alteração (a mesa não tem voto).
	if v_minha is not null then
		insert into public.posicao_alteracao (alteracao_id, comite_id, delegacao_id, posicao) values (v_id, v.comite_id, v_minha, 'apoio');
	end if;
	return v_id;
end $$;

insert into public.posicao_proposta (proposta_id, documento_id, comite_id, delegacao_id, posicao, autor_id)
select p.id, p.documento_id, p.comite_id, p.delegacao_id, 'apoio', p.autor_id
from public.proposta_alteracao p
join public.documento d on d.id = p.documento_id and d.bloco_id is null
where p.status = 'aberta'
on conflict do nothing;

insert into public.posicao_alteracao (alteracao_id, comite_id, delegacao_id, posicao)
select a.id, a.comite_id, a.delegacao_id, 'apoio'
from public.alteracao_agenda a
where a.status = 'aberta' and a.delegacao_id is not null
on conflict do nothing;

-- 2. Moção de debate por lista

alter table public.ponto_mocao
	drop constraint ponto_mocao_tipo_check,
	add constraint ponto_mocao_tipo_check check (tipo in (
		'ponto_ordem', 'ponto_duvida', 'privilegio_pessoal',
		'topico_no_topo', 'adiamento_debate', 'adiamento_sessao', 'informal_informal', 'debate_lista', 'voto_desconfianca',
		'divisao_questao', 'votacao_nominal'
	));

create or replace function public.enviar_ponto(
	p_comite uuid, p_tipo text, p_detalhe text default null, p_topico int default null, p_minutos int default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v_delegacao uuid := public.exigir_delegacao(p_comite);
	v_estado public.estado_sessao;
	v_topicos int;
	v_sala_fechada boolean := public.projeto_em_votacao(p_comite) is not null;
begin
	select * into v_estado from public.estado_sessao where comite_id = p_comite;
	if v_sala_fechada and p_tipo not in ('ponto_ordem', 'ponto_duvida', 'privilegio_pessoal', 'divisao_questao', 'votacao_nominal') then
		raise exception 'Durante a votação de um projeto, só estão em ordem a divisão da questão e a votação nominal.';
	end if;
	if p_tipo = 'ponto_ordem' and v_estado.orador_delegacao_id is not null
		and v_estado.orador_delegacao_id <> v_delegacao then
		raise exception 'O ponto de ordem não interrompe o discurso de outra delegação.';
	end if;
	if p_tipo = 'topico_no_topo' then
		if v_estado.fase <> 'plenaria' or v_estado.etapa_plenaria <> 'topico' then
			raise exception 'A moção do tópico no topo vem no fim da plenária de abertura.';
		end if;
		select coalesce(array_length(topicos, 1), 0) into v_topicos from public.comite where id = p_comite;
		if p_topico is null or p_topico < 1 or p_topico > v_topicos then
			raise exception 'Escolha um dos tópicos do comitê.' using errcode = '22023';
		end if;
	elsif p_tipo = 'adiamento_sessao' then
		if v_estado.fase not in ('plenaria', 'debate') then
			raise exception 'Esta moção não está em ordem agora.';
		end if;
	elsif p_tipo in ('adiamento_debate', 'informal_informal', 'debate_lista', 'voto_desconfianca') then
		if v_estado.fase <> 'debate' then
			raise exception 'Esta moção só está em ordem durante o debate de um tópico.';
		end if;
		if p_tipo = 'informal_informal' and (p_minutos is null or p_minutos < 1) then
			raise exception 'Informe quantos minutos de informal-informal.' using errcode = '22023';
		end if;
	elsif p_tipo in ('divisao_questao', 'votacao_nominal') and not v_sala_fechada then
		raise exception 'Esta moção só está em ordem na votação de um projeto de resolução.';
	end if;

	insert into public.ponto_mocao (sessao_id, comite_id, delegacao_id, tipo, detalhe, topico, minutos)
	values (
		public.sessao_atual(p_comite), p_comite, v_delegacao, p_tipo, nullif(trim(p_detalhe), ''),
		case when p_tipo = 'topico_no_topo' then p_topico end,
		case when p_tipo = 'informal_informal' then p_minutos end
	);
end $$;

create or replace function public.abrir_votacao(p_ponto uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	v_ponto public.ponto_mocao;
	v_votacao uuid;
	v_limite int;
begin
	select * into v_ponto from public.ponto_mocao where id = p_ponto for update;
	perform public.exigir_presidencia(v_ponto.comite_id);
	if v_ponto.status not in ('aberto', 'em_discussao') then
		raise exception 'Esta moção já foi tratada.';
	end if;
	if v_ponto.tipo in ('ponto_ordem', 'ponto_duvida', 'privilegio_pessoal') then
		raise exception 'Pontos não são votados.';
	end if;
	if v_ponto.tipo = 'informal_informal' then
		v_limite := (public.regras(v_ponto.comite_id) ->> 'informal_informal_max_min')::int;
		if (select informal_min_usados from public.sessao where id = v_ponto.sessao_id) + v_ponto.minutos > v_limite then
			raise exception 'O informal-informal passaria de % minutos nesta sessão.', v_limite using errcode = '23514';
		end if;
	end if;

	insert into public.votacao (comite_id, sessao_id, ponto_mocao_id, objeto, tipo, regra)
	values (
		v_ponto.comite_id, v_ponto.sessao_id, p_ponto,
		case v_ponto.tipo
			when 'topico_no_topo' then 'Tópico ' || v_ponto.topico || ' no topo da agenda'
			when 'adiamento_debate' then 'Adiamento do debate'
			when 'adiamento_sessao' then 'Adiamento da sessão'
			when 'informal_informal' then 'Informal-informal de ' || v_ponto.minutos || ' minutos'
			when 'debate_lista' then 'Debate por lista'
			when 'voto_desconfianca' then 'Voto de desconfiança'
			else v_ponto.tipo
		end,
		'procedimental',
		case when v_ponto.tipo = 'adiamento_debate' then 'dois_tercos' else 'maioria_simples' end
	)
	returning id into v_votacao;
	update public.ponto_mocao set status = 'em_votacao' where id = p_ponto;
	return v_votacao;
exception when unique_violation then
	raise exception 'Já há uma votação aberta neste comitê.' using errcode = '23505';
end $$;

create or replace function public.encerrar_votacao(p_votacao uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
	v public.votacao;
	r record;
	v_ponto public.ponto_mocao;
	v_topicos int;
	v_ordem int[];
begin
	select * into v from public.votacao where id = p_votacao for update;
	if v.id is null or not v.aberta then
		raise exception 'Esta votação não está aberta.';
	end if;
	perform public.exigir_presidencia(v.comite_id);
	select * into r from public.resultado(p_votacao);
	update public.votacao set
		aberta = false, encerrada_em = now(), base = r.base, a_favor = r.a_favor, contra = r.contra,
		abstencoes = r.abstencoes, necessario = r.necessario, aprovada = r.aprovada
	where id = p_votacao;

	if v.ponto_mocao_id is not null then
		select * into v_ponto from public.ponto_mocao where id = v.ponto_mocao_id;
		update public.ponto_mocao set status = case when r.aprovada then 'aceito' else 'recusado' end
		where id = v_ponto.id;

		if v_ponto.tipo = 'topico_no_topo' then
			-- Aprovada, o tópico escolhido vem primeiro; rejeitada, entra o outro.
			select coalesce(array_length(topicos, 1), 0) into v_topicos from public.comite where id = v.comite_id;
			v_ordem := array(select t from generate_series(1, v_topicos) t where t <> v_ponto.topico order by t);
			v_ordem := case when r.aprovada then v_ponto.topico || v_ordem else v_ordem || v_ponto.topico end;
			update public.estado_sessao set
				fase = 'debate', ordem_topicos = v_ordem, topico_atual = v_ordem[1], forma = 'formal_informal',
				orador_delegacao_id = null, cronometro_inicio = null, cronometro_duracao_seg = null,
				cronometro_pausado_restante_seg = null
			where comite_id = v.comite_id;
			-- Terminada a plenária, a delegação da vez assume a presidência.
			update public.sessao set presidencia_delegacao_id = public.tomar_proxima_presidencia(v.comite_id)
			where id = v.sessao_id and presidencia_delegacao_id is null and fim is null;
		elsif r.aprovada and v_ponto.tipo = 'adiamento_debate' then
			update public.estado_sessao set
				topico_atual = ordem_topicos[array_position(ordem_topicos, topico_atual) % array_length(ordem_topicos, 1) + 1],
				orador_delegacao_id = null, cronometro_inicio = null, cronometro_duracao_seg = null,
				cronometro_pausado_restante_seg = null
			where comite_id = v.comite_id;
		elsif r.aprovada and v_ponto.tipo = 'adiamento_sessao' then
			update public.sessao set fim = now() where id = v.sessao_id;
			update public.estado_sessao set
				sessao_id = null, orador_delegacao_id = null, cronometro_inicio = null,
				cronometro_duracao_seg = null, cronometro_pausado_restante_seg = null
			where comite_id = v.comite_id;
		elsif r.aprovada and v_ponto.tipo = 'informal_informal' then
			perform public.aplicar_forma(v.comite_id, 'informal_informal', v_ponto.minutos);
		elsif r.aprovada and v_ponto.tipo = 'debate_lista' then
			-- Passo 66: em lista até outra moção (ou a presidência) mudar a forma.
			perform public.aplicar_forma(v.comite_id, 'formal_formal', null);
		elsif r.aprovada and v_ponto.tipo = 'voto_desconfianca' then
			-- ponytail: as assinaturas de 1/5 das previstas entram no passo 16.
			update public.sessao set presidencia_delegacao_id = public.tomar_proxima_presidencia(v.comite_id)
			where id = v.sessao_id;
		end if;
	end if;
	update public.estado_sessao set atualizado_em = now() where comite_id = v.comite_id;
end $$;

create or replace function public.mudar_forma(p_comite uuid, p_forma public.forma_debate, p_minutos int default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
	perform public.exigir_presidencia(p_comite);
	if (select fase from public.estado_sessao where comite_id = p_comite) = 'plenaria' then
		raise exception 'Na plenária de abertura, o debate é formal-formal.';
	end if;
	perform public.aplicar_forma(p_comite, p_forma, p_minutos);
end $$;
