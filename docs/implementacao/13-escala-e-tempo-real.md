# Passo 13 · Escala e tempo real

**Parte de:** evento
**Depende de:** 12
**Objetivo:** aguentar o UFRGSMUN inteiro, com cerca de 150 delegações mais a equipe, o que dá um pico estimado de 200 a 300 conexões ao mesmo tempo.

## Como ficou

- **Um aviso curto em vez da linha:** o gatilho `public.transmitir()` manda `mudou` com só o nome da tabela; a tela recarrega pela API, com a RLS. O canal nunca leva dado privado, e o banco não confere a RLS de cada mudança para cada conexão. Numa mesma transação, cada canal recebe um aviso só por tabela.
- **Canais:** `comite:<id>`, `documento:<id>`, `crise:<id>` (notas para a equipe de crise), `delegacao:<id>` (notas para a própria delegação) e `evento:<id>` (avisos e capa da press). Quem entra em cada um está em `public.pode_ouvir`, usada pela política de `realtime.messages`. As notas de crise não passam pelo canal do comitê.
- **Cliente:** `src/lib/tempo-real.ts` tem um canal por tópico dividido entre as telas, que fica 5 s depois da última tela sair (a próxima tela do mesmo comitê aproveita). Ao entrar e ao voltar de uma queda, a tela recarrega.
- **Postgres Changes desligado:** as tabelas saíram da publicação `supabase_realtime`.
- **Carga local** (`node scripts/carga.ts`, Supabase local): com 162 clientes em 6 comitês, 1.800 avisos entregues, nenhum perdido, mediana de 77 ms e p95 de 110 ms. Com 300, a infraestrutura local recusa conexões ("fetch failed"), mas o tempo real segurou 231 conexões com os avisos abaixo de 80 ms. A medida dos 300 fica para o projeto de teste no Pro.

## O que construir

### Broadcast no lugar de Postgres Changes

> **Visto no piloto (passo 08):** com três fluxos ao vivo em paralelo nos testes, o tempo real local passou do limite de 100 mensagens por segundo (`MessagePerSecondRateLimitReached`, o mesmo limite do plano gratuito) e descartou mensagens: um aviso não chegou. No evento, isso vira regra: Broadcast com menos mensagens por mudança, e uma ressincronização da tela quando a conexão volta ou depois de um descarte. Por isso o CI roda os testes de ponta a ponta em um processo só.

- [x] Gatilhos nas tabelas ao vivo publicam em canais privados (com `realtime.send` e um aviso curto, não `broadcast_changes` com a linha):

  | Canal | O que passa |
  |---|---|
  | `comite:<id>` | Estado da sessão, pedidos de fala, votos, pauta, avisos e plantões |
  | `crise:<id>` | Notas de crise do comitê (só a equipe de crise) |
  | `delegacao:<id>` | Respostas de crise e avisos da delegação |
  | `documento:<id>` | Cláusulas, propostas e comentários |

- [x] Regras de acesso em `realtime.messages`, usando `realtime.topic()` e as funções de papel do passo 02.
- [x] Trocar as assinaturas em `src/lib/tempo-real.ts`. As telas não mudam (só as da crise e a capa dizem os canais extras).
- [x] Ao reconectar, buscar o que mudou: a tela recarrega tudo (as consultas são pequenas), em vez de pedir só o que mudou desde o último `atualizado_em`.

### Banco

- [x] Índices para as consultas mais usadas: `nota_crise (comite_id, status, criado_em)`, `clausula (documento_id, ordem)`, `pedido_fala (sessao_id, situacao, criado_em)` e `voto (votacao_id)`. O analisador do Supabase (`npx supabase db advisors`) aponta as chaves estrangeiras sem índice; vale rodá-lo aqui e criar os índices das que aparecem em consultas.
- [ ] Conferir os planos de consulta (`explain analyze`) com dados no tamanho do evento.

### Plano do Supabase

- [ ] Supabase Pro só no mês do evento. O gratuito aceita 200 conexões simultâneas e 100 mensagens por segundo; o Pro, 500 e 500.
- [ ] Voltar para o plano gratuito depois do evento (passo 19).

### Teste de carga

- [x] Script em `scripts/carga.ts` com supabase-js, abrindo 300 clientes distribuídos em 6 comitês.
- [x] O script simula pedidos de fala, votos, notas de crise e edição de cláusulas ao mesmo tempo.
- [x] Medir a latência das atualizações e os erros (`too_many_connections`, `too_many_joins`).
- [ ] Rodar contra o projeto de teste no plano Pro, nunca contra a produção com dados reais.

## Testes

Arquivos: `supabase/tests/13-canais.test.sql`, `tests/13-tempo-real.spec.ts` e `scripts/carga.ts`.

- [x] pgTAP: as regras de `realtime.messages` só deixam entrar no canal `crise:<id>` quem é da crise daquele comitê, e no `delegacao:<id>` quem é daquela delegação.
- [ ] Ponta a ponta: todos os testes de tempo real dos passos 04 a 11 continuam passando com Broadcast.
- [x] Ponta a ponta: um delegado de outro comitê não recebe as mensagens do canal de um comitê (dois navegadores).
- [x] Ponta a ponta: ao derrubar e restaurar a rede, o app busca o que perdeu (em `12-piloto.spec.ts`).
- [ ] Carga: 300 clientes simulados sem erros, com atualizações em menos de 1 segundo.

## Pronto quando

- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [ ] 300 clientes simulados rodam sem erros.
- [ ] As atualizações chegam em menos de 1 segundo, que é a meta.
- [x] Os testes de privacidade continuam passando com Broadcast.
