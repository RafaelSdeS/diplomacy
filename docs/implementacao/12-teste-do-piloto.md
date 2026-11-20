# Passo 12 · Teste do piloto

**Parte de:** piloto
**Depende de:** 01 a 11
**Objetivo:** garantir a qualidade do piloto e rodar uma sessão completa com um grupo pequeno de pessoas.

## Qualidade

- [ ] Testes de ponta a ponta do fluxo completo nas três telas: agenda, debate, crise, resolução votada e press.
- [ ] axe em todas as rotas principais e navegação completa pelo teclado no notebook da mesa.
- [ ] Teste manual com leitor de tela: TalkBack no Android e VoiceOver no iPhone.
- [ ] Primeira abertura abaixo de 300 KB, com o limite checado no CI.
- [ ] Rede ruim: simulação de 3G lento no navegador, queda e volta da conexão no meio de uma sessão.
- [ ] Cronômetro e fila de crise conferidos em celulares Android e iPhone reais.

## Sessão de teste

- [ ] Roteiro de 1h30 a 2h com um cenário fictício:
  1. chamada e debate da agenda;
  2. debate com rodízio da presidência;
  3. uma atualização de crise;
  4. um working paper que vira projeto de resolução;
  5. votação;
  6. press cobrindo tudo.
- [ ] Contas fictícias para cada pessoa do grupo, entregues na hora.
- [ ] Plano B em papel à mão, com um combinado claro de quando usá-lo.
- [ ] Um notebook com projetor rodando o telão.

## Métricas

Consultas SQL salvas em `supabase/consultas/`:

- tempo médio entre o envio de uma nota de crise e a resposta;
- notas sem resposta no fim da sessão;
- tempo do envio do projeto até a votação;
- matérias publicadas e lidas.

Depois da sessão, um questionário curto por função: delegado, mesa, crise e press.

## Pronto quando

Os critérios de aceite do piloto estão cumpridos:

- [ ] Uma sessão inteira acontece sem papel, do debate da agenda à resolução votada.
- [ ] Nenhuma nota de crise se perde, e o teste de privacidade passa.
- [ ] Tudo funciona num celular de 360 px, num notebook de 1366 × 768 e no projetor.
- [ ] Acessibilidade WCAG 2.2 AA nas telas principais.
- [ ] Custo zero.
- [ ] A mesa e a equipe de crise do teste dizem que usariam o app no evento.
