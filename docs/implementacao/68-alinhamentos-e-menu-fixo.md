# Passo 68 · Blocos alinhados, Agora sem vãos e o menu lateral sempre à mão

**Parte de:** uso de 27/11/2026, depois do passo 67:

- "O bloco que os EUA fazem parte, OTAN, fica com a bandeira dos EUA na extrema direita e o nome OTAN na extrema esquerda".
- "A caixa de 'precisa de você' na aba Agora fica com quase metade dela desocupada no notebook. Mesma coisa para o 'Crise urgente'".
- "Deixe que o menu lateral não mude de lugar, mesmo com scroll".

**Depende de:** 62, 66, 67
**Esforço:** P
**Objetivo:** corrigir o alinhamento e os vãos e deixar o menu sempre à vista.

## Causas e correções (só CSS)

- **Blocos na Sessão.**
  - *Causa:* a regra `.blocos-da-sessao li`, que alinha à esquerda, vinha antes no CSS que `.lista li`, que espalha os itens. As duas tinham a mesma especificidade, então valia a que vinha depois.
  - *Correção:* agora é `.blocos-da-sessao .lista li`, de especificidade maior. O nome fica em cima e os membros embaixo, na mesma margem. O bloco da própria delegação ganha um respiro dos lados e a linha dourada.
- **Agora.**
  - *Causa:* o cartão sozinho já ocupava a linha inteira (passo 62), mas o conteúdo tinha os limites de leitura de fora dos cartões. A lista tinha `max-width: 48rem` e o parágrafo, `70ch`.
  - *Correção:* `.cartao .lista` e `.alerta-crise p` deixam de ter esse limite, porque a largura do cartão já é o limite. O "Precisa de você" e o resumo da crise usam a largura toda.
- **Menu lateral.**
  - *Correção:* no notebook, a lista do menu é `position: sticky` (presa ao topo da tela) e acompanha a rolagem; o `<nav>` segue esticado na coluna, com o fundo e a borda.
  - *Um detalhe que impedia isso:* o modo recolhido usava `overflow: hidden`, que transforma o menu num contêiner de rolagem e impede o `sticky`. Agora é `overflow: clip`, que corta igual.
  - No celular, a barra de baixo já era fixa.

**Lição:** uma regra nova que contradiz uma antiga de mesma especificidade precisa de especificidade maior, porque é a ordem no CSS que decide.

## Testes

- `66`: numa janela baixa, com a página rolada até o fim, o "Agora" do menu continua à vista, fixado e recolhido.
- `67`: o primeiro membro do bloco fica na mesma margem do nome, numa linha abaixo.
- `35`: o resumo da crise ocupa pelo menos 85% da largura da faixa.
