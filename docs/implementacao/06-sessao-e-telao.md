# Passo 06 · Sessão e telão

**Parte de:** piloto
**Depende de:** 04 e 05
**Objetivo:** conduzir uma sessão pelo app, com chamada, quórum, presidência em rodízio, pedidos de fala, cronômetro, pontos e moções, e mostrar tudo no telão.

## Banco

Migração `supabase/migrations/20261123090000_sessao.sql`. O desenho inicial mudou em alguns pontos, todos para fechar brechas ou simplificar:

- [x] `sessao` (número, `de_votacao`, presidência, minutos de informal-informal usados), `presenca`, `rodizio_presidencia` (com `vez_usada`), `estado_sessao` (uma linha por comitê, com o tempo de fala da sessão), `pedido_fala` e `ponto_mocao`.
- [x] As tabelas filhas guardam `comite_id`, com chaves estrangeiras compostas: uma delegação de outro comitê não entra na sessão, e a RLS e o tempo real filtram por comitê.
- [x] O pedido de fala tem `situacao` (`aberto`, `atendido` ou `baixado`) em vez de `atendido`: baixar a placa é uma atualização, não uma exclusão, e o tempo real filtrado por comitê continua recebendo tudo. Cada delegação tem no máximo uma placa levantada por sessão (índice único parcial).
- [x] Não há `informal_inicio`: o cronômetro conta o informal-informal.
- [x] Quem está no comitê vê tudo da sessão dele. Só a mesa marca presença (RLS).
- [x] Todo o resto passa por funções `security definer`, que checam quem pode. Ninguém escreve direto nos pedidos de fala nem nos pontos: assim ninguém fura a fila mudando o horário de um pedido.

## Presidência

- [x] `pode_presidir(comite_id)`: é da mesa (ou da secretaria), ou é delegado da delegação que preside a sessão atual.
- [x] Funções de quem preside: `dar_palavra(comite, delegacao, seg)` (nulo encerra a fala; atende o pedido de fala e começa o tempo), `iniciar_cronometro`, `pausar`, `retomar`, `somar_segundos`, `mudar_forma(comite, forma, minutos)` e `passar_presidencia`, mais `responder_ponto(ponto, status)`.
- [x] `mudar_forma` respeita o limite de informal-informal das regras (45 minutos por sessão). Os minutos contam quando o informal começa, mesmo que ele acabe antes.
- [x] Funções da mesa: `sortear_presidencia(comite, voluntarias)`, `abrir_sessao(comite, votacao)` (encerra a anterior) e `encerrar_sessao(comite)`.
- [x] O bureau preside a primeira sessão e as de votação. Nas outras, preside a próxima delegação do rodízio que ainda não presidiu; as que sobram são a lista de espera, usada quando a presidência é passada. Sem lista de espera, a presidência volta à mesa. A presidência de uma sessão de votação não é passada.
- [x] Funções das delegações: `levantar_placa`, `baixar_placa` e `enviar_ponto(comite, tipo, detalhe)`.
- [x] `presentes(sessao)` conta a chamada (a base das votações do passo 07), e `agora()` dá o relógio do servidor.

## Cronômetro

- [x] O banco guarda só o início, a duração e o tempo restante na pausa. Cada aparelho calcula o tempo que falta (`src/lib/cronometro.ts`), e nada é enviado a cada segundo.
- [x] Ao abrir a tela, o app chama `agora()` e corrige a diferença de relógio do aparelho, supondo que a resposta saiu no meio da ida e volta.
- [x] O aviso de fim de tempo usa `aviso_fala_seg` das regras (10 s): o tempo muda de cor e aparece o texto "Tempo acabando", depois "Tempo esgotado", anunciados ao leitor de tela (não depende só da cor).

## Tempo real

- [x] `estado_sessao`, `pedido_fala`, `ponto_mocao` e `presenca` estão na publicação `supabase_realtime`, filtrados por comitê.
- [x] `assinarSessao` fica em `src/lib/tempo-real.ts`, junto com as outras assinaturas. O componente `AoVivo` liga a tela ao tempo real e mostra o selo "Ao vivo" ou "Conectando…": a pessoa sabe se a tela está atualizada.

## Telas

