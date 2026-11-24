# Passo 51 · Melhorias gerais de interface

**Parte de:** planos posteriores ([melhorias-interface](../melhorias-interface.pdf), [melhorias.txt](../melhorias.txt) e [melhorias depois da revisão](../melhorias-pos-revisao.pdf))
**Depende de:** 47
**Esforço:** G (em lotes pequenos, um por tela)
**Quando:** logo depois do 47. Os lotes 1 e 2 (presidência e Agora) vêm **antes do piloto** (passo 12); os demais entram aos poucos, o ano todo, e congelam antes do ensaio de outubro de 2027.
**Objetivo:** cada tela mostra só o que vale para o momento, sem rolar para achar a ação principal; o resto do acabamento, tela por tela.

## O que construir

**Regra de rolagem**, que vale para todo lote: num notebook de 1366 × 768, a tarefa principal de cada papel cabe sem rolar; no celular, a ação principal aparece na primeira tela. Cada tela mostra só o que vale para a fase atual. O resto vira contagem que abre um painel lateral ou uma ficha do passo 47. Até três ações relacionadas ficam à vista; as demais vão para "Mais opções" (seção 11 de [melhorias-interface](../melhorias-interface.pdf)).

**Lote 1 · Presidência** (`/comite/<sigla>/sessao/presidencia`). Hoje empilha cerca de 13 blocos numa página: lista de oradores, próximos, pedidos de fala, chegadas, pausa, plenária, com a palavra, ajustes, votação, pedidos para aprovar, pontos e moções, projetos e emendas.

- Sempre à vista: com a palavra, o cronômetro e a lista com os próximos.
- Por contagem que abre um painel lateral: pedidos de fala, chegadas, pedidos para aprovar, pontos e moções.
- Só quando ativos: votação, plenária, projetos e emendas.
- Ajustes da fala e do debate num painel lateral, fora da coluna principal.

**Lote 2 · Agora** (`/`). Hoje empilha o bloco do papel e até cinco seções gerais (acontecendo agora, depois, avisos, respostas da crise, na press). O bloco do papel fica no topo; cada seção geral vira uma linha com contagem e o item mais recente, que abre o resto.

**Lotes seguintes**, pelas telas maiores: documento, mensagens, crise, blocos e secretaria.

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

- [ ] Ponta a ponta, a 1366 × 768: a área principal da presidência não rola em cada fase (debate, votação aberta, plenária) e a da Agora não rola para a mesa e para o delegado; o teste compara a altura do conteúdo com a da janela.
- [ ] Capturas e axe nas telas revisadas, no tema claro e no escuro.
- [ ] Ponta a ponta: o voltar leva à tela de origem e preserva filtro e rolagem.
- [ ] Ponta a ponta: um favorito marcado aparece no topo do "Ir para…" e continua lá depois de recarregar.
- [ ] Teclado e leitor de tela nas modais e nas fichas.
- [ ] Manual: uma pessoa nova encontra uma tarefa comum em poucos passos.
