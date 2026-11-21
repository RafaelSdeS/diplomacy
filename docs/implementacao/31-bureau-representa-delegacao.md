# Passo 31 · Bureau no lugar de uma delegação ausente

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 21)
**Depende de:** 29
**Esforço:** P
**Objetivo:** um membro do bureau assume a delegação de quem faltou e age por ela na sessão.

## Hoje

- A mesa já registra votos de placa (`registrar_voto`) e, nos comitês com tecnologia restrita, pedidos de fala (`registrar_pedido_fala`).
- As ações de sessão do delegado passam por `exigir_delegacao` (`20261123090000_sessao.sql:398`): `levantar_placa`, `baixar_placa`, `enviar_ponto`, `assinar_mocao`, `inscrever_lista`.

## Decisões

- **Sem muitas regras** (você, 20/11): qualquer pessoa da mesa do comitê pode assumir qualquer delegação, a qualquer momento. A única trava é ser da mesa.
- Uma delegação por pessoa da mesa de cada vez.
- Tudo fica registrado em `registro` (quem assumiu, qual delegação, quando começou e terminou).
- Votos continuam por `registrar_voto`. Documentos e assinaturas de projeto ficam fora: são do bloco.

## Banco

Migração `supabase/migrations/20261214090000_representacao.sql`:

- [ ] Tabela `representacao` (`comite_id`, `pessoa_id`, `delegacao_id`, `desde`; chave `(comite_id, pessoa_id)`; chave composta para `delegacao`):
  - RLS: o comitê lê (todos sabem que o bureau assumiu), sem escrita direta;
  - Broadcast `transmitir('comite', 'comite_id')`.
- [ ] `representar(p_comite uuid, p_delegacao uuid)`: só a mesa; `null` encerra; grava em `registro` ("representar" e "parar de representar").
- [ ] `create or replace function public.exigir_delegacao`: se quem chama não tem delegação e é da mesa, devolve a delegação de `representacao`. Esse é o único ponto de mudança: as cinco ações acima passam a funcionar.
- [ ] `ponto_mocao.pela_mesa` e `pedido_fala.pela_mesa` (`boolean not null default false`), gravados quando a ação vem da mesa.
- [ ] Regenerar os tipos.

## Telas

- [ ] **Painel** (mesa): cartão "Assumir uma delegação", com `<select>` (as ausentes primeiro) e "Assumir"; enquanto assume, "Você está no lugar de Paraguai", com "Deixar".
- [ ] **Sessão:** se a pessoa é da mesa e está representando, a tela age como a da delegação representada (placa, ponto ou moção, lista especial), com a faixa "Pela mesa: Paraguai".
- [ ] **Painel e telão:** os pedidos feitos pela mesa levam o selo "pela mesa".

## Testes

Arquivos: `supabase/tests/31-representacao.test.sql` e `tests/31-representacao.spec.ts`.

- [ ] pgTAP:
  - só a mesa assume;
  - com representação, `levantar_placa` e `enviar_ponto` usam a delegação representada e marcam `pela_mesa`;
  - ao deixar, voltam a recusar;
  - o registro guarda o início e o fim;
  - delegado comum não é afetado.
- [ ] Ponta a ponta: a mesa assume o Paraguai, levanta a placa e envia uma moção; o telão mostra o Paraguai na fila com o selo.

## Pronto quando

- [ ] A falta de uma delegação não trava a sessão: o bureau assume em dois toques.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