| Tela | Celular | Notebook |
|---|---|---|
| Delegado `/comite/[sigla]/sessao` | Orador com bandeira, tempo, fila, botão grande "Levantar placa" com a posição na fila, placa em tela cheia, ponto ou moção e a resposta da presidência | Cartões em duas colunas |
| Presidência `/comite/[sigla]/presidencia` | Uma coluna | Fila à esquerda, orador e cronômetro ao centro, pontos e moções à direita; atalhos de teclado (Espaço pausa ou retoma, Enter dá a palavra ao próximo) que não valem dentro de campos e botões |
| Mesa `/comite/[sigla]/chamada` | Abrir e encerrar sessão, chamada com três opções por delegação (ausente, presente, presente e votando) e o quórum calculado, sorteio do rodízio | Igual |
| Telão `/telao/[sigla]` | Não se aplica | 1920 × 1080, azul-marinho e branco: sessão e forma de debate, presidência, orador com bandeira grande, cronômetro grande e os próximos da fila; a pauta entra no passo 07 |

- [x] O menu ganhou "Sessão" para quem tem comitê. O item mais específico que contém a tela atual fica marcado.
- [x] O telão roda sem cabeçalho nem menu e não tem botões: um clique (ou a tecla F) põe em tela cheia, e o Wake Lock não deixa a tela apagar.

## Testes

Arquivos: `supabase/tests/06-sessao.test.sql` (38 testes), `src/lib/cronometro.test.ts` (10 testes) e `tests/06-sessao.spec.ts`.

Os testes de ponta a ponta da sessão rodam em série e só no projeto "notebook": o comitê de teste tem uma sessão só, e eles mexem nela. O telão usa a tela de 1920 × 1080 com `test.use`, e o reflow com 320 px das telas da sessão fica no teste do passo 04.

- [x] pgTAP: um delegado de uma delegação que não preside não consegue dar a palavra nem mexer no cronômetro, e ninguém altera o estado da sessão direto.
- [x] pgTAP: o delegado da delegação que preside consegue, e a mesa sempre consegue.
- [x] pgTAP: na primeira sessão e nas de votação, quem preside é o bureau.
- [x] pgTAP: só a mesa sorteia o rodízio e abre sessão; `passar_presidencia` segue a ordem sorteada e depois volta à mesa.
- [x] pgTAP: o informal-informal não passa de 45 minutos.
- [x] pgTAP: a chamada calcula o quórum certo, e só a mesa faz a chamada.
- [x] pgTAP: a placa: uma por delegação, ninguém insere pedido direto (nem fura a fila), e quem recebe a palavra tem o pedido atendido. O cronômetro pausa, soma segundos e retoma.
- [x] Vitest: o tempo restante do cronômetro com pausa, retomada, segundos somados e diferença de relógio do aparelho.
- [x] Vitest: o aviso começa quando faltam 10 segundos.
- [x] Ponta a ponta: um pedido de fala aparece no painel da presidência em menos de 1 segundo (dois navegadores).
- [x] Ponta a ponta: a mesa sorteia o rodízio, abre a sessão e faz a chamada, com o quórum mudando na hora.
- [x] Ponta a ponta: dois navegadores mostram o mesmo tempo, com diferença máxima de 1 segundo, e a mesma pausa.
- [x] Ponta a ponta: os atalhos de teclado do painel funcionam, e não valem dentro de um campo.
- [x] Ponta a ponta: um ponto chega à presidência e a resposta volta à delegação; quem não preside não usa o painel; a presidência passada sem lista de espera volta à mesa.
- [x] Ponta a ponta: o telão em 1920 × 1080 mostra orador, bandeira e cronômetro sem rolagem.
- [x] Ponta a ponta: a navegação do app não aparece nas rotas `/telao/*`, e o telão não tem botões.
- [x] Acessibilidade: axe sem erros na sessão, na presidência, na chamada e no telão, nos dois temas; reflow com 320 px na sessão, na presidência e na chamada.
- [x] Aparência: capturas de referência do painel da presidência e do telão (com o cronômetro mascarado).
- [ ] Manual: o telão num projetor de verdade, lido do fundo da sala.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [x] Uma sessão de teste roda com chamada, sorteio do rodízio, falas cronometradas, pontos, moções e telão.
- [x] O telão cabe em 1920 × 1080, e o painel funciona com 360 px e com 1366 px. Falta conferir a leitura do fundo da sala num projetor de verdade (teste manual).
