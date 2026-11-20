# Passo 07 · Plenária de abertura, agenda e votação

**Parte de:** piloto
**Depende de:** 06
**Objetivo:** conduzir o comitê da plenária de abertura até o debate do tópico, com lista de oradores, agenda, moções votadas e resultado calculado pelo banco, seguindo as [regras de procedimento](../regras-de-procedimento.md) do UNOCT.

## Ajustes dos passos 05 e 06 (regras do UNOCT)

Migração `supabase/migrations/20261124090000_plenaria_e_votacao.sql`.

- [x] **Regras (passo 05):** `assinaturas_projeto_fracao` (1/5) virou `assinaturas_projeto_min = 5`; entraram `max_sessoes_presidencia = 2` e `assinaturas_desconfianca_fracao = [1, 5]`, e a função `quorum_votacao(comite)` (maioria simples das previstas). `regrasLegiveis` mostra as regras novas.
- [x] **Sorteio:** `sortear_presidencia(comite)` sorteia todas as delegações membros, sem voluntárias; observadora e suspensa nunca presidem. O rodízio conta quantas vezes cada uma presidiu (`vezes`), e ninguém passa de `max_sessoes_presidencia`.
- [x] **Quem preside:** `pode_presidir` só dá a presidência à delegação da vez na fase de debate e quando a mesa não assumiu. O bureau preside a plenária, a fase de ação e os casos excepcionais (`assumir_presidencia(comite, true/false)`). A coluna `sessao.de_votacao` saiu.
- [x] **Formas de debate:** o formal-formal só existe na plenária, onde a forma não muda. Fora dela, a sessão abre em formal-informal.
- [x] **Pontos e moções do UNOCT:** ponto de ordem, de dúvida e de privilégio pessoal; moções de tópico no topo, adiamento do debate, adiamento da sessão, informal-informal, não-confiança, divisão da questão e votação nominal (as duas últimas só na votação de um projeto, no passo 16). `enviar_ponto` confere a fase de cada uma, e o ponto de ordem não interrompe outra delegação.

## Banco

- [x] `estado_sessao` guarda o andamento do comitê: `fase` (plenária, debate, ação, encerrado), `etapa_plenaria` (briefing, discursos, tópico), `topico_atual`, `ordem_topicos` e `mesa_assumiu`.
- [x] `lista_oradores`: discursos de abertura (sem moção) e listas especiais de uma moção (lado a favor ou contra). Vale para o comitê, não para a sessão: a plenária pode atravessar sessões.
- [x] `votacao` e `voto`, com no máximo uma votação aberta por comitê. O resultado é gravado ao encerrar. `criado_em` usa `clock_timestamp()`, para a ordem ficar certa mesmo dentro de uma transação.
- [x] `proposta_agenda` (uma por delegação e por tópico, mais a da mesa; uma adotada por tópico) e `ponto_pauta` em árvore.
- [x] Todas as escritas passam por funções que checam quem pode, e as tabelas guardam `comite_id` com chaves compostas, como no passo 06. Votos, listas e votações estão no tempo real.

## Regras no banco

- [x] **Plenária:** `avancar_plenaria(comite)`, só do bureau. Exige a chamada antes dos discursos de abertura e põe todas as delegações presentes na lista, em ordem alfabética. `dar_palavra` marca quem falou nas listas em uso.
- [x] **Lista especial:** `abrir_lista_especial(moção)` e `inscrever_lista(moção, lado)`, com no máximo 2 a favor e 2 contra. A trava na moção põe as inscrições em fila.
- [x] **Votação:** `abrir_votacao(moção)` usa a regra da moção: dois terços no adiamento do debate e maioria simples nas outras. `abrir_votacao_livre(comite, objeto, tipo)` exige, na substantiva, o quórum de votação.
- [x] `votar` e `registrar_voto` (só a mesa, para votos de placa) passam por `validar_voto`: votação aberta, delegação presente e situação que permite votar. Observadora não vota em questão substantiva, suspensa não vota, procedimental não aceita abstenção, e quem está "presente e votando" não se abstém.
- [x] **Resultado:** `resultado(votacao)`. A base é o número de presentes que votam naquele tipo de questão (nas substantivas, só as membros). Maioria simples e dois terços, como no passo 05. Empate reprova.
- [x] **Efeitos ao encerrar:**
  - tópico no topo: aprovada, o tópico vai para o topo; rejeitada, entra o outro. O comitê passa ao debate, e a delegação da vez assume;
  - adiamento do debate: passa ao outro tópico;
  - adiamento da sessão: encerra a sessão;
  - informal-informal: começa, com o limite das regras;
  - não-confiança: a presidência passa à próxima da lista.

  As assinaturas da não-confiança, a divisão da questão e a votação nominal ficam para o passo 16.
- [x] **Agenda:** `salvar_proposta_agenda(comite, tópico, itens)` troca a proposta inteira, e nenhum item pula nível. `adotar_proposta` é só da mesa. `marcar_ponto_pauta` é de quem preside, e só na agenda adotada.

## Agenda

1. [x] A moção do tópico no topo, no fim da plenária, define a ordem dos tópicos. O tópico em debate aparece na sessão, no telão e na tela Agora.
2. [x] A agenda informal é escrita em tópicos: um item por linha, e dois espaços ou um traço descem um nível. As propostas aparecem lado a lado no notebook, a mesa adota uma, e quem preside marca o andamento de cada ponto (pendente, em debate, debatido).

