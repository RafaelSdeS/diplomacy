# Passo 51 · Melhorias gerais de interface

**Parte de:** planos posteriores ([melhorias-interface](../melhorias-interface.pdf), [melhorias.txt](../melhorias.txt) e [melhorias depois da revisão](../melhorias-pos-revisao.pdf))
**Depende de:** 47
**Esforço:** G (em lotes pequenos, um por tela)
**Quando:** logo depois do 47 e do 52 (testes rápidos). Os lotes 0, 1 e 2 (ações em botões e modais, presidência e Agora) vêm **antes do piloto** (passo 12); os demais entram aos poucos, o ano todo, e congelam antes do ensaio de outubro de 2027.
**Objetivo:** cada tela mostra só o que vale para o momento, sem rolar para achar a ação principal; o resto do acabamento, tela por tela.

## O que construir

**Regra de rolagem**, que vale para todo lote: num notebook de 1366 × 768, a tarefa principal de cada papel cabe sem rolar; no celular, a ação principal aparece na primeira tela. Cada tela mostra só o que vale para a fase atual. O resto vira contagem que abre um painel lateral ou uma ficha do passo 47. Até três ações relacionadas ficam à vista; as demais vão para "Mais opções" (seção 11 de [melhorias-interface](../melhorias-interface.pdf)).

**Lote 0 · Ações claras: botões, modais e ícones** (pedido de 24/11/2026, depois de usar o app pronto do passo 47: "ainda está muito não intuitivo"). Vale para todas as telas e vem primeiro, porque muda o padrão que os lotes 1 e 2 seguem.

- **Formulário sempre aberto vira botão e modal.** Hoje várias abas são "uma caixa de texto e um botão", sem dizer para que servem. Agora, cada tela mostra o seu conteúdo (lista, histórico, situação), e a ação de criar algo é um botão com ícone e verbo ("Anotar sobre o Brasil", "Escrever carta") que abre um modal no centro da tela, com título e explicação curta. Telas que mudam:
  - **página da delegação:** a caixa "Anotação" vira "Anotar" (ícone de caderno), num modal já preenchido com a delegação;
  - **caderno:** "Nova anotação";
  - **mensagens:** "Novo bilhete" e "Falar com a mesa";
  - **cartas:** "Escrever carta";
  - **crise do delegado:** "Escrever à crise";
  - **blocos:** "Novo bloco" e "Novo documento";
  - **press:** "Pedir entrevista" e "Nova pergunta" (coletiva);
  - **secretaria:** "Novo aviso" e "Novo item" (cronograma);
  - **sessão do delegado:** "Ponto ou moção";
  - **agenda:** "Propor agenda".

  O rascunho continua salvo no aparelho, e fechar o modal com texto pede confirmação (o modal base já protege o clique no fundo).
- **Botão parece botão, link parece link.** Hoje muitas ações têm só cor de letra e sublinhado, sem fundo, e parecem links: os nomes que abrem fichas (`.abre-ficha` e `.nome-delegacao--ficha`, do passo 47) e os "Abrir", "Ler", "Ler e avaliar" e "Responder" das listas. A regra:
  - toda ação tem fundo (principal cheio, secundária com fundo claro) e, sempre que houver um, ícone;
  - sublinhado só em link de navegação dentro de texto corrido;
  - nas listas, a linha inteira é clicável, com uma seta no fim, quando abre uma ficha ou prévia.
- **As abas no modelo da aba Comitê**, que funcionou: cada aba começa com as suas ações em cartões ou botões com ícone, nome e uma linha de descrição (a `.grade-atalhos` de `/comite/<sigla>` e do "Mais"), e o conteúdo vem abaixo. Começar por Documentos, Mensagens, Cartas e Crise.
- **Cabeçalho só com ícones.** Perfil e Sair passam a ser só ícone, como a lupa e o sino, com `aria-label`, `title` e foco visível. Isso revê o passo 47, que dava texto aos dois. O Sair continua pedindo confirmação, então não há risco de sair sem querer. No celular, cabem quatro ícones (lupa, sino, Perfil e Sair), e tema e idioma ficam em "Mais".
- **Caderno de qualquer lugar.** Hoje, para anotar, é preciso ir até a aba Caderno. Passa a haver:
  - um botão "Anotar" (ícone de caderno) sempre à vista para o delegado, que abre o mesmo modal: sobre qual delegação (já preenchida com quem está com a palavra, ou com a ficha aberta) e o texto;
  - o mesmo botão na ficha e na página da delegação.

  A aba Caderno fica para ler e buscar. O registro é o da nota rápida do passo 46 (caixa de saída, sem rede também).

