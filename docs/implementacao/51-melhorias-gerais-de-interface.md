# Passo 51 · Melhorias gerais de interface

**Parte de:** planos posteriores ([melhorias-interface](../melhorias-interface.pdf), [melhorias.txt](../melhorias.txt) e [melhorias depois da revisão](../melhorias-pos-revisao.pdf))
**Depende de:** 47
**Esforço:** G (em lotes pequenos, cada um pode entrar antes no passo da mesma tela)
**Objetivo:** o acabamento que sobra depois das bases dos passos 44 a 48, tela por tela.

## O que construir

- Trilha de voltar e objetos clicáveis consistentes (delegação, votação, documento, ponto, moção e nota abrem o mesmo tipo de ficha em qualquer página).
- Números clicáveis e placeholders de carregamento em CSS, sem imagens novas.
- Estados vazios que explicam a ausência e a próxima ação; filtros visíveis, com contagem e "limpar".
- Feedback de rascunho ("salvando", "salvo neste aparelho", "enviado", "não enviado") e de reconexão sem esvaziar a tela.
- Densidade por papel (confortável no celular, compacta no notebook) e consistência dos selos de estado.
- Revisão das telas de links secundários e do "Mais" no celular.

## Fora desta etapa

Itens que dependem de um segundo evento, habilidades especiais para delegações e edição livre simultânea.

## Testes

- [ ] Capturas e axe nas telas revisadas, no tema claro e no escuro.
- [ ] Ponta a ponta: o voltar leva à tela de origem e preserva filtro e rolagem.
- [ ] Teclado e leitor de tela nas modais e nas fichas.
- [ ] Manual: uma pessoa nova encontra uma tarefa comum em poucos passos.
