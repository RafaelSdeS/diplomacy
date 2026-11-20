# Passo 07 · Plenária de abertura, agenda e votação

**Parte de:** piloto
**Depende de:** 06
**Objetivo:** conduzir o comitê da plenária de abertura até o debate do tópico, com lista de oradores, agenda, moções votadas e resultado calculado pelo banco, seguindo as [regras de procedimento](../regras-de-procedimento.md) do UNOCT.

## Ajustes dos passos 05 e 06 (regras do UNOCT)

As regras do UNOCT, que valem para todos os comitês, mudam algumas escolhas feitas antes:

- [ ] **Regras (passo 05):**
  - `assinaturas_projeto_fracao` (1/5) vira `assinaturas_projeto_min = 5`;
  - novas chaves `max_sessoes_presidencia = 2` e `assinaturas_desconfianca_fracao = [1, 5]`;
  - nova função `quorum_votacao(comite)`: maioria simples das delegações previstas;
  - os textos de `regrasLegiveis` acompanham as mudanças.
- [ ] **Sorteio da presidência (passo 06):**
  - `sortear_presidencia(comite)` sorteia todas as delegações que não são observadoras nem suspensas, sem lista de voluntárias;
  - observadora nunca preside, e uma delegação preside no máximo `max_sessoes_presidencia` sessões.
- [ ] **Quem preside:** o bureau preside enquanto o comitê está na plenária de abertura ou na fase de ação, e quando a mesa assume a presidência num caso excepcional (`assumir_presidencia` e `devolver_presidencia`). `pode_presidir` passa a considerar a fase do comitê. A sessão "de votação" do passo 06 dá lugar à fase de ação.
- [ ] **Formas de debate:** o formal-formal só existe na plenária de abertura. Fora dela, o fluxo normal é o formal-informal: a presidência escolhe entre as placas levantadas, como já faz a fila do passo 06.
- [ ] **Pontos e moções:**
  - os tipos passam a ser os do UNOCT: ponto de ordem, de privilégio pessoal e de dúvida; moções de tópico no topo, adiamento do debate, adiamento da sessão, informal-informal, não-confiança, divisão da questão e votação nominal;
  - saem as moções de formal-informal, suspensão e encerramento do debate;
  - o ponto de ordem fica bloqueado enquanto outra delegação fala.

## Banco

```sql
create type fase_comite as enum ('plenaria', 'debate', 'acao', 'encerrado');

-- Andamento do comitê, na linha de estado_sessao (passo 06):
--   fase fase_comite not null default 'plenaria',
--   etapa_plenaria text check (etapa_plenaria in ('briefing', 'discursos', 'topico')),
--   topico_atual int,                         -- índice em comite.topicos
--   ordem_topicos int[],                      -- definida pela moção de tópico no topo
--   mesa_assumiu boolean not null default false

create table lista_oradores (                 -- discursos de abertura e listas especiais (2 a favor, 2 contra)
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null, comite_id uuid not null,
  delegacao_id uuid not null,
  motivo text not null,                       -- abertura, ou o id da moção da lista especial
  lado text check (lado in ('a_favor', 'contra')),
  ordem int not null,
  falou boolean not null default false
);

create table proposta_agenda (                -- agenda informal: tópico › subtópicos › pontos
  id uuid primary key default gen_random_uuid(),
  comite_id uuid not null references comite,
  delegacao_id uuid references delegacao,     -- nula: sugestão do bureau
  topico int not null,
  adotada boolean not null default false
);

create table ponto_pauta (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references proposta_agenda on delete cascade,
  pai_id uuid references ponto_pauta,
  texto text not null,
  ordem int not null,
  status text not null default 'pendente'     -- pendente, em_debate, debatido
);

create type escolha_voto as enum ('a_favor', 'contra', 'abstencao');

create table votacao (
  id uuid primary key default gen_random_uuid(),
  comite_id uuid not null, sessao_id uuid not null,
  ponto_mocao_id uuid references ponto_mocao, -- a moção votada, quando há
  objeto text not null,                       -- "Tópico 2 no topo da agenda", "Projeto de resolução 1"...
  tipo text not null check (tipo in ('procedimental', 'substantiva')),
  regra text not null,                        -- maioria_simples, dois_tercos (CSNU e unanimidade no passo 16)
  aberta boolean not null default true
);

create table voto (
  votacao_id uuid references votacao,
  delegacao_id uuid references delegacao,
  escolha escolha_voto not null,
  primary key (votacao_id, delegacao_id)      -- um voto por delegação
);
```

Como no passo 06, todas as escritas passam por funções que checam quem pode, e as tabelas guardam `comite_id` com chaves compostas.

## Regras no banco

- **Plenária de abertura:**
  - `avancar_plenaria(comite)` (só o bureau) passa de briefing a discursos e de discursos à moção do tópico;
  - ao entrar nos discursos, todas as delegações presentes entram na lista de oradores, em ordem alfabética;
  - `dar_palavra` segue a lista enquanto ela existe.
