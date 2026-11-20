# Passo 16 · Procedimento completo

**Parte de:** evento
**Depende de:** 12
**Objetivo:** cobrir todas as regras do Guia de Regras, inclusive as especiais do CSNU, do Conselho Europeu e da OEA.

## Votação

- [ ] **CSNU:** questão substantiva aprovada com 9 votos a favor e nenhum voto contra de membro permanente. A mesa marca a delegação que é parte numa disputa (Capítulo VI e artigo 52), e ela fica obrigada a se abster.
- [ ] **Conselho Europeu:** questão substantiva exige unanimidade de **todas as delegações previstas**, não só das presentes.
- [ ] **Votação nominal:** ordem alfabética; cada delegação pode passar a vez uma única vez; quem passou não pode se abster depois.
- [ ] **Divisão da questão:**
  1. só cláusulas operativas;
  2. 2 discursos a favor e 2 contra, e maioria simples sem abstenção;
  3. 5 minutos de informal-informal para receber as propostas;
  4. propostas votadas da mais à menos substancial;
  5. votação de cada parte;
  6. votação final, e se todas as operativas caírem, o projeto é rejeitado.

## Documentos formais

- [ ] **Projeto de resolução:** assinaturas de 1/5 das delegações previstas, aprovação da mesa e uma resolução aprovada por tópico. Aprovação por consenso (leitura, correções só de forma e nenhuma objeção) ou por votação.
- [ ] **Emendas:** documento do tipo `emenda` ligado a uma cláusula, com no mínimo 3 assinaturas. Votadas na ordem definida pela mesa; aprovada, a emenda é aplicada ao projeto.

## Moções

- [ ] **Adiamento do debate:** dois terços; havendo objeção, 2 discursos a favor e 2 contra e nova votação com metade dos votos. O debate passa automaticamente ao próximo tópico.
- [ ] **Não-confiança:** pedido com assinaturas de 1/5 das delegações, votação por maioria simples, e a presidência passa à próxima delegação do rodízio.

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
- [ ] pgTAP: projeto sem 1/5 de assinaturas não pode ser enviado, nem emenda sem 3 assinaturas.
- [ ] pgTAP: só uma resolução aprovada por tópico.
- [ ] pgTAP: o adiamento do debate e a não-confiança seguem as maiorias do guia.
- [ ] pgTAP: com tecnologia restrita, os delegados não conseguem escrever nada durante a sessão.
- [ ] Ponta a ponta: uma votação nominal completa, do painel da mesa ao telão.
- [ ] Ponta a ponta: no modo com tecnologia restrita, a mesa registra falas e votos, e o telão acompanha.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [ ] Comitês de teste no formato do CSNU, do Conselho Europeu e da OEA rodam com as suas regras especiais.