**Lote 1 · Presidência** (`/comite/<sigla>/sessao/presidencia`). Hoje empilha cerca de 13 blocos numa página: lista de oradores, próximos, pedidos de fala, chegadas, pausa, plenária, com a palavra, ajustes, votação, pedidos para aprovar, pontos e moções, projetos e emendas.

- Sempre à vista: com a palavra, o cronômetro e a lista com os próximos.
- Por contagem que abre um painel lateral: pedidos de fala, chegadas, pedidos para aprovar, pontos e moções.
- Só quando ativos: votação, plenária, projetos e emendas.
- Ajustes da fala e do debate num painel lateral, fora da coluna principal.

**Lote 2 · Agora** (`/`). Hoje empilha o bloco do papel e até cinco seções gerais (acontecendo agora, depois, avisos, respostas da crise, na press). O bloco do papel fica no topo; cada seção geral vira uma linha com contagem e o item mais recente, que abre o resto.

**Lotes seguintes**, pelas telas maiores: documento, mensagens, crise, blocos e secretaria.

**No lote dos blocos: trocar o redator** (prioridade pequena). Hoje o redator é quem cria o bloco. O banco já permite passar ou dividir a redação (`definir_redator`, passo 09), mas nenhuma tela usa isso. A tela do bloco ganha:

- **o redator passa ou divide:** "Redatores" lista os membros, e o redator atual marca outros, ou passa a redação, com `Confirmar`;
- **troca por consenso:** um membro propõe outro redator e a troca vale quando a maioria do bloco aceita. Esta parte só entra se o piloto mostrar blocos travados por um redator ausente.

**Em todos os lotes:**

- Trilha de voltar consistente; as fichas do passo 47 abrem em toda página onde o objeto aparece.
- Números clicáveis e placeholders de carregamento em CSS, sem imagens novas.
- Estados vazios que explicam a ausência e a próxima ação; filtros visíveis, com contagem e "limpar".
- Feedback de rascunho ("salvando", "salvo neste aparelho", "enviado", "não enviado") e de reconexão sem esvaziar a tela.
- Densidade por papel (confortável no celular, compacta no notebook) e consistência dos selos de estado.
- Revisão das telas de links secundários e do "Mais" no celular.

**Preferências** (seção 23 de [melhorias-interface](../melhorias-interface.pdf)), num lote próprio: até cinco destinos favoritos, que aparecem no topo do "Ir para…" e do "Mais"; tamanho do texto e densidade no Perfil, guardados no aparelho, sem configuração a cada sessão.

## Fora desta etapa

Itens que dependem de um segundo evento, habilidades especiais para delegações, edição livre simultânea e telas inteiras de personalização.

## Testes

- [ ] Lote 0, ponta a ponta: em cada tela da lista, a ação de criar é um botão que abre um modal no centro, e o texto digitado sobrevive a fechar e reabrir.
- [ ] Lote 0: anotar sobre uma delegação a partir da sessão, da ficha e da página da delegação, sem ir à aba Caderno.
- [ ] Lote 0: Perfil e Sair só com ícone, com nome acessível, no notebook e no celular.
- [ ] Lote 0, captura: nenhuma ação sem fundo nas telas revisadas (botões têm fundo; links sublinhados só em texto corrido).

- [ ] Ponta a ponta, a 1366 × 768: a área principal da presidência não rola em cada fase (debate, votação aberta, plenária) e a da Agora não rola para a mesa e para o delegado; o teste compara a altura do conteúdo com a da janela.
- [ ] Capturas e axe nas telas revisadas, no tema claro e no escuro.
- [ ] Ponta a ponta: o voltar leva à tela de origem e preserva filtro e rolagem.
- [ ] Ponta a ponta: um favorito marcado aparece no topo do "Ir para…" e continua lá depois de recarregar.
- [ ] Teclado e leitor de tela nas modais e nas fichas.
- [ ] Manual: uma pessoa nova encontra uma tarefa comum em poucos passos.
