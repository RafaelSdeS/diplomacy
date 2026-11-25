# Passo 56 · A ordem do tópico: agenda, working papers, resolução

**Parte de:** pedido de 24/11/2026 ("primeiro se debate a agenda, depois os working papers, que viram as resoluções; essa ordem não está clara"; "a aba Agenda ainda não está intuitiva"; "a aba Documentos pode ter menos rolagem e menos informação desnecessária")
**Depende de:** 22 (agenda antes das resoluções), 09 (blocos e documentos), 51 lote 0, 54 e 55
**Esforço:** M
**Quando:** depois do 55 e antes do piloto: o roteiro do piloto passa pela agenda, pelo working paper e pelo projeto.
**Objetivo:** cada tópico mostra em que etapa está, a etapa seguinte e onde fazer cada coisa. A aba Agenda serve para propor e adotar sem aprender uma sintaxe. A aba Documentos segue a mesma ordem, sem rolar.

## A ordem (como o comitê trabalha)

1. **Agenda.** O comitê debate *o que* será discutido no tópico e numa ordem sugerida, que não precisa ser seguida. A mesa adota uma proposta.
2. **Working papers.** Durante o debate, os blocos escrevem working papers sobre os itens da agenda. Eles são **assinados, não votados**. O bureau aprova para que possam ser mencionados.
3. **Projeto de resolução.** Baseado nos working papers, com no mínimo 5 signatários. Vai ao bureau, e então a consenso ou a voto.
4. **Resolução.** O projeto aprovado. Uma por tópico: aprovada, o comitê passa ao próximo tópico.

## Como é hoje

- **A ordem só existe no banco e em avisos soltos.** O banco recusa um projeto antes da agenda adotada (`criar_documento`, passo 22). A agenda mostra duas etapas ("Debate da agenda" → "Agenda adotada: working papers e projetos"). O modal "Novo documento" desabilita os tópicos sem agenda, com um aviso. Nada mostra as quatro etapas juntas, nem em que etapa cada tópico está.
- **O working paper não depende da agenda**, e o projeto não depende de working paper: "Trazer cláusulas de working papers" é uma seção opcional no fim do editor.
- **Aba Agenda** (`sessao/agenda`):
  - uma lista de tópicos;
  - depois, para cada tópico, todas as propostas empilhadas em cartões;
  - no fim, o formulário de proposta, uma caixa de texto em que "dois espaços ou um traço põem o item dentro do anterior".

  A agenda adotada fica misturada com as outras propostas (só um selo "Adotada"), e editá-la abre outra caixa de texto no fim da seção.
- **Aba Documentos:**
  - a grade de atalhos;
  - "Para avaliar" (mesa), "Seu DPO", "Dos seus blocos" e "Cartas";
  - "Do comitê", que junta projetos, working papers e todos os DPOs numa lista só, longa.

## O que construir

### 1. A trilha do tópico (`TrilhaDoTopico.svelte`)

Uma faixa com as quatro etapas: Agenda → Working papers → Projeto → Resolução. Cada etapa mostra:

- o estado: feita, atual ou ainda não;
- uma contagem ("3 working papers", "1 projeto, 5 de 5 assinaturas");
- um clique que leva ao lugar certo: a agenda, a lista filtrada de documentos ou a votação.

A etapa atual tem uma linha que diz o que fazer agora, por papel:

- **delegação, agenda em debate:** "Proponha ou apoie uma agenda";
- **delegação, agenda adotada:** "Escreva um working paper com o seu bloco";
- **mesa, agenda em debate:** "Adote uma agenda quando o comitê decidir".

Onde aparece:

- **Sessão e Agora:** sob "Tópico em debate", compacta (só os ícones das etapas e a atual por extenso);
- **Agenda e Documentos:** no topo, completa, uma por tópico;
- **Blocos e "Novo documento":** a etapa explica por que um tipo de documento ainda não pode ser criado.

Os dados já existem (`proposta_agenda.adotada`, `documento.tipo/status/topico`, votações). É um `load` a mais, ou um derivado do que as telas já carregam.

### 2. As regras da ordem

- **Working paper só depois da agenda adotada** (decidido em 24/11/2026). O `criar_documento` recusa o working paper de tópico sem agenda adotada, como já recusa o projeto, e o working paper passa a pedir o item da agenda (subtópico), que hoje é opcional.
- **Projeto livre, com os working papers à mão** (decidido em 24/11/2026: "a resolução é basicamente os working papers de determinado tópico juntos no final, então deixe isso livre"). Nenhuma regra nova no banco: o projeto pode começar em branco ou dos working papers, e o bloco junta o que quiser, quando quiser.
  - "Novo projeto" pede só o tópico e o título, como hoje.
  - No editor, "Trazer de working papers" sobe do fim da página para a barra do documento e abre um modal. Ele mostra os working papers do **mesmo tópico**, de qualquer bloco, os aprovados primeiro. Há "Trazer todas as cláusulas" por working paper e a escolha por cláusula. Hoje a lista mostra todos os working papers do comitê, sem filtro de tópico, no fim da página.
  - A origem de cada cláusula já é guardada (`clausula.origem_id`), e o projeto mostra "Baseado em: WP 2, WP 3".
