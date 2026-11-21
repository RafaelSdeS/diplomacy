# Passo 32 · Aba Agora e menu por papel

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 14)
**Depende de:** 26, 28, 29 e 30
**Esforço:** M–G
**Objetivo:** o Agora vira o painel principal de cada papel, com a sessão ao vivo em primeiro lugar, e o menu muda conforme o papel.

## Hoje

- `src/routes/+page.svelte` e `+page.ts`: cartões de acontecendo agora (fase de cada comitê e cronograma), depois, avisos, respostas da crise, na press, seus DPOs e você.
- Não mostra quem fala, os relógios, a placa nem a votação aberta, embora o app já tenha esses dados em tempo real.
- O menu (`+layout.svelte`, lista `telas`) é igual para quase todos; só "Crise" e "Participantes" dependem do papel. A mesa chega ao painel por botões no fim da tela Sessão.

## Decisões

- Um papel principal por pessoa para montar a tela: secretaria > diretoria da press > mesa > crise > press > delegado. Quem tem mais de um papel vê os cartões extras abaixo.
- O cartão ao vivo usa uma consulta leve, não a `carregarSessao` inteira.
- Bilhetes "não lidos" não existem no banco; o cartão mostra os 3 últimos recebidos.

## Código

- [ ] `src/lib/papeis.ts`: `papelPrincipal(participacoes)`, com Vitest.
- [ ] Extrair da tela Sessão, sem mudar o comportamento:
  - `src/lib/ui/BotaoPlaca.svelte` (levantar e baixar, posição na fila);
  - `src/lib/ui/Votar.svelte` (botões de voto permitidos e voto dado).
  
  A Sessão e o Agora passam a usar os dois.
- [ ] `src/lib/sessao.ts`: `carregarAoVivo(comiteId)`, com estado (orador, os dois relógios, forma, fase, pausa), votação aberta com os votos, fila de placas e lista curta. Assinatura com `AoVivo comiteId`.
- [ ] `src/lib/ui/agora/`: um componente por papel (`Delegado.svelte`, `Presidencia.svelte`, `Mesa.svelte`, `Press.svelte`, `Crise.svelte`, `Secretaria.svelte`) e os cartões comuns (cronograma e avisos).

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

- [ ] Medir os KB por atualização no Agora com a sessão ao vivo (como no passo 15) e registrar no passo.

## Testes

Arquivos: `src/lib/papeis.test.ts` e `tests/32-agora.spec.ts` (o `04-agora.spec.ts` é ajustado).

- [ ] Vitest: `papelPrincipal` com cada combinação.
- [ ] Ponta a ponta por papel:
  - o delegado vê quem fala e levanta a placa pelo Agora; a mesa vê a placa chegar;
  - a delegação que preside vê o cartão dourado;
  - a mesa vê os contadores com os números certos;
  - a press vê a entrevista do dia;
  - a crise vê as notas pendentes.
- [ ] O menu da mesa tem "Painel"; o do delegado, "Sessão".
- [ ] Capturas do Agora por papel, nos 3 tamanhos.

## Pronto quando

- [ ] Abrir o app mostra a cada pessoa o que ela precisa fazer agora.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
