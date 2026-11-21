# Passo 29 · Pontos e moções em duas etapas: bureau, depois presidência

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 12)
**Depende de:** 28
**Esforço:** M
**Objetivo:** seguir o fluxo real: a delegação apresenta, o bureau aprova ou recusa, e só depois a presidência concede.

## Como ficou

- Banco (`20261212090000_mocoes_em_duas_etapas.sql`): `aprovado_bureau` e motivo em `ponto_mocao`, `bureau_preside`, `julgar_ponto` e o gatilho que exige o julgamento.
- Painel: a mesa vê "Bureau · pedidos para aprovar" (em ordem; fora de ordem com motivo); a presidência vê só os aprovados. Delegado vê a etapa; telão mostra "Em análise".

## Antes

- A delegação envia (`enviar_ponto`) e quem preside, mesa ou delegação da vez (`pode_presidir`), aceita ou recusa num passo só (`responder_ponto`, versão atual em `20261203090000_procedimento.sql:311`).
- `abrir_votacao` e `abrir_lista_especial` partem direto de um pedido `aberto`.
- `ponto_mocao.status`: `aberto`, `em_discussao`, `em_votacao`, `aceito`, `recusado`.

## Decisões

- **Pontos e moções** passam pelo bureau e só depois a presidência concede (você, 20/11). Vale para todos os tipos.
- **Quando o próprio bureau preside** (plenária de abertura, fase de ação, mesa assumiu), as duas etapas viram um toque só: a mesa concede direto.
- Fora de ordem leva um motivo curto, que a delegação vê.

## Banco

Migração `supabase/migrations/20261212090000_mocoes_em_duas_etapas.sql`:

- [x] `ponto_mocao`: colunas `aprovado_bureau boolean` (nulo = aguardando o bureau), `motivo`, `julgado_por`, `julgado_em`. Em vez de um status novo, a aprovação fica numa coluna: o pedido continua "aberto" até a presidência agir, e as funções de conceder não mudam.
- [x] `bureau_preside(p_comite) returns boolean` (stable): `fase <> 'debate' or mesa_assumiu` ou sem delegação na presidência.
- [x] `julgar_ponto(p_ponto uuid, p_em_ordem boolean, p_motivo text default null)`: só a mesa (`exigir_mesa`); só pedido aberto e ainda não julgado; marca `aprovado_bureau`, ou recusa com motivo.
- [x] Gatilho `exigir_julgamento_do_bureau` em `ponto_mocao`: sair de "aberto" (conceder, votar, abrir lista, recusar) exige o julgamento, a não ser que o bureau esteja presidindo ou a própria mesa aja (o julgamento está implícito). Mensagem: "O bureau ainda não aprovou este pedido." `responder_ponto`, `abrir_votacao` e `abrir_lista_especial` ficaram como estavam.
- [x] A votação nominal pedida durante a votação de projeto segue o mesmo caminho (o bureau aprova e a presidência reconhece).
- [x] Regenerar os tipos.

## Telas

- [x] `src/lib/sessao.ts`: `situacaoDoPonto()` ("Aguardando o bureau", "Aprovado pelo bureau · aguardando a presidência", "Recusado: motivo") e `bureauPreside()`. O botão do delegado vira "Enviar à mesa".
- [x] **Painel**, conforme quem está na tela:
  - **mesa, com uma delegação presidindo:** seção "Bureau · pedidos para aprovar" (os `aberto`), com "Em ordem" e "Fora de ordem" (pede o motivo num campo curto);
  - **delegação que preside:** a seção "Pontos e moções" mostra só os aprovados, com os botões de hoje (aceitar, votar, abrir lista especial);
  - **bureau presidindo:** uma lista só, com os botões de concessão funcionando desde o `aberto`.
- [x] **Sessão** (delegado): "Seus pedidos" mostra a etapa ("Aguardando o bureau", "Aprovado · aguardando a presidência", "Fora de ordem: <motivo>").
- [x] **Telão:** linha "Em análise: Moção de informal-informal · França" enquanto houver pedido aberto ou aprovado.

## Testes

Arquivos: `supabase/tests/29-mocoes.test.sql` e `tests/29-mocoes.spec.ts`.

- [x] pgTAP:
  - delegado não julga;
  - a delegação que preside não concede um pedido `aberto`;
  - a mesa julga e a presidência concede;
  - com o bureau presidindo, um toque basta;
  - fora de ordem guarda o motivo, e o autor lê.
- [x] Testes antigos: só o ponta a ponta do 06 (a delegação que preside concedia direto) precisou do julgamento antes; os pgTAP passam porque a mesa concede com o julgamento implícito.
- [x] Ponta a ponta: o 06 cobre o caminho com três navegadores (delegado, mesa e delegação que preside: aguardando o bureau, aprovado, concedido); o 29 cobre a recusa com motivo visível ao delegado e o "Em análise" no telão.

## Pronto quando

- [x] Nenhum pedido chega à presidência sem passar pelo bureau, a não ser quando o próprio bureau preside.
- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
