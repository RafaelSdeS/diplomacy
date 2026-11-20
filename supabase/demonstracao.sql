-- Dados de demonstração para o projeto na nuvem: o comitê de teste CSNU-T, com as
-- 15 delegações, as regras do CSNU e o veículo da press, no evento UFRGSMUN 2027. Nenhum dado
-- pessoal: as contas e os convites são criados à parte (veja docs/publicar.md).
-- Pode rodar mais de uma vez; é um comando só, então ou aplica tudo, ou nada.
--
--   npx supabase db query --remote --file supabase/demonstracao.sql

with evento as (
	select id from public.evento where nome = 'UFRGSMUN' and ano = 2027
), comite as (
	insert into public.comite (evento_id, sigla, nome, nome_oficial, idioma, crise_ligada, topicos, guia_url, regras)
	select
		id, 'CSNU-T', 'Conselho de Segurança (teste)', 'O Conselho de Segurança', 'pt', true,
		array[
			'Crime organizado transnacional, narcotráfico e instabilidade política: desafios na América Latina',
			'Conflito no Iêmen: ataques no Mar Vermelho e no Golfo de Áden'
		],
		'https://www.ufrgs.br/ufrgsmun/',
		'{"votacao_substantiva": "csnu", "membros_permanentes": ["China", "EUA", "França", "Reino Unido", "Rússia"]}'
	from evento
	on conflict (evento_id, sigla) do update set nome = excluded.nome
	returning id
), veiculo as (
	-- O veículo da press do comitê (o nome de um veículo real, só o nome).
	insert into public.veiculo (comite_id, nome, linha_editorial)
	select id, 'Al Jazeera', 'Cobertura do Oriente Médio e do Sul Global.' from comite
	on conflict (comite_id) do nothing
)
insert into public.delegacao (comite_id, nome, nome_oficial, bandeira)
select comite.id, d.nome, d.nome_oficial, d.bandeira
from comite, (values
	('EUA', 'United States of America', 'us'),
	('Rússia', 'Russian Federation', 'ru'),
	('China', 'People''s Republic of China', 'cn'),
	('Reino Unido', 'United Kingdom of Great Britain and Northern Ireland', 'gb'),
	('França', 'French Republic', 'fr'),
	('Brasil', 'Federative Republic of Brazil', 'br'),
	('México', 'United Mexican States', 'mx'),
	('Colômbia', 'Republic of Colombia', 'co'),
	('Paraguai', 'Republic of Paraguay', 'py'),
	('Irã', 'Islamic Republic of Iran', 'ir'),
	('Arábia Saudita', 'Kingdom of Saudi Arabia', 'sa'),
	('Nigéria', 'Federal Republic of Nigeria', 'ng'),
	('Marrocos', 'Kingdom of Morocco', 'ma'),
	('Itália', 'Italian Republic', 'it'),
	('Somália', 'Federal Republic of Somalia', 'so')
) as d (nome, nome_oficial, bandeira)
on conflict (comite_id, nome) do nothing
returning nome;
