# Passo 60 · A agenda parte do documento do bureau

**Parte de:** uso de 25/11/2026 ("normalmente o bureau já tem um documento das agendas pré-organizadas; os delegados podem debater essa agenda e definir uma ordem de debate, e também introduzir ou retirar coisas da agenda")
**Depende de:** 22 (agenda), 56 (aba Agenda e editor de itens); o 58 (documentos da mesa), quando vier, permite partir do documento publicado
**Esforço:** M–G (reusa o editor e as posições do passo 57)
**Situação:** pronto (25/11/2026).
**Quando:** antes do piloto, depois do 59: o roteiro começa pela agenda.
**Objetivo:** cada tópico chega ao comitê, no dia do evento, com a agenda do bureau à vista. A primeira sessão do tópico altera essa agenda como se altera um working paper (ordem, itens a mais, itens a menos), em vez de cada delegação escrever uma do zero.

## Como é hoje

- Cada delegação escreve uma proposta inteira, do zero (passo 56: editor de itens ou "Colar uma lista"). A mesa pode fazer uma "Sugestão da mesa", mas ela é só mais uma proposta entre as outras, e ninguém a prepara antes do evento.
- "Usar como base" copia uma proposta para o editor, mas o resultado é outra proposta inteira: não se vê o que mudou em relação à base.
- Depois de adotada, só a mesa edita a agenda; as delegações não têm como pedir para incluir ou tirar um item no meio do debate.
- A dúvida aberta em regras-de-procedimento.md ("quem sugere a agenda informal?") foi respondida em 25/11/2026: o bureau sugere; as delegações debatem, reordenam, incluem e retiram.

## Decisões (25/11/2026)

1. **A agenda do bureau só é liberada no dia do evento.** Ela existe para que as delegações não comecem do zero, e não é material de estudo prévio.
2. **A primeira sessão de cada tópico é para discutir a agenda**, e alterar a agenda funciona como alterar um working paper: proposta de alteração por item, comentários, posição num toque, aceitar ou recusar.
3. **As alterações entram por consenso** (25/11/2026): debatidas por todas as delegações, entram quando há um certo consenso. A presidência não decide: ela só conduz a fala, o tempo e as moções.

## O que construir

### 1. A agenda do bureau, cadastrada antes e liberada no dia

- A secretaria ou a mesa cadastra, antes do evento, a **agenda do bureau** de cada tópico, colando a lista do documento que o bureau já tem no editor de itens (passo 56). Com o passo 58, também a partir do documento publicado pela mesa.
- Ela fica **oculta das delegações** (RLS) até a mesa ou a secretaria tocar **"Liberar a agenda"** no dia do evento. Liberada, aparece no topo da aba Agenda como **"Agenda do bureau · tópico N"**.

### 2. A agenda é um documento, e se altera como um working paper

- Cada tópico tem **uma agenda**, não várias propostas inteiras lado a lado (o modelo do passo 56 sai). Ela usa o mesmo editor do passo 57: cada item é um bloco, com o andamento ("em debate", "debatido") e os sinais.
- As delegações, na primeira sessão do tópico, **propõem alterações por item**: mudar o texto, incluir um item (num ponto escolhido), retirar um item, mudar a ordem (a ordem de debate). Também comentam e marcam a posição (apoio, ressalva, contra), como nas cláusulas.
- **Todas as delegações debatem cada alteração** e marcam apoio, ressalva ou contra; **havendo consenso, ela entra** (decidido em 25/11/2026). O app mostra quando há consenso (nenhum "contra" e o apoio de pelo menos metade das delegações), e **a presidência da sessão ou a mesa** registra a inclusão ou a recusa (ajuste de 25/11/2026). Fora isso, a presidência participa da agenda como qualquer delegação.
- A versão final é **adotada pela sala** (moção ou consenso, como hoje), e a mesa registra a adoção. A trilha do tópico passa aos working papers.
- Depois de adotada, a agenda continua alterável pelo mesmo caminho durante o debate do tópico (incluir, retirar ou reordenar um item), com o andamento dos itens preservado.

### 3. O que sai do passo 56

- "Propor agenda", "Usar como base" e as propostas lado a lado dão lugar às alterações por item na agenda do bureau. O editor de itens fica para o cadastro da agenda pela mesa.

## Testes

- [x] pgTAP: a agenda do bureau é oculta das delegações até ser liberada; as delegações propõem alterações por item e marcam posição; só a mesa inclui ou recusa (a presidência, não); incluir, retirar, mover e alterar mudam a agenda no lugar.
- [x] Ponta a ponta: a mesa cadastra a agenda colando uma lista e a libera; uma delegação propõe mover um item e incluir outro; as outras marcam apoio, o app mostra o consenso, e a mesa inclui uma e recusa a outra; a sala adota.

## Como ficou

- Migração `20261226090000_agenda_do_bureau.sql`: a agenda do bureau é a sugestão da mesa do tópico (`proposta_agenda` sem delegação) com `liberada`; a RLS a esconde das delegações até `liberar_agenda` (ou até a adoção). `alteracao_agenda` (alterar, incluir depois de / dentro de, retirar, mover para depois de / para o começo, com motivo) e `posicao_alteracao` (apoio, ressalva, contra; uma por delegação; a mesa também). `responder_alteracao_agenda` é da mesa e, desde `20261227090000_agenda_presidencia.sql`, também da presidência da sessão e muda o item no lugar: o texto, a inclusão depois da subárvore do item, a retirada (com os de dentro; os working papers ficam sem o item) e a mudança de lugar com os de dentro. A adoção continua com a mesa (`adotar_proposta`), registrando o que a sala decidiu.
- Aba Agenda: sem agenda, a mesa vê "Cadastrar a agenda do bureau" (o editor de itens do passo 56) e a delegação vê que ela será liberada no dia; antes de liberar, a mesa edita e libera ("oculta das delegações"); liberada, cada item tem "Propor alteração" (ícone) e o cartão tem "Propor um item no fim". "Alterações propostas" mostra as abertas, com as posições, o selo "consenso" (nenhum contra e o apoio de pelo menos metade das delegações) e, para a mesa, "Incluir" e "Recusar"; as respondidas ficam recolhidas no cartão da agenda. A mesa registra a adoção ("A sala adotou a agenda do tópico N?").
- O que saiu do passo 56: as propostas inteiras lado a lado, "Usar como base", "Propor agenda" para as delegações e "Trazer os itens de…". As propostas antigas de delegações continuam no banco, sem tela.
- Comentários por item não foram feitos: o motivo da alteração e as posições cobrem o debate.
