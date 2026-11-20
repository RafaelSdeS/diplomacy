# Passo 16 · Procedimento completo

**Parte de:** evento
**Depende de:** 12
**Objetivo:** cobrir todas as [regras de procedimento](../regras-de-procedimento.md) (UNOCT e Guia de Regras), inclusive a fase de ação e as regras especiais do CSNU, do Conselho Europeu e da OEA.

## Como ficou

- **Regra substantiva por comitê** (`regras.votacao_substantiva`): `maioria_simples`, `csnu` (9 a favor e nenhum voto contra de permanente; quem a mesa marca como parte na disputa só se abstém) e `unanimidade` (todas as previstas a favor). A votação guarda a regra na abertura.
- **Sala fechada:** a mesa anuncia a votação do projeto ("Iniciar a votação"); a partir daí só pontos, divisão da questão e votação nominal estão em ordem. Se a sessão acaba no meio, o projeto volta à mesa.
- **Votação nominal:** reconhecida pela mesa, vale para a votação final e para as partes. O painel abre a chamada em ordem alfabética, com "Passou"; o telão e os celulares mostram que é nominal.
- **Divisão da questão:** a moção segue o caminho das outras (lista especial e votação procedimental). Aprovada, a mesa escolhe as operativas de cada parte e põe cada uma em votação; rejeitada, a parte sai do projeto; sem operativas, o projeto é rejeitado. As propostas de divisão e a ordem "da mais à menos substancial" ficam com a mesa, na sala.
- **Emendas:** tabela própria (`emenda`), não um tipo de documento: acrescenta, suprime ou modifica uma cláusula; o autor assina ao propor e precisa de `assinaturas_emenda` (3) para a mesa abrir a votação. Aprovada, a mudança entra no projeto na hora. A tela do documento mostra as emendas, com "Assinar" e "Propor emenda".
- **Uma resolução por tópico:** aprovada (por consenso ou votação), o comitê vai ao próximo tópico sem resolução, ou encerra. **Fase de ação:** começa quando a mesa aprova um projeto e termina no resultado.
- **Não-confiança:** as delegações assinam o pedido na tela da sessão; a votação só abre com 1/5 das previstas.
- **Tecnologia restrita** (`comite.tecnologia_restrita`, que já existia): com a sessão aberta, um gatilho barra qualquer escrita de delegado (placa, pontos, votos, notas, documentos...). A mesa registra os pedidos de fala e os votos de placa; o telão acompanha. A presidência de uma delegação também fica com a mesa ("Mesa assume a presidência").
- **Comitês de teste:** o seed tem a OEA-T (tecnologia restrita, Cuba suspensa, Espanha observadora) e o CE-T (unanimidade), além do CSNU-T.

## Votação

- [x] **CSNU:** questão substantiva aprovada com 9 votos a favor e nenhum voto contra de membro permanente. A mesa marca a delegação que é parte numa disputa (Capítulo VI e artigo 52), e ela fica obrigada a se abster.
- [x] **Conselho Europeu:** questão substantiva exige unanimidade de **todas as delegações previstas**, não só das presentes.
- [x] **Sala fechada:** durante a votação de um projeto, só estão em ordem as moções de divisão da questão e de votação nominal.
- [x] **Votação nominal:** aprovada automaticamente quando o bureau a reconhece; ordem alfabética; cada delegação pode passar a vez uma única vez; quem passou não pode se abster depois.
- [x] **Divisão da questão** (as propostas e a ordem entre elas ficam com a mesa):
  1. só cláusulas operativas;
  2. 2 discursos a favor e 2 contra, e maioria simples sem abstenção;
  3. 5 minutos de informal-informal para receber as propostas;
  4. propostas votadas da mais à menos substancial;
  5. votação de cada parte;
  6. votação final, e se todas as operativas caírem, o projeto é rejeitado.

## Documentos formais

