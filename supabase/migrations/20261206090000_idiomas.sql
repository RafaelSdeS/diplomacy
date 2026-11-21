-- Passo 18: o idioma da interface. Sem escolha (nulo), vale o idioma do comitê da
-- pessoa; no perfil, cada um pode fixar português ou inglês.
alter table public.pessoa add column idioma text check (idioma in ('pt', 'en'));
