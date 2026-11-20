# Passo 12 · Teste do piloto

**Parte de:** piloto
**Depende de:** 01 a 11
**Objetivo:** garantir a qualidade do piloto e rodar uma sessão completa com um grupo pequeno de pessoas.

## Como ficou

- **Resolução votada:** faltava no app o caminho do projeto até a votação. Agora o painel da presidência tem **Projetos de resolução**: a mesa abre a votação substantiva de um projeto que aprovou (`abrir_votacao_projeto`) ou o aprova por consenso. O resultado da votação vale para o projeto (aprovado ou rejeitado); se a sessão acabar no meio, o projeto volta a esperar a mesa. Fase de ação, emendas e regra do CSNU seguem no passo 16.
- **Comitê de treino:** o seed cria o TREINO (seis delegações sul-americanas, cenário fictício do Rio Aurora, contas `treinoNN@exemplo.test` e `mesa-treino@exemplo.test`); na nuvem, `supabase/treino.sql`.
- **Roteiro, plano B e questionário:** `docs/piloto.md`.
- **Métricas:** `supabase/consultas/`. "Matérias lidas" virou pergunta do questionário: o app não registra leituras (LGPD).
- **Fluxo completo:** as etapas têm os próprios testes de ponta a ponta (06 a 11); `tests/12-piloto.spec.ts` fecha o fluxo no comitê de treino, com a resolução votada.

## Qualidade

- [ ] Todos os testes automáticos dos passos 01 a 11 passam no CI.
- [x] Testes de ponta a ponta do fluxo completo nas três telas: agenda, debate, crise, resolução votada e press (06 a 12).
- [x] axe em todas as rotas principais (em cada passo) e o teclado no notebook da mesa: abrir e encerrar a votação de um projeto só com Tab e Enter.
- [ ] Teste manual com leitor de tela: TalkBack no Android e VoiceOver no iPhone.
- [x] Primeira abertura abaixo de 300 KB, com o limite checado no CI.
- [x] Rede ruim: simulação de 3G lento no navegador, queda e volta da conexão no meio de uma sessão.
- [ ] Cronômetro e fila de crise conferidos em celulares Android e iPhone reais.

## Sessão de teste

- [x] Roteiro de 1h30 a 2h com um cenário fictício (`docs/piloto.md`):
  1. chamada, plenária de abertura (briefing, discursos de abertura e moção do tópico no topo) e agenda informal;
  2. debate formal-informal com rodízio da presidência;
  3. uma atualização de crise;
  4. um working paper que vira projeto de resolução;
  5. votação;
  6. press cobrindo tudo.
- [ ] Contas fictícias para cada pessoa do grupo, entregues na hora.
- [x] Plano B em papel à mão, com um combinado claro de quando usá-lo (`docs/piloto.md`).
- [ ] Um notebook com projetor rodando o telão.
- [x] Usar o formato do **mock** do UFRGSMUN: no primeiro dia, o evento já tem um horário de "simulação de treino e regras", com um cenário fictício. É o melhor momento para ensinar o app a todo mundo. O seed ganha um comitê de treino com um cenário fictício próprio, para ensaiar exatamente esse momento.

## Métricas

Consultas SQL salvas em `supabase/consultas/`:

- tempo médio entre o envio de uma nota de crise e a resposta;
- notas sem resposta no fim da sessão;
- tempo do envio do projeto até a votação;
- matérias publicadas e lidas.

Depois da sessão, um questionário curto por função: delegado, mesa, crise e press (`docs/piloto.md`).

## Pronto quando

Os critérios de aceite do piloto estão cumpridos:

- [ ] Todos os testes automáticos dos passos 01 a 12 passam no CI.
- [ ] Uma sessão inteira acontece sem papel, do debate da agenda à resolução votada.
- [ ] Nenhuma nota de crise se perde, e o teste de privacidade passa.
- [ ] Tudo funciona num celular de 360 px, num notebook de 1366 × 768 e no projetor.
- [ ] Acessibilidade WCAG 2.2 AA nas telas principais.
- [ ] Custo zero.
- [ ] A mesa e a equipe de crise do teste dizem que usariam o app no evento.
