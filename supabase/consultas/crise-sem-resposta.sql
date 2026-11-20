-- Notas de crise enviadas durante cada sessão que ainda não tinham resposta quando a
-- sessão acabou (ou que ainda esperam, se a sessão está aberta).
select
	c.sigla as comite,
	s.numero as sessao,
	s.fim is null as aberta,
	count(n.id) as enviadas,
	count(n.id) filter (where n.respondida_em is null or n.respondida_em > coalesce(s.fim, now())) as sem_resposta_no_fim
from public.sessao s
join public.comite c on c.id = s.comite_id
left join public.nota_crise n
	on n.comite_id = s.comite_id and n.criado_em >= s.inicio and n.criado_em < coalesce(s.fim, now())
group by c.sigla, s.numero, s.fim
order by c.sigla, s.numero;
