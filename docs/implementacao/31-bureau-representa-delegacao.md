# Passo 31 · Bureau no lugar de uma delegação ausente

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 21)
**Depende de:** 29
**Esforço:** P
**Objetivo:** um membro do bureau assume a delegação de quem faltou e age por ela na sessão.

## Como ficou

- Banco (`20261214090000_representacao.sql`): `representacao`, `representar` (com registro), `exigir_delegacao` olhando a representação da mesa, e a marca `pela_mesa` por gatilho.
- Painel: "Assumir uma delegação" (ausentes primeiro), "Agir pela delegação" e "Deixar". Sessão: age como a delegação representada.

## Antes

- A mesa já registra votos de placa (`registrar_voto`) e, nos comitês com tecnologia restrita, pedidos de fala (`registrar_pedido_fala`).
- As ações de sessão do delegado passam por `exigir_delegacao` (`20261123090000_sessao.sql:398`): `levantar_placa`, `baixar_placa`, `enviar_ponto`, `assinar_mocao`, `inscrever_lista`.

## Decisões

- **Sem muitas regras** (você, 20/11): qualquer pessoa da mesa do comitê pode assumir qualquer delegação, a qualquer momento. A única trava é ser da mesa.
- Uma delegação por pessoa da mesa de cada vez.
- Tudo fica registrado em `registro` (quem assumiu, qual delegação, quando começou e terminou).
- Votos continuam por `registrar_voto`. Documentos e assinaturas de projeto ficam fora: são do bloco.

## Banco

Migração `supabase/migrations/20261214090000_representacao.sql`:

- [x] Tabela `representacao` (`comite_id`, `pessoa_id`, `delegacao_id`, `desde`; chave `(comite_id, pessoa_id)`; chave composta para `delegacao`):
  - RLS: o comitê lê (todos sabem que o bureau assumiu), sem escrita direta;
  - Broadcast `transmitir('comite', 'comite_id')`.
- [x] `representar(p_comite uuid, p_delegacao uuid)`: só a mesa; `null` encerra; grava em `registro` ("representar" e "parar de representar").
- [x] `create or replace function public.exigir_delegacao`: se quem chama não tem delegação e é da mesa, devolve a delegação de `representacao`. Esse é o único ponto de mudança: as cinco ações acima passam a funcionar.
- [x] `ponto_mocao.pela_mesa` e `pedido_fala.pela_mesa` (`boolean not null default false`), gravados por um gatilho quando quem age não é a própria delegação (vale também para o `registrar_pedido_fala` da tecnologia restrita).
- [x] Regenerar os tipos.

## Telas

- [x] **Painel** (mesa): cartão "Assumir uma delegação", com `<select>` (as ausentes primeiro) e "Assumir"; enquanto assume, "Você está no lugar de Paraguai", com "Deixar".
- [x] **Sessão:** se a pessoa é da mesa e está representando, a tela age como a da delegação representada (placa, ponto ou moção, lista especial; o voto vai por `registrar_voto`), com a faixa "Pela mesa: você está no lugar de …".
- [x] **Painel:** os pedidos de fala feitos pela mesa levam o selo "pela mesa". (No telão, ficou de fora: a lista projetada mostra só o país.)

## Testes

Arquivos: `supabase/tests/31-representacao.test.sql` e `tests/31-representacao.spec.ts`.

- [x] pgTAP:
  - só a mesa assume;
  - com representação, `levantar_placa` e `enviar_ponto` usam a delegação representada e marcam `pela_mesa`;
  - ao deixar, voltam a recusar;
  - o registro guarda o início e o fim;
  - delegado comum não é afetado.
- [x] Ponta a ponta (CE-T): a mesa assume a Itália, levanta a placa por ela, vê "pela mesa" na fila do painel e deixa; depois, a sessão não mostra mais a placa. A moção pela mesa está no pgTAP.

## Pronto quando

- [x] A falta de uma delegação não trava a sessão: o bureau assume em dois toques.
- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
