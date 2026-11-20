# Passo 13 · Escala e tempo real

**Parte de:** evento
**Depende de:** 12
**Objetivo:** aguentar o UFRGSMUN inteiro, com cerca de 150 delegações mais a equipe, o que dá um pico estimado de 200 a 300 conexões ao mesmo tempo.

## O que construir

### Broadcast no lugar de Postgres Changes

- [ ] Gatilhos nas tabelas ao vivo chamam `realtime.broadcast_changes()` e publicam em canais privados:

  | Canal | O que passa |
  |---|---|
  | `comite:<id>` | Estado da sessão, pedidos de fala, votos, pauta, avisos e plantões |
  | `crise:<id>` | Notas de crise do comitê (só a equipe de crise) |
  | `delegacao:<id>` | Respostas de crise e avisos da delegação |
  | `documento:<id>` | Cláusulas, propostas e comentários |

- [ ] Regras de acesso em `realtime.messages`, usando `realtime.topic()` e as funções de papel do passo 02.
- [ ] Trocar as assinaturas em `src/lib/tempo-real.ts`. As telas não mudam.
- [ ] Ao reconectar, buscar o que mudou desde o último `atualizado_em` conhecido.

### Banco

- [ ] Índices para as consultas mais usadas: `nota_crise (comite_id, status, criado_em)`, `clausula (documento_id, ordem)`, `pedido_fala (sessao_id, atendido, criado_em)` e `voto (votacao_id)`.
- [ ] Conferir os planos de consulta (`explain analyze`) com dados no tamanho do evento.

### Plano do Supabase

- [ ] Supabase Pro só no mês do evento. O gratuito aceita 200 conexões simultâneas e 100 mensagens por segundo; o Pro, 500 e 500.
- [ ] Voltar para o plano gratuito depois do evento (passo 19).

### Teste de carga

- [ ] Script em `scripts/carga.ts` com supabase-js, abrindo 300 clientes distribuídos em 6 comitês.
- [ ] O script simula pedidos de fala, votos, notas de crise e edição de cláusulas ao mesmo tempo.
- [ ] Medir a latência das atualizações e os erros (`too_many_connections`, `too_many_joins`).
- [ ] Rodar contra o projeto de teste no plano Pro, nunca contra a produção com dados reais.

## Pronto quando

- [ ] 300 clientes simulados rodam sem erros.
- [ ] As atualizações chegam em menos de 1 segundo, que é a meta.
- [ ] Os testes de privacidade continuam passando com Broadcast.
