# Passo 63 · Um working paper por item da agenda, de toda a sala, e um projeto por tópico

**Parte de:** decisões de 26/11/2026 ("só um documento por tópico fica melhor e mais simples, com os blocos se disputando e o redator propondo as mudanças"; "quem aceita ou rejeita as propostas de mudança do documento é o presidente, que deve fazer essas decisões após os debates e todos chegarem a um consenso"; "uma delegação sem bloco seria basicamente um bloco de uma delegação apenas. Quem entra em um bloco delega a responsabilidade de escrita ao redator"; "grupo de mensagens de cada bloco"; "todos já começaram trabalhando em um único working paper, para evitar confusões"; "deixe com a mesa, que vai escutar os delegados e dar o seu aval para virar projeto")
**Depende de:** 09, 56, 57, 60 (a agenda e o fluxo de alteração, que este passo repete), 62 (lote 1)
**Esforço:** G
**Quando:** antes do piloto, logo depois dos lotes 2 e 3 do passo 62
**Objetivo:** a sala inteira trabalha junta: um working paper por grande item da agenda, aberto a todos, e um projeto por tópico, montado a partir deles. Nenhum bloco tem texto próprio, e nenhuma delegação fica de fora.

## Por quê

Hoje cada bloco tem os seus working papers e o seu projeto. Com vários textos concorrentes no mesmo tópico, cada parte da sala fala de um texto diferente, o debate se fragmenta, e uma delegação pequena só tem voz se entrar num bloco forte.

No UFRGSMUN o caminho é outro. No UNOCT de 2026, a agenda do tópico A tinha três grandes itens; cada um foi resolvido num working paper em que a sala inteira trabalhava (A.1, A.2 "African Sovereignty" e A.3), e os três foram juntados no Draft Resolution #1, que repete o preâmbulo do working paper do A.1.

## Como fica o caminho de um tópico

1. **Agenda:** adotada, como hoje (passo 60). Cada grande item (os pontos de primeiro nível, como A.1, A.2 e A.3) ganha o seu working paper, em branco, de toda a sala. Se a agenda mudar depois, o item novo ganha o seu.
2. **O working paper de cada item.** Um só por item, e nenhum bloco tem o seu. As mudanças são propostas pelos redatores: quem entra num bloco passa a escrita ao redator, e a delegação sem bloco é um bloco de uma delegação só, a própria redatora. O redator propõe, em nome do bloco, incluir, alterar, mover ou retirar uma cláusula. Funciona como a alteração da agenda:
   - todas as delegações marcam apoio, ressalva ou contra, num toque, e podem comentar;
   - **quem decide é quem preside a sessão**: a delegação da vez no debate, ou o bureau quando ele preside (plenária, fase de ação, casos excepcionais). Depois do debate, quando a sala chega a um consenso, a presidência **aceita** (o texto muda no lugar) ou **rejeita** a proposta;
   - o app mostra o sinal de consenso (ninguém contra e apoio de pelo menos metade das delegações). Aceitar sem esse sinal pede confirmação, mas não é proibido: o consenso se forma no debate, e a marcação é só o termômetro;
   - enquanto não há decisão, a proposta fica em debate. Depois de rejeitada, o redator pode reformulá-la numa proposta nova;
   - propostas que se contradizem aparecem lado a lado, no mesmo ponto do texto ("alternativas");
   - assinar é opcional, sem mínimo, como mandam as regras oficiais ("It does not requires signatories"), e mostra acordo com o texto.
3. **O foco da sala.** A presidência ou a mesa põe em foco (e no telão) o item, a cláusula ou a proposta em debate, e as falas giram em torno dela.
4. **Do working paper ao projeto.** A mesa ouve as delegações e dá o aval: "Transformar em projeto". O app junta os working papers do tópico num projeto só: primeiro os preâmbulos, depois as cláusulas operativas, na ordem dos itens da agenda, e o resto no fim, guardando de qual item veio cada cláusula. As assinaturas dos working papers passam para o projeto, e os working papers ficam só para leitura. Propostas ainda em debate pedem confirmação, porque ficam de fora.
5. **O projeto.** Um por tópico (o banco recusa um segundo). Nasce fechado: só correções de forma, sem emendas. Precisa de 5 assinaturas (regras oficiais): quem assinou algum working paper já conta e pode retirar a sua até a fase de ação; quem não assinou assina num toque. Então vem a fase de ação, com consenso ou votação, como hoje.
6. **Aprovado,** o projeto vira a resolução, e o comitê passa ao próximo tópico. **Rejeitado,** ele fica no histórico com o resultado da votação, os working papers do tópico reabrem para propostas, e a mesa pode transformá-los em projeto de novo.

