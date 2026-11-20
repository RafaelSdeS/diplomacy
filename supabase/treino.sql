-- O comitê de treino (TREINO) para o projeto na nuvem: o "mock" do primeiro dia,
-- com um cenário fictício, para ensinar o app (veja docs/piloto.md). Seis delegações
-- e o veículo da press, no evento UFRGSMUN 2027. Nenhum dado pessoal: as contas e
-- os convites são criados à parte. Pode rodar mais de uma vez; é um comando só.
--
--   npx supabase db query --remote --file supabase/treino.sql

with evento as (
	select id from public.evento where nome = 'UFRGSMUN' and ano = 2027
), comite as (
	insert into public.comite (evento_id, sigla, nome, nome_oficial, idioma, crise_ligada, topicos)
	select
		id, 'TREINO', 'Comitê de treino', 'O Conselho de Treino', 'pt', true,
		array[
			'A crise do Rio Aurora: seca, barragens e fronteiras (cenário fictício)',
			'Refugiados climáticos na fronteira norte (cenário fictício)'
		]
	from evento
	on conflict (evento_id, sigla) do update set nome = excluded.nome
	returning id
), veiculo as (
	insert into public.veiculo (comite_id, nome, linha_editorial)
	select id, 'Reuters', 'Notícias rápidas e factuais.' from comite
	on conflict (comite_id) do nothing
)
insert into public.delegacao (comite_id, nome, nome_oficial, bandeira)
select comite.id, d.nome, d.nome_oficial, d.bandeira
from comite, (values
	('Argentina', 'Argentine Republic', 'ar'),
	('Bolívia', 'Plurinational State of Bolivia', 'bo'),
	('Brasil', 'Federative Republic of Brazil', 'br'),
	('Chile', 'Republic of Chile', 'cl'),
	('Paraguai', 'Republic of Paraguay', 'py'),
	('Uruguai', 'Oriental Republic of Uruguay', 'uy')
) as d (nome, nome_oficial, bandeira)
on conflict (comite_id, nome) do nothing
returning nome;
