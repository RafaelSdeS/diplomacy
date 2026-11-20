-- As funções de gatilho não são chamadas pela API. O analisador de segurança do
-- Supabase apontava que elas apareciam em /rest/v1/rpc para qualquer um. Os
-- gatilhos continuam disparando: o privilégio de executar só é checado ao criá-los.
revoke execute on function public.nova_conta(), public.convite_criado() from public, anon, authenticated;
