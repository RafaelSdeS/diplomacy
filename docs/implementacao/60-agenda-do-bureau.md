# Passo 60 · A agenda parte do documento do bureau

**Parte de:** uso de 25/11/2026 ("normalmente o bureau já tem um documento das agendas pré-organizadas; os delegados podem debater essa agenda e definir uma ordem de debate, e também introduzir ou retirar coisas da agenda")
**Depende de:** 22 (agenda), 56 (aba Agenda e editor de itens); o 58 (documentos da mesa), quando vier, permite partir do documento publicado
**Esforço:** M–G (reusa o editor e as posições do passo 57)
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

## O que construir

### 1. A agenda do bureau, cadastrada antes e liberada no dia

- A secretaria ou a mesa cadastra, antes do evento, a **agenda do bureau** de cada tópico, colando a lista do documento que o bureau já tem no editor de itens (passo 56). Com o passo 58, também a partir do documento publicado pela mesa.
- Ela fica **oculta das delegações** (RLS) até a mesa ou a secretaria tocar **"Liberar a agenda"** no dia do evento. Liberada, aparece no topo da aba Agenda como **"Agenda do bureau · tópico N"**.

### 2. A agenda é um documento, e se altera como um working paper

- Cada tópico tem **uma agenda**, não várias propostas inteiras lado a lado (o modelo do passo 56 sai). Ela usa o mesmo editor do passo 57: cada item é um bloco, com o andamento ("em debate", "debatido") e os sinais.
- As delegações, na primeira sessão do tópico, **propõem alterações por item**: mudar o texto, incluir um item (num ponto escolhido), retirar um item, mudar a ordem (a ordem de debate). Também comentam e marcam a posição (apoio, ressalva, contra), como nas cláusulas.
- Quem aceita ou recusa cada alteração é **a presidência da sessão**, como o redator no working paper. A mesa, na primeira sessão, quando é ela quem preside.
- A versão final é **adotada pela sala** (moção ou consenso, como hoje), e a presidência registra a adoção. A trilha do tópico passa aos working papers.
- Depois de adotada, a agenda continua alterável pelo mesmo caminho durante o debate do tópico (incluir, retirar ou reordenar um item), com o andamento dos itens preservado.

### 3. O que sai do passo 56

- "Propor agenda", "Usar como base" e as propostas lado a lado dão lugar às alterações por item na agenda do bureau. O editor de itens fica para o cadastro da agenda pela mesa.

## Testes

- [ ] pgTAP: a agenda do bureau é única por tópico e oculta das delegações até ser liberada; as delegações propõem alterações por item; só a presidência da sessão (ou a mesa, na primeira sessão) aceita; a adoção preserva o andamento.
- [ ] Ponta a ponta: a mesa cadastra a agenda colando uma lista e a libera; uma delegação propõe mover um item e incluir outro; a presidência aceita uma e recusa a outra; a sala adota; durante o debate, uma retirada é proposta e aceita.
