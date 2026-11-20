-- Matérias por veículo e por dia (horário de Brasília), com as denúncias recebidas.
with n as (
	select
		x.*,
		(x.publicada_em at time zone 'America/Sao_Paulo')::date as dia,
		(select count(*) from public.denuncia d where d.noticia_id = x.id) as denuncias
	from public.noticia x
)
select
	v.nome as veiculo,
	n.dia,
	count(*) filter (where n.status = 'publicada') as publicadas,
	count(*) filter (where n.status = 'aguardando') as aguardando,
	count(*) filter (where n.status = 'oculta') as ocultas,
	count(*) filter (where n.tipo = 'nota_urgente') as urgentes,
	sum(n.denuncias) as denuncias
from n
join public.veiculo v on v.id = n.veiculo_id
group by v.nome, n.dia
order by n.dia, v.nome;
