# Passo 41 · Pendências

**Depende de:** 39
**Esforço:** P
**Objetivo:** fechar o que ficou em aberto nos passos 27, 35, 37 e 38.

## Como ficou

| Pendência | Origem | Como |
|---|---|---|
| Notificação da crise no celular | 35 | `npx supabase functions deploy enviar-push`, feito em 21/11/2026 |
| Logo | 27 | Escolhida a opção 1 (a placa), que já era o ícone. Saíram as opções 2 e 3 e a página `static/marca/opcoes.html` |
| Ícones por tipo no cronograma | 37 | Migração `20261218090000_cronograma_tipo.sql`: `cronograma_item.tipo` (`sessao`, `intervalo`, `cerimonia` ou `outro`, que é o padrão). Os itens antigos ganharam o tipo pelo título. A secretaria escolhe no formulário. `src/lib/ui/TipoItem.svelte` mostra ícone e texto no cronograma e no "Agora"; "outro" não aparece. Seed e demonstração usam `tipoDoItem(titulo)` (`scripts/admin.ts`), a mesma regra da migração |
| Filtro nos "próximos" | 38 | A fila de placas do painel da presidência ganha o campo "Filtrar" quando passa de 12, com `filtrarDelegacoes` e `LISTA_LONGA` (`src/lib/filtro.ts`) |
| Capturas do telão em modo crise | 35 | `telao-crise.png` (crise ativa, prazo mascarado) e `telao-desfecho.png`, em `tests/35-crise-com-prazo.spec.ts`. Nas capturas, o título da crise é fixo |

## Ficam com o usuário

- Validar `docs/proposta-de-valor.md` com o pessoal do UFRGSMUN.
- Testes em aparelhos reais:
  - vibração e tela acesa num Android;
  - conferir que no iPhone nada dá erro;
  - instalar o app nos dois;
  - o telão num projetor em sala clara;
  - compartilhar uma matéria no WhatsApp e no Instagram;
  - a notificação da crise chegando no celular.
- A primeira impressão de alguém do UFRGSMUN que nunca viu o app (critério de pronto do passo 37).
- Depois do evento: o questionário do piloto (`docs/piloto.md`).

## Testes

- [x] pgTAP `supabase/tests/41-cronograma-tipo.test.sql`: o padrão é "outro", o tipo escolhido fica gravado e um tipo fora da lista é recusado.
- [x] Ponta a ponta `tests/41-pendencias.spec.ts` (comitê `CSNU-T-41`):
  - o "Agora" e o cronograma mostram o tipo;
  - a secretaria cria um item com tipo;
  - com 15 placas, o filtro da fila acha uma delegação sem acento e sem maiúsculas.
- [x] Capturas do telão em modo crise geradas com `npm run capturas`.
