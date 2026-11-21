# Passo 29 · Pontos e moções em duas etapas: bureau, depois presidência

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 12)
**Depende de:** 28
**Esforço:** M
**Objetivo:** seguir o fluxo real: a delegação apresenta, o bureau aprova ou recusa, e só depois a presidência concede.

## Hoje

- A delegação envia (`enviar_ponto`) e quem preside, mesa ou delegação da vez (`pode_presidir`), aceita ou recusa num passo só (`responder_ponto`, versão atual em `20261203090000_procedimento.sql:311`).
- `abrir_votacao` e `abrir_lista_especial` partem direto de um pedido `aberto`.
- `ponto_mocao.status`: `aberto`, `em_discussao`, `em_votacao`, `aceito`, `recusado`.

## Decisões

- **Pontos e moções** passam pelo bureau e só depois a presidência concede (você, 20/11). Vale para todos os tipos.
- **Quando o próprio bureau preside** (plenária de abertura, fase de ação, mesa assumiu), as duas etapas viram um toque só: a mesa concede direto.
- Fora de ordem leva um motivo curto, que a delegação vê.

## Banco

Migração `supabase/migrations/20261212090000_mocoes_em_duas_etapas.sql`:

- [ ] `ponto_mocao`:
  - novo status `em_ordem` (aprovado pelo bureau, aguardando a presidência), recriando a `check` de status;
  - colunas `motivo text check (char_length(motivo) <= 200)`, `julgado_por uuid references pessoa on delete set null`, `julgado_em timestamptz`.
- [ ] `bureau_preside(p_comite) returns boolean` (stable): `fase <> 'debate' or mesa_assumiu`.
- [ ] `julgar_ponto(p_ponto uuid, p_em_ordem boolean, p_motivo text default null)`: só a mesa (`exigir_mesa`); só de `aberto`; vai para `em_ordem`, ou para `recusado` com motivo.
- [ ] `responder_ponto`, `abrir_votacao` e `abrir_lista_especial` (`create or replace` a partir das versões atuais): exigem `em_ordem`; aceitam `aberto` só se `bureau_preside(comite)` e quem chama é da mesa. Mensagem: "O bureau ainda não aprovou este pedido."
- [ ] A votação nominal pedida durante a votação de projeto segue o mesmo caminho (o bureau aprova e a presidência reconhece).
- [ ] Regenerar os tipos.

## Telas

- [ ] `src/lib/sessao.ts`: `SITUACAO_PONTO` ganha `em_ordem: 'Aprovado pelo bureau · aguardando a presidência'`, e `aberto` passa a ser "Aguardando o bureau".
- [ ] **Painel**, conforme quem está na tela:
  - **mesa, com uma delegação presidindo:** seção "Bureau · pedidos para aprovar" (os `aberto`), com "Em ordem" e "Fora de ordem" (pede o motivo num campo curto);
  - **delegação que preside:** seção "Presidência · pedidos aprovados" (os `em_ordem`), com os botões de hoje (aceitar, votar, abrir lista especial);
  - **bureau presidindo:** uma lista só, com os botões de concessão funcionando desde o `aberto`.
- [ ] **Sessão** (delegado): "Seus pedidos" mostra a etapa ("Aguardando o bureau", "Aprovado · aguardando a presidência", "Fora de ordem: <motivo>").
- [ ] **Telão:** linha "Em análise: Moção de informal-informal · França" enquanto houver pedido aberto ou aprovado.

## Testes

Arquivos: `supabase/tests/29-mocoes.test.sql` e `tests/29-mocoes.spec.ts`.

- [ ] pgTAP:
  - delegado não julga;
  - a delegação que preside não concede um pedido `aberto`;
  - a mesa julga e a presidência concede;
  - com o bureau presidindo, um toque basta;
  - fora de ordem guarda o motivo, e o autor lê.
- [ ] Ajustar os testes que concedem direto no debate com uma delegação presidindo: pgTAP 06, 07 e 16, e ponta a ponta `06-sessao.spec.ts` e `16-procedimento.spec.ts`. Basta aprovar antes.
- [ ] Ponta a ponta, com três navegadores (delegado, mesa e delegação que preside): moção de informal-informal enviada, aprovada pelo bureau, concedida e votada pela presidência; outra recusada com motivo, visível ao delegado.

## Pronto quando

- [ ] Nenhum pedido chega à presidência sem passar pelo bureau, a não ser quando o próprio bureau preside.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