## Quem faz o quê

| Papel | No working paper | No projeto |
|---|---|---|
| Redator do bloco | **Propõe** as mudanças em nome do bloco | Assina |
| Membro do bloco | Marca posição, comenta, assina e leva sugestões ao redator (na conversa do bloco) | Assina |
| Delegação sem bloco (um bloco de uma delegação só) | É a própria redatora: **propõe**, marca posição, comenta e assina | Assina |
| Presidência da sessão (a delegação da vez, ou o bureau quando preside) | **Aceita ou rejeita** as propostas depois do debate e põe em foco o que se debate | — |
| Mesa | Põe em foco; aceita ou rejeita só quando é ela quem preside; ouve a sala e **transforma em projeto** | Faz as correções de forma e leva a consenso ou a voto |

## O que muda no app

- **Banco:**
  - o working paper de cada grande item da agenda, sem bloco dono, criado quando a agenda do tópico é adotada (um por ponto de primeiro nível, sem contar os de projetos rejeitados);
  - as propostas (ação, cláusula, texto, posição no texto, motivo, a delegação que propõe e o bloco, se houver), feitas só pelo redator de um bloco ou pela delegação sem bloco; as posições de todas as delegações; aceitar ou rejeitar, só por quem preside a sessão no momento (`pode_presidir`). Reaproveitar as propostas e posições do editor (passo 57), com a decisão no modelo da agenda (passo 60);
  - "Transformar em projeto", só pela mesa: junta as cláusulas (reaproveitar `importar_clausulas`, que já guarda a origem), passa as assinaturas e trava os working papers;
  - o projeto, um por tópico (restrição única por comitê e tópico, sem contar os rejeitados), que nasce fechado;
  - a conversa do bloco: um novo tipo de mensagem (`bloco`), que só os membros leem e escrevem;
  - **saem:** os working papers e os projetos por bloco, as rodadas, o envio à mesa, a aprovação "para ser mencionado" (o working paper já é da sala) e as emendas.
- **Telas:**
  - **O working paper:** fica parecido com a agenda. O texto vem com as propostas ao lado de cada cláusula, a posição num toque, "Aceitar" e "Rejeitar" para quem preside, e os filtros "com consenso" e "em debate".
  - **Documentos:** os working papers do tópico atual e o projeto em destaque; para a mesa, "Transformar em projeto".
  - **Blocos:** os membros, o redator e a conversa do bloco.
  - **Mensagens:** a conversa de cada bloco aparece junto das conversas com as delegações e com a mesa.
  - **Agora:**
    - **para quem preside:** "N propostas com consenso para decidir";
    - **para o redator:** "Suas propostas".
- **Dados que já existem:** no CSNU-T online (dados de teste), o projeto de cada tópico vira o projeto do tópico, e os working papers dos blocos ficam só para leitura.
- **O lote 1 do passo 62:**
  - **fica:** um bloco por vez por delegação; o bloco nunca sem redator (a redação passa a quem está no bloco há mais tempo); o aviso ao encerrar a sessão com uma votação aberta;
  - **sai:** a rodada e "Encerrar a rodada", o rascunho aberto ao comitê durante a rodada, e o envio do working paper com as suas travas (rodada, propostas respondidas e assinaturas), porque o working paper agora é da sala e o projeto nasce da mesa.
- **Regras:** `regras-de-procedimento.md` e "Como funciona" passam a descrever este caminho. As emendas votadas das regras oficiais saem, por decisão da organização.

## Decidido pelo usuário (26/11/2026)

