-- Passo 41: o tipo de cada item do cronograma, que a tela mostra com ícone e texto.
alter table public.cronograma_item
	add column tipo text not null default 'outro' check (tipo in ('sessao', 'intervalo', 'cerimonia', 'outro'));

-- Os itens que já existem ganham o tipo pelo título.
update public.cronograma_item set tipo = case
	when titulo ~* '^sess(ão|ao|ion)' then 'sessao'
	when titulo ~* '^(almoço|almoco|intervalo|café|cafe|coffee|lunch|break)' then 'intervalo'
	when titulo ~* '^(cerimônia|cerimonia|ceremony)' then 'cerimonia'
	else 'outro'
end;
