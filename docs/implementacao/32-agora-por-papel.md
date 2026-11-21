# Passo 32 · Aba Agora e menu por papel

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 14)
**Depende de:** 26, 28, 29 e 30
**Esforço:** M–G
**Objetivo:** o Agora vira o painel principal de cada papel, com a sessão ao vivo em primeiro lugar, e o menu muda conforme o papel.

## Como ficou

- `papelPrincipal()` (com Vitest) decide o Agora e o menu. Menu: a mesa tem "Painel"; a crise, "Crise" logo depois do Agora; a press, "Press" e "Escrever".
- Agora: delegado com a sessão ao vivo (fala, relógios, pausa, votação, placa) e "Na sua caixa" (bilhetes e rodadas); delegação que preside com o cartão dourado; mesa com atalhos e contadores; crise com as notas pendentes; press com as entrevistas; secretaria com atalhos.
- `ui/BotaoPlaca.svelte` e `ui/Votar.svelte`, usados pela Sessão e pelo Agora.

## Antes

- `src/routes/+page.svelte` e `+page.ts`: cartões de acontecendo agora (fase de cada comitê e cronograma), depois, avisos, respostas da crise, na press, seus DPOs e você.
- Não mostra quem fala, os relógios, a placa nem a votação aberta, embora o app já tenha esses dados em tempo real.
- O menu (`+layout.svelte`, lista `telas`) é igual para quase todos; só "Crise" e "Participantes" dependem do papel. A mesa chega ao painel por botões no fim da tela Sessão.

## Decisões

- Um papel principal por pessoa para montar a tela: secretaria > diretoria da press > mesa > crise > press > delegado. Quem tem mais de um papel vê os cartões extras abaixo.
- O cartão ao vivo usa uma consulta leve, não a `carregarSessao` inteira.
- Bilhetes "não lidos" não existem no banco; o cartão mostra os 3 últimos recebidos.

## Código

- [x] `src/lib/papeis.ts`: `papelPrincipal(participacoes)`, com Vitest.
- [x] Extrair da tela Sessão, sem mudar o comportamento:
  - `src/lib/ui/BotaoPlaca.svelte` (levantar e baixar, posição na fila);
  - `src/lib/ui/Votar.svelte` (botões de voto permitidos e voto dado).
  
  A Sessão e o Agora passam a usar os dois.
- [x] O Agora reaproveita `carregarSessao(comiteId)` (a mesma consulta da tela de sessão) e a assinatura com `AoVivo comiteId`, em vez de uma consulta nova.
- [x] Os cartões de cada papel ficaram na própria página do Agora (cada um é curto); os cartões de antes (agora, depois, avisos, crise, press, DPOs, você) continuam abaixo.

## Telas

O Agora, por papel:

- **Delegado:**
  - cartão grande "Sessão ao vivo": quem fala, os dois relógios, o momento do debate ("Há pontos ou moções?"), `BotaoPlaca` e, com votação aberta, `Votar`;
  - "Na sua caixa": respostas da crise e os 3 últimos bilhetes;
  - "Prazos": DPO pendente e rodada aberta de um documento do seu bloco, com o prazo;
  - "Depois", do cronograma.
- **Delegação que preside:** no topo, cartão dourado "Você preside a sessão 3", com "Abrir o painel".
- **Mesa:**
  - "Sessão": estado e botão para a chamada ou para o painel;
  - contadores com link: chegadas a confirmar (passo 21), pedidos para aprovar (passo 29), DPOs enviados, documentos enviados à mesa.
- **Press:** entrevistas aceitas de hoje, coletiva aberta, últimas notícias do veículo, botão "Escrever".
- **Crise:** notas pendentes (contagem e link) e a crise ativa (o passo 35 acrescenta o prazo).
- **Secretaria:** check-in (presentes e faltando) e o atalho para avisos.

O menu, por papel:

- **Mesa:** "Painel" (presidência) no lugar de "Sessão".
- **Press:** "Press" primeiro, depois "Escrever".
- **Crise:** "Crise" depois de "Agora".
- **Delegado:** como hoje.

Cabeçalho do Agora no estilo capa: evento, comitê, data e "Sessão 3 · Debate". O acabamento visual fica para o passo 37.

## Dados

- [ ] Medir os KB por atualização no Agora com a sessão ao vivo (como no passo 15). Usa a mesma consulta da tela de sessão, já medida (cerca de 7 KB por atualização).

## Testes

Arquivos: `src/lib/papeis.test.ts` e `tests/32-agora.spec.ts` (o `04-agora.spec.ts` é ajustado).

- [x] Vitest: `papelPrincipal` com cada combinação.
- [x] Ponta a ponta por papel (CE-T em debate): o delegado vê a sessão ao vivo e levanta a placa pelo Agora, e a mesa a vê chegar; a mesa vê os atalhos e contadores, e o menu "Painel" leva ao painel; press e crise veem os seus cartões. O cartão dourado da presidência depende do sorteio do rodízio e ficou fora do teste automático.
- [x] O menu da mesa tem "Painel"; o do delegado, "Sessão".
- [ ] Capturas do Agora por papel, nos 3 tamanhos (no próximo "atualizar_capturas").

## Pronto quando

- [x] Abrir o app mostra a cada pessoa o que ela precisa fazer agora.
- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
