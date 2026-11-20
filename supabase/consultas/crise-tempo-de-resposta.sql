-- Tempo entre o envio de uma nota de crise e a resposta, por comitê.
select
	c.sigla as comite,
	count(*) filter (where n.respondida_em is not null) as respondidas,
	count(*) filter (where n.respondida_em is null) as sem_resposta,
	date_trunc('second', avg(n.respondida_em - n.criado_em)) as tempo_medio,
	date_trunc('second', percentile_cont(0.5) within group (order by n.respondida_em - n.criado_em)) as mediana,
	date_trunc('second', max(n.respondida_em - n.criado_em)) as tempo_maximo
from public.nota_crise n
join public.comite c on c.id = n.comite_id
group by c.sigla
order by c.sigla;
