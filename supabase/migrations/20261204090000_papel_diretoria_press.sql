-- Passo 17: a Diretoria da Press ganha papel próprio (antes usava uma conta da
-- secretaria, que vê mais do que precisa). O valor novo do enum fica numa migração só
-- dele: o Postgres não deixa usá-lo na mesma transação em que é criado.
alter type public.papel add value if not exists 'diretoria_press';
