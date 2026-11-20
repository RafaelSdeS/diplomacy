# Passo 16 · Procedimento completo

**Parte de:** evento
**Depende de:** 12
**Objetivo:** cobrir todas as [regras de procedimento](../regras-de-procedimento.md) (UNOCT e Guia de Regras), inclusive a fase de ação e as regras especiais do CSNU, do Conselho Europeu e da OEA.

## Votação

- [ ] **CSNU:** questão substantiva aprovada com 9 votos a favor e nenhum voto contra de membro permanente. A mesa marca a delegação que é parte numa disputa (Capítulo VI e artigo 52), e ela fica obrigada a se abster.
- [ ] **Conselho Europeu:** questão substantiva exige unanimidade de **todas as delegações previstas**, não só das presentes.
- [ ] **Sala fechada:** durante a votação de um projeto, só estão em ordem as moções de divisão da questão e de votação nominal.
- [ ] **Votação nominal:** aprovada automaticamente quando o bureau a reconhece; ordem alfabética; cada delegação pode passar a vez uma única vez; quem passou não pode se abster depois.
- [ ] **Divisão da questão:**
  1. só cláusulas operativas;
  2. 2 discursos a favor e 2 contra, e maioria simples sem abstenção;
  3. 5 minutos de informal-informal para receber as propostas;
  4. propostas votadas da mais à menos substancial;
  5. votação de cada parte;
  6. votação final, e se todas as operativas caírem, o projeto é rejeitado.

## Documentos formais

- [ ] **Fase de ação:** começa quando o bureau aprova um projeto de resolução; o bureau preside.
- [ ] **Projeto de resolução:**
  - no mínimo 5 signatários (`assinaturas_projeto_min`) e aprovação do bureau;
  - ao enviar, os signatários escolhem aprovação por consenso ou por votação;
  - uma resolução aprovada por tópico: aprovada, o debate do tópico acaba e o comitê passa ao próximo tópico, ou encerra.
- [ ] **Consenso:**
  1. um signatário lê o projeto, e só entram correções de forma;
  2. o bureau pergunta se alguma delegação se opõe;
  3. sem oposição, o projeto é aprovado;
  4. com oposição, o projeto vira o único foco do debate (formal-informal), segue para as emendas e depois para a votação.
- [ ] **Emendas:** documento do tipo `emenda` ligado ao projeto, que acrescenta, suprime ou modifica partes, com no mínimo 3 signatários. As emendas são discutidas juntas e votadas em sequência; aprovada, a emenda é aplicada ao projeto. Depois de todas, vota-se o projeto: quórum de votação (maioria simples das previstas) e aprovação por maioria simples, ou pela regra especial do comitê.

## Moções

- [x] **Adiamento do debate:** lista especial (2 a favor e 2 contra) e dois terços. Aprovado, o debate passa ao outro tópico. (Feito no passo 07.)
- [ ] **Não-confiança:** pedido com assinaturas de 1/5 das delegações previstas (`assinaturas_desconfianca_fracao`), votação por maioria simples, e a presidência passa à próxima delegação da lista de espera. A votação e a troca da presidência já existem (passo 07); falta exigir as assinaturas antes de abrir a votação.

## Delegações

- [ ] Observadoras votam só em questões procedimentais; suspensas não votam. A regra já está em `votar()`; aqui entram os casos da OEA.

## Modo com tecnologia restrita

- [ ] Quando `comite.tecnologia_restrita` está ligado, os delegados ficam sem as funções interativas durante as sessões.
- [ ] A mesa opera tudo num aparelho: registra pedidos de fala, conta votos nas placas e redige os documentos.
- [ ] O telão continua funcionando.

## Testes

Arquivos: `supabase/tests/16-procedimento.test.sql` e `tests/16-procedimento.spec.ts`.

- [ ] pgTAP, CSNU: 9 a favor com um voto contra de membro permanente reprova; 9 a favor com abstenção de membro permanente aprova; 8 a favor reprova.
- [ ] pgTAP, CSNU: a delegação marcada como parte na disputa não consegue votar a favor nem contra.
- [ ] pgTAP, Conselho Europeu: uma ausência ou um voto contra impede a aprovação.
- [ ] pgTAP, votação nominal: quem passou a vez não consegue se abster, e ninguém passa duas vezes.
- [ ] pgTAP, divisão da questão: só operativas; o projeto é rejeitado quando todas as operativas caem.
- [ ] pgTAP: projeto com menos de 5 signatários não pode ser enviado, nem emenda com menos de 3.
- [ ] pgTAP: projeto por consenso sem objeção é aprovado; com objeção, segue para emendas e votação.
- [ ] pgTAP: durante a votação de um projeto, só divisão da questão e votação nominal são aceitas.
- [ ] pgTAP: só uma resolução aprovada por tópico.
- [ ] pgTAP: o adiamento do debate e a não-confiança seguem as maiorias e as assinaturas das regras.
- [ ] pgTAP: com tecnologia restrita, os delegados não conseguem escrever nada durante a sessão.
- [ ] Ponta a ponta: uma votação nominal completa, do painel da mesa ao telão.
- [ ] Ponta a ponta: no modo com tecnologia restrita, a mesa registra falas e votos, e o telão acompanha.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [ ] Comitês de teste no formato do CSNU, do Conselho Europeu e da OEA rodam com as suas regras especiais.