## Telas

| Tela | O que tem |
|---|---|
| Sessão do delegado | Fase e tópico, votação aberta com botões grandes (só as escolhas permitidas), lista de oradores, inscrição na lista especial, placa (fora da plenária) e os pontos e moções em ordem na fase |
| Painel da presidência | Plenária para o bureau (etapa e botão de avançar), mesa assume ou devolve a presidência, lista de oradores com "dar a palavra ao próximo", moções com lista especial, votar ou "fora de ordem", votação com a grade de votos, votos de placa e encerramento |
| Agenda `/comite/[sigla]/sessao/agenda` | Tópicos na ordem, propostas lado a lado, formulário em tópicos e adoção pela mesa |
| Telão | Etapa da plenária ou fase e forma, tópico em debate, grade de bandeiras na votação (ícone e texto, além da cor) e o resultado; próximos da lista de oradores |
| Agora | O andamento de cada comitê da pessoa |

- [x] O atalho Enter dá a palavra ao próximo da lista de oradores e, sem lista, ao primeiro da fila de placas.
- [x] Depois de avançar a plenária, o painel solta o foco do botão. Sem isso, um Enter dado como atalho acionaria o botão, que muda de texto, e avançaria a plenária por engano. O teste pegou isso.

## Correções da revisão (no meio do piloto)

- [x] Banco: `agora()` com `search_path` fixo, e as cinco regras de acesso que recalculavam `auth.uid()` a cada linha passam a usar `(select auth.uid())`. As funções de gatilho (`nova_conta` e `convite_criado`) deixam de aparecer na API (`20261124100000_gatilhos_privados.sql`). O analisador da nuvem (`npx supabase db advisors --remote`) ainda lista as funções da API como executáveis por quem está logado: isso é de propósito, porque cada uma confere a permissão por dentro.
- [x] Painel: o campo "Tempo de fala" não é mais apagado a cada evento ao vivo.
- [x] Cronograma: o horário digitado vale no fuso do evento, mesmo num aparelho em outro fuso.
- [x] Tempo real: cada assinatura usa um canal com nome próprio, porque o realtime-js reaproveita canais pelo nome. Quando a assinatura fica pronta, a tela recarrega uma vez, e o que mudou nesse intervalo não se perde. O teste do voto no telão pegou essa corrida.
- [x] O seed espera a API do Supabase ficar pronta depois de um `db reset`.
- [x] Deploy: o guia ganhou a ordem certa (migração na nuvem antes do push), e os planos 13, 14 e 15 foram atualizados.

## Testes

Arquivos: `supabase/tests/07-plenaria-e-votacao.test.sql` (46 testes), `src/lib/votacao.test.ts` (9 testes) e `tests/06-sessao.spec.ts`. Os testes de ponta a ponta continuam no arquivo do passo 06: o comitê de teste tem uma sessão só, e o fluxo inteiro (chamada, plenária, votação, debate, agenda e telão) roda em série. A conta de cada delegação sai de `scripts/delegacoes.ts`, a mesma lista do seed, porque a presidência é sorteada.

- [x] pgTAP, ajustes: o sorteio inclui todas as delegações não observadoras, nunca uma observadora; ninguém preside mais de 2 sessões; o bureau preside na plenária e na fase de ação; projeto pede 5 signatários.
- [x] pgTAP: os discursos de abertura põem todas as presentes na lista de oradores, em ordem alfabética; a lista especial aceita no máximo 2 a favor e 2 contra.
- [x] pgTAP: a mesma delegação não vota duas vezes; abstenção em questão procedimental é recusada.
- [x] pgTAP: observadora não vota em questão substantiva; suspensa e ausente não votam; votação encerrada não aceita voto.
- [x] pgTAP: só a mesa registra votos de placa.
- [x] pgTAP: `resultado()` com os exemplos de maioria das regras; empate reprova; votação substantiva sem quórum de votação não abre.
- [x] pgTAP: moção de tópico no topo aprovada põe o tópico escolhido primeiro; rejeitada, entra o outro.
- [x] Vitest: escolhas permitidas, texto do resultado, presidência em vigor, listas de oradores e o esboço da agenda.
- [x] pgTAP: adiamento do debate por dois terços; agenda em árvore, adoção só pela mesa e agenda adotada travada.
- [x] Ponta a ponta: a plenária avança do briefing aos discursos (com a lista de oradores) e à moção do tópico; votada a moção, o comitê entra no debate do tópico escolhido.
- [x] Ponta a ponta: uma delegação e a mesa propõem agendas em árvore, que aparecem lado a lado no notebook; a mesa adota uma, e quem preside marca o andamento.
- [x] Ponta a ponta: um voto dado no celular aparece no telão, e a mesa registra um voto de placa.
- [x] Acessibilidade: os botões de voto e a grade do telão passam no axe e mostram ícone e texto além da cor.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [x] O comitê de teste faz a plenária de abertura, escolhe o tópico, adota a agenda informal e vê o andamento de cada ponto.
- [x] Os resultados batem com as regras, e o voto nunca é indicado só pela cor.
