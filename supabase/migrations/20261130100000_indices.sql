-- Passo 13: índices para as consultas das telas, da RLS e das métricas do piloto.
-- O analisador (npx supabase db advisors --type performance --level info) aponta todas
-- as chaves estrangeiras sem índice; estes são os das que aparecem em consultas. As
-- outras só pesam ao apagar um comitê inteiro, o que não acontece durante o evento.
create index on public.proposta_alteracao (documento_id);
create index on public.proposta_alteracao (clausula_id);
create index on public.comentario (documento_id);
create index on public.comentario (clausula_id);
create index on public.documento (bloco_id);
create index on public.ponto_mocao (sessao_id);
create index on public.votacao (sessao_id);
create index on public.votacao (documento_id);
create index on public.dpo (delegacao_id);
