# Passo 66 · Apoio automático, debate por lista e mais espaço na tela

**Parte de:** pedidos de 27/11/2026 (quem propõe já apoia; os documentos do tópico não devem chamar a atenção; "em foco" ilegível no escuro e sem como tirar; o olho na senha; o menu lateral que se recolhe; o país, o comitê e quem preside no cabeçalho; o caderno sem rolar; o painel da presidência com mais coisas à vista; a moção de debate por lista)
**Depende de:** 29 (moções), 51 (preferências), 59 (presidência), 63 e 64 (sala)
**Esforço:** M
**Objetivo:** menos cliques e menos rolagem, mais espaço para o que importa, e a moção de debate por lista que faltava.

## O que mudou

**Banco** (`20270105090000_apoio_e_debate_por_lista.sql`):

- **Apoio automático:** quem propõe uma mudança no working paper, ou uma alteração na agenda, já apoia a própria proposta. As propostas abertas antes da migração também ganharam o apoio de quem as fez. A mesa, que não tem voto, não ganha posição automática.
- **Moção de debate por lista:** qualquer delegação a pede no debate, inclusive a que preside. Vai a voto por maioria simples. Aprovada, o debate passa ao formal-formal: quem levanta a placa entra na lista, na ordem. Isso vale até outra moção ou até a presidência mudar a forma, e a presidência também pode escolher o debate por lista nos ajustes.

As funções mudadas são cópias das versões mais recentes, com a mudança marcada "Passo 66".

**Telas:**

- **Working paper:** os outros documentos do tópico saíram do topo e foram para um menu, "Documentos do tópico (n)", no fim da fileira de ações.
  - A folha é sempre branca, então passou a usar as cores do tema claro também no escuro. O "em foco", os selos e o destaque das linhas ficaram legíveis.
  - No painel da cláusula em foco, o botão vira "Tirar do foco".
- **Entrar:** a caixa "Mostrar senha" virou um olho dentro do campo, à direita, que mostra e esconde a senha.
- **Cabeçalho:**
  - mais baixo no notebook (de ~84 para ~50 px), com a marca numa linha só;
  - o país e o comitê vêm primeiro, antes dos ícones;
  - durante a sessão, a delegação que preside vê no próprio crachá uma faixa dourada, o martelo e "preside";
  - as outras veem ao lado "Preside: [bandeira] [país]", ou "Mesa";
  - o cabeçalho ouve só a tabela `sessao` (abrir, fechar, o rodízio) e relê a cada troca de tela. Ouvir o estado da sessão, que muda a cada fala, custaria uma leitura por mudança no celular, e o teste de consumo do passo 40 apontou isso. O custo: se a mesa assumir num caso excepcional, o cabeçalho só atualiza na próxima troca de tela. O quadro "Preside a sessão" da Agora e da Sessão continua ao vivo.
- **Menu lateral:** "Recolher o menu", no pé do menu, deixa só os ícones (3,5 rem). Ao passar o mouse, ou no foco do teclado, o menu abre por cima do conteúdo, sem empurrar a página. A escolha fica no aparelho, e "Fixar o menu" desfaz. No celular, a barra de baixo não muda.
- **Caderno:** com mais de três anotações na aba aparece a busca, sem acento, no texto, no título e na delegação, com "n de m". Cada anotação mostra três linhas, e "Ler" abre inteira.
- **Presidência:**
  - o título e a barra da sessão ficam numa linha só, e os cartões e espaços ficaram menores;
  - com o cabeçalho mais baixo, as colunas começam em y=167 em vez de y=330, a 1366 × 768: são 163 px a mais de altura útil;
  - no debate por lista, a coluna das placas vira "Lista de oradores, pela ordem das placas", e o botão principal dá a palavra à primeira; o "Escolher" sai. A ordem é só da tela: se for preciso, o banco passa a impô-la depois.
- **Regras** (`docs/regras-de-procedimento.md`): o formal-formal também vale no debate, por moção, e a tabela de moções ganhou o debate por lista.

## Testes

- **Banco:**
  - `07-plenaria-e-votacao`: a moção de lista vai a voto por maioria simples e, aprovada, põe o debate em formal-formal; a presidência pode voltar ao formal-informal.
  - `60` e `63`: a proposta nasce com o apoio de quem a fez.
- **Ponta a ponta:**
  - `66-espaco-e-lista` cobre quem preside no cabeçalho (para a delegação da vez e para as outras), a moção de lista com a palavra na ordem das placas, o menu que se recolhe e lembra a escolha, e a busca do caderno.
  - `03` cobre o olho da senha; `22` e `63`, o apoio automático e o menu dos documentos do tópico; `34`, o "Ler" nas anotações recebidas.
- **Capturas:** o cabeçalho mudou em todas, e elas foram regravadas.