- **Uma resolução por tópico, à vista:** aprovada a resolução, a trilha marca o tópico como encerrado e mostra o próximo. A regra já é do banco.

### 3. A aba Agenda, refeita

- **Um tópico por vez:** abas no topo ("Tópico 1 · Tópico 2"), abrindo no tópico em debate. A trilha do tópico vem logo abaixo.
- **A agenda adotada em destaque:** quando há uma, ela vem primeiro, num cartão largo, como uma lista numerada (1, 1.1, 1.1.1), com o andamento de cada item ("em debate", "com 2 working papers"). As outras propostas ficam recolhidas em "Outras propostas (3)".
- **Sem agenda adotada, as propostas lado a lado,** em colunas (como no roteiro do piloto: "as propostas lado a lado"), com a bandeira da delegação e uma ação para a mesa: "Adotar esta", com `Confirmar`.
- **Propor sem sintaxe:** o botão "Propor agenda" abre um modal largo com um editor de itens. Cada item é uma linha com três controles:
  - "+ Item" e "+ Subitem";
  - ⟵ e ⟶, para subir ou descer de nível;
  - ↑ e ↓, para mudar a ordem.

  Com o teclado: Enter cria o próximo item, Tab desce de nível e Shift+Tab sobe. A caixa de texto com espaços fica só como "Colar uma lista" (quem já tem a agenda escrita cola e o app monta os itens). O mesmo editor serve para a mesa editar a agenda adotada, que hoje abre outra caixa no fim da página.
- **Partir de outra proposta:** "Usar como base" copia uma proposta para o editor, para quem quer só ajustar.

### 4. A aba Documentos, pela ordem

Na regra de rolagem do passo 51: a 1366 × 768, nada rola.

- **Topo:** a grade de atalhos (DPO, Blocos, Cartas, Caderno), mais "Documentos da mesa" (passo 58).
- **"Para você"**, uma linha por pendência, só quando há pendência:
  - a mesa avalia (contagem);
  - meu bloco tem rodada aberta (até quando);
  - falta minha assinatura num documento do meu bloco.
- **Por tópico, a trilha com as listas:** cada etapa é uma linha com a contagem que abre um modal com a lista (bandeiras dos signatários, estado, prévia). Em vez da lista única "Do comitê":
  - Agenda;
  - Working papers;
  - Projetos;
  - Resoluções.
- **DPOs:** uma linha "DPOs (12 de 15)" que abre um modal com a grade de bandeiras. Hoje cada DPO é uma linha da lista.
- **Cartas:** uma linha com a contagem e a mais recente, e "Ver todas" abre a aba Cartas.
- "Seu DPO" e "Dos seus blocos" viram linhas curtas dentro de "Para você", ou somem quando não há nada a fazer. O DPO enviado não precisa ocupar um cartão.

## Decisões (24/11/2026)

1. **Working paper só depois da agenda adotada:** sim. O banco recusa, como já faz com o projeto (passo 22).
2. **O working paper tem signatários, sem mínimo,** como o app já faz; não é votado. [regras-de-procedimento.md](../regras-de-procedimento.md) foi corrigido.
3. **O projeto é livre:** pode começar em branco ou dos working papers do tópico, sem regra no banco.

## Fora desta etapa

Votar a agenda no app (a adoção continua um ato da mesa, depois da moção ou do consenso da sala), arrastar itens com o mouse (os botões e o teclado bastam) e mais de uma resolução por tópico.

## Testes

- [ ] pgTAP: working paper de tópico sem agenda adotada é recusado; projeto em branco é aceito; projeto guarda a origem das cláusulas trazidas.
- [ ] Unidade: a etapa atual da trilha para cada combinação (sem agenda, agenda adotada, working paper aprovado, projeto enviado, em votação, resolução aprovada).
- [ ] Unidade: o editor de itens gera a mesma árvore que a sintaxe de espaços (`niveis()`), e "Colar uma lista" monta os itens.
- [ ] Ponta a ponta: delegação propõe uma agenda só com botões e teclado; a mesa compara lado a lado e adota; a trilha muda de etapa na sessão, sem recarregar.
- [ ] Ponta a ponta: um projeto em branco traz, pelo modal, as cláusulas de dois working papers do tópico (de blocos diferentes) e mostra "Baseado em"; working papers de outro tópico não aparecem.
- [ ] Ponta a ponta, a 1366 × 768: Agenda e Documentos não rolam para a mesa e para a delegação, com dados do CSNU-T de exemplo.
- [ ] axe nas abas e no editor de itens, no tema claro e no escuro.