- **Lista especial:** `inscrever_lista(moção, lado)` aceita até 2 delegações a favor e 2 contra.
- **Votação:**
  - `abrir_votacao(...)` (quem preside; na fase de ação, só o bureau);
  - `votar(votacao, escolha)` confere se a delegação está presente, se a votação está aberta e se a situação dela permite votar. Observadora só vota em questão procedimental; suspensa não vota. Questão procedimental não aceita abstenção, nem a delegação "presente e votando";
  - `registrar_voto(votacao, delegacao, escolha)`, só da mesa, para os votos contados nas placas;
  - `encerrar_votacao(votacao)` grava o resultado e aplica o efeito da moção.
- **Resultado:** `resultado(votacao) returns (a_favor, contra, abstencoes, necessario, aprovada)`.
  - A base é o número de presentes na sessão. Empate reprova.
  - Votação substantiva sem o quórum de votação (maioria simples das previstas presentes) não abre.
- **Efeitos das moções aprovadas:**
  - **tópico no topo:** define `ordem_topicos` e leva o comitê à fase de debate (rejeitada, entra o outro tópico);
  - **informal-informal:** muda a forma de debate pelos minutos pedidos;
  - **adiamento da sessão:** encerra a sessão.
  - Adiamento do debate, não-confiança, divisão da questão e votação nominal ficam para o passo 16.

## Agenda

1. **Tópicos:** a moção do tópico no topo, no fim da plenária, define qual dos tópicos do comitê é debatido primeiro. O tópico atual fica fixo no telão e na tela "Agora".
2. **Agenda informal:** sugerida no briefing, como árvore (tópico › subtópicos › pontos). O bureau sugere; as delegações podem propor outra. As propostas aparecem lado a lado, e o bureau marca a adotada, por consenso ou depois de uma votação por maioria simples. Os pontos mostram o andamento (pendente, em debate, debatido), e os working papers do passo 09 se ligam a eles.

## Telas

| Tela | Celular | Notebook |
|---|---|---|
| Plenária (bureau), no painel da presidência | Etapa atual e botão para avançar; lista de oradores dos discursos de abertura | Igual, com a lista ao lado do cronômetro |
| Agenda `/comite/[sigla]/sessao/agenda` | Tópicos na ordem; propostas de agenda informal, uma de cada vez | Propostas lado a lado |
| Votar, na tela da sessão | Três botões grandes com ícone e texto (a favor, contra e abstenção, quando cabe) | Igual |
| Votações, no painel da presidência | Abrir, acompanhar, registrar votos de placa e encerrar | Lista de delegações com o voto de cada uma |
| Telão | Não se aplica | Etapa da plenária ou tópico atual; na votação, grade de bandeiras com o voto de cada delegação (cor, ícone e texto) e o resultado |

## Testes

Arquivos: `supabase/tests/07-plenaria-e-votacao.test.sql`, `src/lib/votacao.test.ts` e `tests/07-plenaria-e-votacao.spec.ts`.

- [ ] pgTAP, ajustes: o sorteio inclui todas as delegações não observadoras, nunca uma observadora; ninguém preside mais de 2 sessões; o bureau preside na plenária e na fase de ação; projeto pede 5 signatários.
- [ ] pgTAP: os discursos de abertura põem todas as presentes na lista de oradores, em ordem alfabética; a lista especial aceita no máximo 2 a favor e 2 contra.
- [ ] pgTAP: a mesma delegação não vota duas vezes; abstenção em questão procedimental é recusada.
- [ ] pgTAP: observadora não vota em questão substantiva; suspensa e ausente não votam; votação encerrada não aceita voto.
- [ ] pgTAP: só a mesa registra votos de placa.
- [ ] pgTAP: `resultado()` com os exemplos de maioria das regras; empate reprova; votação substantiva sem quórum de votação não abre.
- [ ] pgTAP: moção de tópico no topo aprovada põe o tópico escolhido primeiro; rejeitada, entra o outro.
- [ ] Vitest: textos e cores do resultado (ícone e texto além da cor).
- [ ] Ponta a ponta: a plenária avança do briefing aos discursos (com a lista de oradores) e à moção do tópico; votada a moção, o comitê entra no debate do tópico escolhido.
- [ ] Ponta a ponta: uma delegação propõe uma agenda informal em árvore, e no notebook as propostas aparecem lado a lado.
- [ ] Ponta a ponta: um voto dado no celular aparece no telão.
- [ ] Acessibilidade: os botões de voto e a grade do telão passam no axe e mostram ícone e texto além da cor.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [ ] O comitê de teste faz a plenária de abertura, escolhe o tópico, adota a agenda informal e vê o andamento de cada ponto.
- [ ] Os resultados batem com as regras, e o voto nunca é indicado só pela cor.
