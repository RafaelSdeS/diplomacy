-- Do envio do projeto à mesa até a abertura da votação, e o resultado.
select
	c.sigla as comite,
	d.numero as projeto,
	d.titulo,
	d.status,
	date_trunc('second', v.criado_em - d.enviado_em) as do_envio_a_votacao,
	v.a_favor,
	v.contra,
	v.abstencoes,
	v.aprovada
from public.documento d
join public.comite c on c.id = d.comite_id
left join public.votacao v on v.documento_id = d.id
where d.tipo <> 'working_paper' and d.enviado_em is not null
order by c.sigla, d.numero;