- [x] **Fase de ação:** começa quando o bureau aprova um projeto de resolução; o bureau preside.
- [x] **Projeto de resolução:**
  - no mínimo 5 signatários (`assinaturas_projeto_min`) e aprovação do bureau;
  - ao enviar, os signatários escolhem aprovação por consenso ou por votação;
  - uma resolução aprovada por tópico: aprovada, o debate do tópico acaba e o comitê passa ao próximo tópico, ou encerra.
- [x] **Consenso:**
  1. um signatário lê o projeto, e só entram correções de forma;
  2. o bureau pergunta se alguma delegação se opõe;
  3. sem oposição, o projeto é aprovado;
  4. com oposição, o projeto vira o único foco do debate (formal-informal), segue para as emendas e depois para a votação.
- [x] **Emendas:** tabela `emenda` (em vez de um tipo de documento) ligado ao projeto, que acrescenta, suprime ou modifica partes, com no mínimo 3 signatários. As emendas são discutidas juntas e votadas em sequência; aprovada, a emenda é aplicada ao projeto. Depois de todas, vota-se o projeto: quórum de votação (maioria simples das previstas) e aprovação por maioria simples, ou pela regra especial do comitê.

## Moções

- [x] **Adiamento do debate:** lista especial (2 a favor e 2 contra) e dois terços. Aprovado, o debate passa ao outro tópico. (Feito no passo 07.)
- [x] **Não-confiança:** pedido com assinaturas de 1/5 das delegações previstas (`assinaturas_desconfianca_fracao`), votação por maioria simples, e a presidência passa à próxima delegação da lista de espera. A votação e a troca da presidência já existem (passo 07); falta exigir as assinaturas antes de abrir a votação.

## Delegações

- [x] Observadoras votam só em questões procedimentais; suspensas não votam. A regra já está em `votar()`; aqui entram os casos da OEA.

## Modo com tecnologia restrita

- [x] Quando `comite.tecnologia_restrita` está ligado, os delegados ficam sem as funções interativas durante as sessões.
- [x] A mesa opera tudo num aparelho: registra pedidos de fala, conta votos nas placas e redige os documentos.
- [x] O telão continua funcionando.

## Testes

Arquivos: `supabase/tests/16-procedimento.test.sql` e `tests/16-procedimento.spec.ts`.

- [x] pgTAP, CSNU: 9 a favor com um voto contra de membro permanente reprova; 9 a favor com abstenção de membro permanente aprova; 8 a favor reprova.
- [x] pgTAP, CSNU: a delegação marcada como parte na disputa não consegue votar a favor nem contra.
- [x] pgTAP, Conselho Europeu: uma ausência ou um voto contra impede a aprovação.
- [x] pgTAP, votação nominal: quem passou a vez não consegue se abster, e ninguém passa duas vezes.
- [x] pgTAP, divisão da questão: só operativas; o projeto é rejeitado quando todas as operativas caem.
- [x] pgTAP: projeto com menos de 5 signatários (passo 09) não pode ser enviado, nem emenda com menos de 3.
- [x] pgTAP: projeto por consenso sem objeção (passo 12); com objeção, as emendas e a votação é aprovado; com objeção, segue para emendas e votação.
- [x] pgTAP: durante a votação de um projeto, só divisão da questão e votação nominal são aceitas.
- [x] pgTAP: só uma resolução aprovada por tópico.
- [x] pgTAP: o adiamento do debate (passo 07) e a não-confiança seguem as maiorias e as assinaturas das regras.
- [x] pgTAP: com tecnologia restrita, os delegados não conseguem escrever nada durante a sessão.
- [x] Ponta a ponta: uma votação nominal completa, do painel da mesa ao telão.
- [x] Ponta a ponta: no modo com tecnologia restrita, a mesa registra falas e votos, e o telão acompanha.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [x] Comitês de teste no formato do CSNU, do Conselho Europeu e da OEA rodam com as suas regras especiais.
