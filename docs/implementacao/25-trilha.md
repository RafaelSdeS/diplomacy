# Passo 25 · Trilha de navegação (voltar)

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 8)
**Depende de:** 20
**Esforço:** P
**Objetivo:** toda subtela tem um caminho de volta visível, inclusive no app instalado, que não tem o botão do navegador.

## Como ficou

- `src/lib/trilha.ts` (com Vitest) devolve os níveis acima da rota; `ui/Trilha.svelte` mostra no topo de toda subtela, pelo layout. No celular, só "‹ nível de cima".
- Saiu o "Voltar ao comitê" das regras.

## Antes

- Só a tela de regras ("Voltar ao comitê") e as de impressão (`ui/BotaoImprimir.svelte`) têm volta.
- Painel da presidência, chamada, agenda, documento, notícia e as telas da secretaria dependem do menu ou do botão do navegador.

## Decisões

- Uma trilha só, feita no layout a partir da rota. Nenhuma tela escreve a sua.
- No celular aparece só o nível de cima ("‹ Sessão"). No notebook, a trilha inteira ("UNOCT › Sessão › Presidência").
- Telas do menu principal não têm trilha. Telão e impressão também não (`semMoldura`).

## Código

- [x] `src/lib/trilha.ts`: função pura `trilha(routeId, params, data)` que devolve `{ href, rotulo }[]`, com os rótulos já passados por `t()`. Os casos:

  | Rota | Trilha |
  |---|---|
  | `/comite/[sigla]/(regras, blocos, dpo, cartas, mensagens, crise, votacoes, caderno)` | Comitê |
  | `/comite/[sigla]/delegacao/[id]` | Comitê |
  | `/comite/[sigla]/sessao/(presidencia, chamada, agenda)` | Comitê › Sessão |
  | `/documento/[id]` | Comitê › Blocos e documentos (a sigla vem de `data.documento.bloco.comite.sigla`, que o load já traz) |
  | `/press/[sigla]`, `/press/(escrever, entrevistas, coletiva)` | Press |
  | `/secretaria/*` (menos participantes) | Participantes |
  | `/perfil/meus-dados` | Perfil |

  O rótulo "Comitê" mostra a sigla ("UNOCT").
- [x] `src/lib/ui/Trilha.svelte`: `<nav aria-label={t('Trilha')}>` com `<ol>`, separador decorativo `aria-hidden`; no celular, por CSS, só o último link com "‹".
- [x] `src/routes/+layout.svelte`: renderiza `<Trilha>` acima de `{@render children()}` quando a trilha não está vazia (usa `page.route.id`, `page.params` e `page.data`).
- [x] Remover o link "Voltar ao comitê" de `comite/[sigla]/regras/+page.svelte` (a trilha cobre).
- [x] As rotas novas dos passos seguintes (`votacoes`, `delegacao/[id]`, `caderno`) entram na tabela quando forem criadas; esta lista já as prevê.

## Testes

Arquivos: `src/lib/trilha.test.ts` e `tests/25-trilha.spec.ts`.

- [x] Vitest: cada linha da tabela acima; rota do menu devolve lista vazia.
- [x] Ponta a ponta: no painel da presidência, "Sessão" volta à sessão; nas regras, a sigla volta ao comitê; a 360 px aparece só "‹ Sessão"; axe. A trilha lista só os níveis de cima (o título da página é o item atual), então não precisa de `aria-current`; o caso do documento fica no Vitest.
- [ ] Capturas de referência das subtelas refeitas no CI (`workflow_dispatch` "atualizar_capturas"), junto com as dos outros passos.

## Pronto quando

- [x] Nenhuma subtela depende do botão do navegador para voltar.
- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
