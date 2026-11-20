-- Teste geral, vale para todos os passos: nenhuma tabela do esquema public
-- pode ficar sem RLS ou sem regra de acesso.
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

select is_empty(
	$$ select tablename::text from pg_tables where schemaname = 'public' and not rowsecurity $$,
	'toda tabela do esquema public tem RLS ligado'
);

select is_empty(
	$$
		select t.tablename::text
		from pg_tables t
		where t.schemaname = 'public'
			and not exists (
				select 1 from pg_policies p
				where p.schemaname = 'public' and p.tablename = t.tablename
			)
	$$,
	'toda tabela do esquema public tem pelo menos uma regra de acesso'
);

select * from finish();
rollback;
