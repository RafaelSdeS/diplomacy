# Passo 25 · Trilha de navegação (voltar)

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 8)
**Depende de:** 20
**Esforço:** P
**Objetivo:** toda subtela tem um caminho de volta visível, inclusive no app instalado, que não tem o botão do navegador.

## Hoje

- Só a tela de regras ("Voltar ao comitê") e as de impressão (`ui/BotaoImprimir.svelte`) têm volta.
- Painel da presidência, chamada, agenda, documento, notícia e as telas da secretaria dependem do menu ou do botão do navegador.

## Decisões

- Uma trilha só, feita no layout a partir da rota. Nenhuma tela escreve a sua.
- No celular aparece só o nível de cima ("‹ Sessão"). No notebook, a trilha inteira ("UNOCT › Sessão › Presidência").
- Telas do menu principal não têm trilha. Telão e impressão também não (`semMoldura`).

## Código

- [ ] `src/lib/trilha.ts`: função pura `trilha(routeId, params, data)` que devolve `{ href, rotulo }[]`, com os rótulos já passados por `t()`. Os casos:

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
- [ ] `src/lib/ui/Trilha.svelte`: `<nav aria-label={t('Trilha')}>` com `<ol>`, separador decorativo `aria-hidden`; no celular, por CSS, só o último link com "‹".
- [ ] `src/routes/+layout.svelte`: renderiza `<Trilha>` acima de `{@render children()}` quando a trilha não está vazia (usa `page.route.id`, `page.params` e `page.data`).
- [ ] Remover o link "Voltar ao comitê" de `comite/[sigla]/regras/+page.svelte` (a trilha cobre).
- [ ] As rotas novas dos passos seguintes (`votacoes`, `delegacao/[id]`, `caderno`) entram na tabela quando forem criadas; esta lista já as prevê.

## Testes

Arquivos: `src/lib/trilha.test.ts` e `tests/25-trilha.spec.ts`.

- [ ] Vitest: cada linha da tabela acima; rota do menu devolve lista vazia.
- [ ] Ponta a ponta: no painel da presidência, "Sessão" volta à sessão; a 360 px aparece só "‹ Sessão"; no documento, a trilha leva aos blocos do comitê certo; axe (navegação com rótulo e `aria-current` no item atual).
- [ ] Capturas de referência das subtelas refeitas no CI (`workflow_dispatch` "atualizar_capturas").

## Pronto quando

- [ ] Nenhuma subtela depende do botão do navegador para voltar.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
