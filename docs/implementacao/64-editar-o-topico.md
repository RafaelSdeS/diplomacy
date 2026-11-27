# Passo 64 · Editar o tópico, da agenda à resolução

**Parte de:** pedido de 27/11/2026 ("gostaria que a edição de documentos ficasse mais intuitiva e fácil de usar. Aproveite bem todo o espaço da tela, mas sem dar MUITA informação ao mesmo tempo na tela, usando modais por exemplo"; "inclua nisso desde a agenda até a resolução final, melhore todo o pipeline de edição")
**Depende de:** 60, 62, 63
**Esforço:** M
**Objetivo:** a agenda, o working paper e o projeto funcionam do mesmo jeito. O texto aparece limpo e na largura toda, e cada coisa a fazer fica a um clique, num painel. Do item da agenda à resolução aprovada, cada etapa leva à próxima.

## O que mudou

**O mesmo esqueleto na agenda e na sala.** No notebook, a tela tem duas colunas:

- **À esquerda, o texto**, na largura que sobra. Cada item ou cláusula é uma linha só, sem nenhum botão dentro. No máximo dois selos aparecem: o andamento ou "em foco", e o número de propostas (verde quando alguma tem consenso). As propostas de incluir algo no fim ficam numa linha tracejada no fim do texto.
- **À direita, o resumo**, fixo ao rolar:
  - a situação, numa frase;
  - os filtros das propostas;
  - as assinaturas;
  - as alterações abertas (na agenda, cada uma leva ao item dela);
  - o histórico, recolhido.

No celular, o resumo desce para depois do texto. A ação principal de cada papel fica em cima, sem rolar: propor, assinar ou a ação da mesa.

**O painel à direita.** Clicar num item ou numa cláusula abre um painel lateral, o `<Modal lateral>`. Ele tem a mesma largura da coluna do resumo, então cobre o resumo e deixa o texto à vista. O painel mostra:

1. o texto do item ou da cláusula;
2. os verbos, com ícone: **Mudar o texto · Incluir depois · Mudar de lugar · Retirar**. Cada um troca o painel pelo formulário dele, com "Voltar". Isso substitui o rádio "O que mudar";
3. as propostas daquele item, com a posição e a decisão;
4. as ações de quem preside ou da mesa: "Pôr em foco", "Corrigir" (no projeto, a correção de forma no próprio painel) e, na agenda, o andamento.

Depois de propor, o painel volta ao item, já com a proposta na lista. Os três modais de antes (propor e corrigir na sala, alterar na agenda) passaram a viver no painel.

**As etapas ligadas.**

- **Agenda → working paper:** o painel de um item grande adotado tem "Abrir o working paper deste item".
- **Working paper ou projeto → trilha:** a sala mostra a trilha do tópico no topo, como a agenda e a aba Documentos.
- **Projeto → fase de ação:** na fase de ação, a mesa tem "Conduzir a fase de ação", que abre a Presidência já com a lista dos projetos (`?projetos`). A delegação tem "Acompanhar na Sessão".
- **Resolução:** aprovado, o projeto se chama "Resolução do tópico n" e põe o Imprimir como ação principal, com um link para as Votações. Na trilha, a etapa "Resolução" leva a esse texto. Sem resolução aprovada, ela continua levando às votações.

## Tarefas, em cliques (testes 22 e 63)

| Tarefa | Cliques |
|---|---|
| O redator propõe uma mudança numa cláusula | 3 (a cláusula, "Mudar o texto", "Propor") |
| Quem preside aceita uma proposta com consenso | 2 (a cláusula, "Aceitar") |
| Do item da agenda ao working paper dele | 2 (o item, "Abrir o working paper deste item") |
| Do projeto na fase de ação à lista da Presidência | 1 |

O teste 63 confere também que o painel abre à direita sem cobrir a cláusula, no notebook de 1366 × 768.

**Um falso positivo achado no caminho.** O andamento de um item só muda com uma sessão aberta, e o banco recusa sem ela. O seletor antigo, na árvore, continuava mostrando o valor escolhido mesmo quando a mudança era recusada, então o teste 22 passava sem gravar nada. O painel relê o valor gravado, o que expôs o problema. Agora o seletor volta ao andamento gravado quando a mudança é recusada, e o teste 22 abre uma sessão antes de marcar o andamento.

## Fora deste passo

- **O editor antigo do bloco e a resolução de crise** (`/documento/[id]`), os documentos da mesa e as matérias da press continuam como estavam.
- **"Próxima proposta" dentro do painel**, para quem preside decidir em sequência: só se o piloto pedir.
- **Um componente comum de posição e decisão:** a sala e a agenda têm cada uma o seu, porque as chamadas ao banco e os rótulos são diferentes. Vale extrair se uma terceira tela precisar.
