# Passo 43 · Fácil de achar, fácil de voltar, sem rolar

**Depende de:** 42
**Esforço:** G
**Objetivo:** depois de simular uma sessão como mesa e presidência, o usuário achou o app "bom no geral", mas pouco intuitivo: difícil de achar as coisas, sem mostrar claramente o país, com fluxo ruim e muita rolagem. O critério dele: *"fácil de achar o que eu quero, voltar de onde eu vim; útil e fácil de usar, senão ninguém usa."*

## Como ficou

| Problema | O que mudou |
|---|---|
| Rolar demais no painel | No notebook, o painel cabe na tela e cada coluna rola sozinha. A situação e as ações ficam numa barra só. "Assumir uma delegação", "Atalhos" e os ajustes de tempo e de forma do debate ficam recolhidos. Os avisos (chegadas, pausa, plenária, crise) vão para o topo da coluna central. À direita, a votação aberta vem primeiro |
| O país some | A faixa mostra bandeira, delegação e comitê (ou o papel, para mesa, crise, press e secretaria). O painel diz quem preside, com a bandeira |
| Voltar não volta | "‹ Voltar para <tela>" leva à tela de onde a pessoa veio (`src/lib/voltar.svelte.ts`, `history.back()` mantém rolagem e estado); por link direto, fica a trilha. Na trilha, a mesa volta ao Painel. O que se escreve volta a Documentos |
| Sair da sessão sem querer | No painel e na sessão, o nome da delegação abre a ficha (delegados, DPO, votos recentes) num diálogo lateral |
| Achar é difícil | Menu por tarefa (`src/lib/menu.ts`): Agora, Sessão ou Painel, Documentos, Mensagens; o resto em "Mais" no celular, tudo na lateral do notebook. Central de Documentos (`/comite/[sigla]/documentos`). "Ir para…" (Ctrl+K ou a lupa) acha telas, delegações e documentos. A aba Comitê virou atalhos com ícone e descrição, e as delegações, cartões com bandeira |
| Sessão do delegado longa | Duas colunas no notebook: a ação (votação, placa, ponto ou moção) e a sala (com a palavra, listas, votações). As telas da sessão numa linha no topo |
| Agora pouco útil | "Precisa de você": rodadas abertas, DPO pendente e bilhetes, cada um a um clique |
| Demonstração rasa | CSNU completo: 19 DPOs realistas, dois blocos, working papers, projeto aprovado pela mesa, projeto em rodada com propostas e comentários, cartas, crise com notas, notícias (`scripts/demonstracao/csnu.ts`) |

De quebra:
- **Sem rede:** o service worker lê os arquivos com hash com `ignoreVary`. Antes, só abria a tela que a pessoa já tinha aberto com rede.
- **Tamanho:** as bandeiras, a ficha e o "Ir para…" carregam sob demanda. A primeira abertura ficou em ~167 KB.

## Prioridade para o piloto: sessão unificada

Para o piloto, a área de trabalho da sessão não deve ganhar um conjunto novo de menus. Ela deve reunir somente o necessário para conduzir e participar da sessão sem trocar de página.

### Delegado

- No notebook, manter uma área dividida em duas partes: estado da sessão à esquerda e ações da delegação à direita.
- Na sessão, mostrar em um bloco persistente: orador, dois relógios, tópico, estado do debate e votação ativa.
- Manter uma área curta de **nota rápida** e **próxima fala** ligada ao orador e ao tópico atuais.
- Um campo curto pode ser salvo no caderno existente; não criar um editor completo de discurso nesta etapa.
- Não mostrar simultaneamente todas as ferramentas: ponto ou moção, placa, voto, caderno e crise aparecem conforme o estado.
- Ao mudar de orador ou voltar a sessão ao vivo, preservar o rascunho digitado e a posição de leitura.

### Mesa e presidência

- Mostrar em uma única área: situação da sessão, orador, fila curta, pedidos pendentes e votação ativa.
- Chamadas, ajustes de tempo e assumir delegação continuam fora da operação principal até serem necessários.
- Confirmar apenas ações coletivas ou irreversíveis; ações reversíveis podem desaparecer ou indicar desfazer.
- No celular da mesa, usar a versão curta do painel. Não empilhar todos os controles da sessão.

### Caderno curto da sessão

- Reutilizar a anotação já existente em vez de criar uma entidade ou produto paralelo.
- A captura deve identificar automaticamente: comitê, sessão, tópico, orador atual e hora.
- Usar tipos simples no piloto: “Nota”, “Sobre esta delegação” e “Fala”.
- O campo do celular precisa caber em uma folha curta ou em um modal pequeno, com uma única ação principal.
- Compartilhamento, presença entre editores e ensaio completo ficam fora da primeira entrega.

### Navegação

- A faixa interna da sessão não deve ser uma segunda barra permanente de sete links.
- Manter como contexto uma área curta e abrir o recurso completo em página dedicada.
- No celular, evitar barra fixa nova; usar os mesmos destinos “Agora”, “Sessão”, “Comitê” e “Mais”.
- No notebook, manter o contexto da sessão e usar os demais destinos apenas na lateral.

### Limites explícitos

- Não criar um editor colaborativo completo dentro da sessão.
- Não criar favoritos, layouts configuráveis ou muitos atalhos antes de validar o fluxo.
- Não alterar o modelo de dados além da associação entre nota rápida e contexto já definido pelo caderno.
- Não transformar presença por tecla, comentários por cláusula ou ensaio em tempo real em recursos obrigatórios do piloto.
- Estilo formal e hierarquia clara importam mais do que funcionalidade nova.

## Testes

- [x] `tests/43-fluxo.spec.ts`, por tarefa:
  - o painel cabe na tela;
  - a faixa mostra o país;
  - chamada e volta ao Painel;
  - a ficha abre sem mudar a URL;
  - Documentos e "Voltar";
  - "Para avaliar" da mesa;
  - "Mais" no celular;
  - "Ir para…";
  - axe.
- [x] Testes antigos ajustados ao menu, à trilha e à faixa (`irPeloMenu` em `tests/ajuda.ts`); capturas refeitas.
- [ ] Manual:
  1. `npm run db:resetar && npm run seed && npm run demo`;
  2. conduzir uma sessão com `demo.csnu.mesa1` e `demo.csnu.08`;
  3. ler os DPOs e o projeto em rodada com `demo.csnu.03`.