1. Um único working paper por grande item da agenda, de toda a sala, para evitar confusões. Nenhum bloco tem o seu.
2. Os redatores propõem as mudanças. Quem entra num bloco passa a escrita ao redator; a delegação sem bloco é um bloco de uma delegação só e é a própria redatora.
3. Quem aceita ou rejeita é quem preside a sessão, depois do debate. O sinal de consenso é o mesmo da agenda (ninguém contra e apoio de pelo menos metade das delegações); aceitar sem ele pede confirmação.
4. Proposta rejeitada não entra no texto. O redator pode reformular numa proposta nova.
5. A mesa ouve as delegações e dá o aval para transformar os working papers em projeto: primeiro os preâmbulos, depois as operativas, e o resto no fim.
6. Não há emendas: o projeto nasce fechado, só com correções de forma.
7. As assinaturas seguem as regras oficiais (UNOCT Rules of Procedure): o working paper não exige signatários, mas quem concorda pode assinar; o projeto exige 5. As assinaturas dos working papers passam para o projeto, para que a passagem de uma etapa à outra não peça nada de novo.
8. Cada bloco tem a sua conversa nas mensagens, só para os membros.
9. Cada delegação fica num bloco por vez no comitê: entrar em outro, ou criar um, tira do atual. Para apoiar a ideia de outro bloco, basta marcar apoio na proposta dele. (Feito no lote 1 do passo 62.)

10. Um bloco pode ter mais de um redator, como hoje: o bloco não fica sem voz quando a redatora está discursando ou fora da sala, e um bloco grande pode ter uma redatora por item da agenda. Cada proposta mostra a delegação que a fez.

## Ainda em aberto (padrões propostos)

1. **Os working papers nascem sozinhos** quando a agenda do tópico é adotada, um por grande item, em branco.
2. **Sem a aprovação da mesa "para ser mencionado"** (regra oficial), porque o working paper já é da sala inteira.
3. **Consenso ou votação:** as regras oficiais pedem que os signatários escolham ao entregar o projeto. Padrão: sempre se tenta o consenso primeiro (a mesa pergunta se alguém se opõe); com uma objeção, vai a voto.
4. **Observadoras:** propõem e assinam os working papers (as regras oficiais deixam que apresentem working papers), mas não assinam o projeto, porque não apresentam projeto nem votam nele.
5. **Resolução de crise:** fica como hoje, escrita por um bloco e fora deste passo, porque a crise pede resposta rápida.

## Lotes

1. **Banco:**
   - os working papers por item, criados com a agenda;
   - as propostas, as posições e a decisão de quem preside;
   - "Transformar em projeto" (a junção e as assinaturas) e o projeto fechado;
   - a conversa do bloco;
   - a conversão dos dados existentes;
   - os testes em pgTAP.
2. **A tela do working paper,** no modelo da agenda.
3. **Documentos, Blocos, Mensagens, Agora e a trilha.**
4. **Saem as rodadas, o envio, os documentos por bloco e as emendas.** Atualizar as regras e o "Como funciona".
5. **Ponta a ponta:** um tópico inteiro com três blocos, da agenda à resolução e de volta depois de uma rejeição.

## Testes

- [ ] pgTAP:
  - adotada a agenda, cada grande item tem o seu working paper, e só um;
  - só um redator de bloco, ou a delegação sem bloco, propõe;
  - todas as delegações marcam posição;
  - só quem preside a sessão aceita ou rejeita (a delegação da vez no debate; o bureau quando preside);
  - só os membros leem e escrevem na conversa do bloco (um bloco por vez já é testado no `62-fluxo`);
  - só a mesa transforma em projeto; o projeto traz os preâmbulos primeiro e as assinaturas dos working papers;
  - o banco recusa um segundo projeto no tópico, e o conteúdo do projeto não muda;
  - rejeitado o projeto, os working papers reabrem.
- [ ] Ponta a ponta:
  - três blocos propõem mudanças que se contradizem no mesmo item; a sala marca posição, e quem preside aceita uma e rejeita outra;
  - uma delegação sem bloco propõe, marca posição e assina;
  - a mesa transforma os working papers em projeto, e ele vai a voto com as assinaturas já lá.
- [ ] Ponta a ponta, a 1366 × 768: na tela do working paper, a cláusula e as propostas dela ficam à vista, sem rolar a página.
