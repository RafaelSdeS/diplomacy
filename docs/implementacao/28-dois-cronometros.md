# Passo 28 · Dois cronômetros: fala e debate

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 11)
**Depende de:** 21
**Esforço:** M
**Objetivo:** o tempo de debate que a presidência define não se perde quando alguém recebe a palavra; tempo de fala e tempo de debate são dois relógios.

## Como ficou

- Banco (`20261211090000_cronometros.sql`): colunas `debate_*` em `estado_sessao`; `aplicar_forma` usa o relógio do debate e desconta só os minutos usados do informal; `pausar`, `retomar` e `somar_segundos` com `p_relogio`; `aplicar_tempo_fala`; abrir e encerrar a sessão limpam o relógio do debate.
- Painel: tempo de fala com "Aplicar" e 30/60/90/120 s; relógio do debate com pausar, +1 e −1 min; cartão de informal esgotado; minutos de informal já encerrados na sessão.
- Sessão e telão mostram o relógio do debate quando ele existe.

## Antes

Há um só cronômetro por comitê (`estado_sessao.cronometro_*`):

- `aplicar_forma` (`20261124090000_plenaria_e_votacao.sql:346`) usa o cronômetro para os minutos do formal-informal e do informal-informal.
- `dar_palavra` (`:395`) usa o mesmo cronômetro para o tempo de fala. Dar a palavra **apaga** o tempo do debate.
- O campo "Tempo de fala" do painel só vale na próxima vez que alguém recebe a palavra, sem aviso.
- Os minutos do informal-informal são descontados inteiros no início (`:361`), mesmo que ele acabe antes.
- Quando o tempo do informal acaba, nada acontece.

## Decisões

- O limite do informal-informal é de **45 minutos somados em cada sessão** (você, 20/11). É o que o app já faz; agora conta só o tempo usado.
- Fim do tempo do debate não muda nada sozinho (o banco não tem relógio que dispare): o painel avisa e a presidência decide com um toque.

## Banco

Migração `supabase/migrations/20261211090000_cronometros.sql`:

- [x] `estado_sessao`: colunas `debate_inicio timestamptz`, `debate_duracao_seg int`, `debate_pausado_restante_seg int`. As `cronometro_*` passam a ser só da fala.
- [x] `create or replace function public.aplicar_forma`:
  - grava os minutos em `debate_*`, sem tocar em `cronometro_*`;
  - antes de trocar, se a forma atual é informal-informal, soma os minutos usados (`least(minutos definidos, ceil(decorrido / 60))`, descontando as pausas) em `sessao.informal_min_usados`;
  - ao começar um informal, só confere se `usados + p_minutos <= limite`, sem somar ainda.
- [x] `create or replace function public.encerrar_sessao`: também soma os minutos de um informal em andamento e limpa `debate_*`.
- [x] `pausar`, `retomar` e `somar_segundos` ganham `p_relogio text default 'fala'` (`'fala'` ou `'debate'`).
- [x] `aplicar_tempo_fala(p_comite, p_seg)`: grava `tempo_fala_seg` e, se alguém está falando, ajusta a fala atual (`cronometro_duracao_seg = p_seg`, o tempo decorrido continua contando).
- [x] Regenerar os tipos e acrescentar as colunas novas ao `select` de `carregarSessao` (`src/lib/sessao.ts`) e do telão.

## Código e telas

- [x] `src/lib/cronometro.ts`: o cálculo passa a receber o trio `{ inicio, duracao, pausado }`, com `relogioFala(estado)` e `relogioDebate(estado)` montando o trio de cada um. `restanteSeg` e `fase` ficam iguais por dentro.
- [x] `src/lib/ui/Cronometro.svelte`: recebe um relógio e um rótulo ("Fala", "Formal-informal · 20 min").
- [x] **Painel da presidência:**
  - relógio da fala grande, e o do debate menor, cada um com pausar e retomar; "+1 min" e "−1 min" no do debate;
  - campo "Tempo de fala" com "Aplicar" e valores rápidos (30, 60, 90 e 120 s); com alguém falando, aplicar ajusta a fala atual;
  - debate esgotado: cartão "Tempo do informal-informal esgotado", com "Voltar ao formal-informal" (`mudar_forma('formal_informal', null)`).
- [x] **Sessão** (delegado): os dois relógios, o do debate só quando existe.
- [x] **Telão:** relógio do debate no cabeçalho; o da fala continua grande.
- [x] O minuto usado do informal-informal aparece no painel: "Informal-informal: 20 de 45 min nesta sessão".

## Testes

Arquivos: `src/lib/cronometro.test.ts` (ampliado), `supabase/tests/28-cronometros.test.sql` e `tests/28-cronometros.spec.ts`.

- [x] Vitest: cada relógio correndo, pausado e esgotado; um não afeta o outro.
- [x] pgTAP:
  - `dar_palavra` não altera `debate_*`;
  - encerrar o informal antes do tempo soma só os minutos usados (no teste, recuar `debate_inicio` com `update`);
  - passar dos 45 minutos na sessão é recusado;
  - `aplicar_tempo_fala` ajusta a fala atual.
- [x] Ponta a ponta (CE-T levado ao debate por `comiteEmDebate()` em `tests/ajuda.ts`): a presidência define 20 min de formal-informal e dá a palavra; o relógio do debate segue contando; valor rápido do tempo de fala; com o relógio adiantado (`page.clock`), o informal esgotado mostra o cartão e volta ao formal-informal.
- [x] Ajustar o pgTAP do 06 sobre o limite do informal (agora os minutos contam no fim).
- [ ] Capturas do painel e do telão refeitas (no próximo `workflow_dispatch` "atualizar_capturas").

## Pronto quando

- [x] Dar a palavra nunca apaga o tempo de debate definido pela presidência.
- [x] O informal-informal desconta só o tempo usado, até 45 minutos por sessão.
- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
