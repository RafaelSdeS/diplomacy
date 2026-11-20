# Fase 1 · Piloto de teste

**Quando:** março a junho de 2027
**Objetivo:** testar o núcleo do app com poucos usuários, tudo em planos gratuitos e com dados fictícios.
**Teste para passar de fase:** o piloto é aprovado pela mesa e pela equipe de crise do teste ("usaríamos no evento").

## Escopo

### Entra

- Login com conta Google e com e-mail e senha (nenhum dos dois envia e-mail).
- Um evento e um comitê de teste, com delegações, mesa, equipe de crise e press.
- Telas para celular, notebook e telão.
- Regras de procedimento configuráveis, com o padrão do UFRGSMUN.
- Português apenas.

### Fica para a fase 2

Login pelo crachá, link e código por e-mail, Broadcast, offline completo, notificação push, inglês, votação do CSNU e do Conselho Europeu, votação nominal, divisão da questão, emendas formais, modo de tecnologia restrita, bilhetes, check-in, certificados e importação das inscrições.

## Etapas

### M1 · Base

- [ ] Login e papéis (delegado, mesa, crise, press, secretaria) a partir da tabela `participacao`.
- [ ] Comitê de teste com delegações; delegação com um ou mais delegados.
- [ ] Layout responsivo: uma coluna no celular, colunas no notebook, tela cheia no telão.
- [ ] Tela "Agora": o que importa para a pessoa naquele minuto.
- [ ] Perfis, cronograma e avisos simples.
- [ ] DPO: envio, comentário da mesa e situação (enviado, aprovado, pede ajustes).

### M2 · Sessão

- [ ] Chamada e quórum (1/3 das delegações previstas).
- [ ] Agenda: propostas em árvore (tópico, subtópicos e pontos), moção de tópico no topo da agenda e votação.
- [ ] Presidência em rodízio: sorteio, delegação da vez com o painel e bureau nas sessões em que o guia exige.
- [ ] Pedidos de fala pela placa digital, cronômetro com aviso de 10 segundos, pausa e devolução de tempo.
- [ ] Moções e pontos básicos: informal-informal (até 45 min), adiamentos, ordem, dúvida e privilégio pessoal.
- [ ] Votação simples por delegação: maioria simples e dois terços.
- [ ] Telão: pauta, orador, cronômetro e resultado de votação.

### M3 · Crise

- [ ] Nota e diretiva privadas, cada uma com ID gerado no aparelho, para que reenviar nunca duplique.
- [ ] Fila: contador no topo, tempo de espera, "assumir antes de responder" e filtro por delegação.
- [ ] Limite de notas pendentes por delegação, definido pela equipe.
- [ ] O delegado vê a posição da nota na fila.
- [ ] Atualização de crise para um ou vários comitês, no telão e nos aparelhos.
- [ ] Resolução de crise ligada à atualização que a motivou.

### M4 · Editor de resoluções

- [ ] Blocos com nome e working paper ligado a um subtópico.
- [ ] Cláusulas preambulares e operativas, com formatação automática e verbos sugeridos.
- [ ] Redator (penholder), propostas de alteração e conversa por cláusula.
- [ ] Rodadas com prazo, número máximo de rodadas e cláusula acordada travada.
- [ ] Notas do bloco separadas das cláusulas.
- [ ] Linha do comitê e signatários com o nome oficial preenchidos sozinhos.
- [ ] Fusão de working papers em projeto de resolução.
- [ ] PDF pelo "Salvar como PDF" do navegador.

### M5 · Press

- [ ] Um veículo por comitê; publicação na hora, sem aprovação.
- [ ] Aviso de palavrão antes de publicar (sem bloquear) e ocultação pelo bureau.
- [ ] Feed por veículo, capa com as manchetes e plantão no telão.
- [ ] Aviso às delegações citadas.

### M6 · Teste com usuários

- [ ] Rodar uma sessão completa com um grupo pequeno: agenda, debate, crise, resolução votada e press.
- [ ] Medir: tempo de resposta das notas de crise, notas perdidas, resolução pronta dentro do tempo e satisfação da mesa e da crise.
- [ ] Anotar o que muda para a fase 2.

## Critérios de aceite

- [ ] Uma sessão inteira acontece sem papel, do debate da agenda à resolução votada.
- [ ] Nenhuma nota de crise se perde, e o teste automático garante que uma delegação não lê a nota de outra.
- [ ] Todas as telas funcionam num celular de 360 px, num notebook de 1366 × 768 e no projetor (1920 × 1080).
- [ ] Acessibilidade WCAG 2.2 AA nas telas principais: contraste, leitor de tela e voto nunca indicado só pela cor.
- [ ] A primeira abertura baixa menos de 300 KB.
- [ ] Custo zero.

## Referências no plano

Seções 6 a 12 (módulos, crise, press, mensagens, editor, debates e regras), 16 (arquitetura) e 17 (fases e calendário).
