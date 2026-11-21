# Passo 28 · Dois cronômetros: fala e debate

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 11)
**Depende de:** 21
**Esforço:** M
**Objetivo:** o tempo de debate que a presidência define não se perde quando alguém recebe a palavra; tempo de fala e tempo de debate são dois relógios.

## Hoje

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

- [ ] `estado_sessao`: colunas `debate_inicio timestamptz`, `debate_duracao_seg int`, `debate_pausado_restante_seg int`. As `cronometro_*` passam a ser só da fala.
- [ ] `create or replace function public.aplicar_forma`:
  - grava os minutos em `debate_*`, sem tocar em `cronometro_*`;
  - antes de trocar, se a forma atual é informal-informal, soma os minutos usados (`least(minutos definidos, ceil(decorrido / 60))`, descontando as pausas) em `sessao.informal_min_usados`;
  - ao começar um informal, só confere se `usados + p_minutos <= limite`, sem somar ainda.
- [ ] `create or replace function public.encerrar_sessao`: também soma os minutos de um informal em andamento e limpa `debate_*`.
- [ ] `pausar`, `retomar` e `somar_segundos` ganham `p_relogio text default 'fala'` (`'fala'` ou `'debate'`).
- [ ] `aplicar_tempo_fala(p_comite, p_seg)`: grava `tempo_fala_seg` e, se alguém está falando, ajusta a fala atual (`cronometro_duracao_seg = p_seg`, o tempo decorrido continua contando).
- [ ] Regenerar os tipos e acrescentar as colunas novas ao `select` de `carregarSessao` (`src/lib/sessao.ts`) e do telão.

## Código e telas

- [ ] `src/lib/cronometro.ts`: o cálculo passa a receber o trio `{ inicio, duracao, pausado }`, com `relogioFala(estado)` e `relogioDebate(estado)` montando o trio de cada um. `restanteSeg` e `fase` ficam iguais por dentro.
- [ ] `src/lib/ui/Cronometro.svelte`: recebe um relógio e um rótulo ("Fala", "Formal-informal · 20 min").
- [ ] **Painel da presidência:**
  - relógio da fala grande, e o do debate menor, cada um com pausar e retomar; "+1 min" e "−1 min" no do debate;
  - campo "Tempo de fala" com "Aplicar" e valores rápidos (30, 60, 90 e 120 s); com alguém falando, aplicar ajusta a fala atual;
  - debate esgotado: cartão "Tempo do informal-informal esgotado", com "Voltar ao formal-informal" (`mudar_forma('formal_informal', null)`).
- [ ] **Sessão** (delegado): os dois relógios, o do debate só quando existe.
- [ ] **Telão:** relógio do debate no cabeçalho; o da fala continua grande.
- [ ] O minuto usado do informal-informal aparece no painel: "Informal-informal: 20 de 45 min nesta sessão".

## Testes

Arquivos: `src/lib/cronometro.test.ts` (ampliado), `supabase/tests/28-cronometros.test.sql` e `tests/28-cronometros.spec.ts`.

- [ ] Vitest: cada relógio correndo, pausado e esgotado; um não afeta o outro.
- [ ] pgTAP:
  - `dar_palavra` não altera `debate_*`;
  - encerrar o informal antes do tempo soma só os minutos usados (no teste, recuar `debate_inicio` com `update`);
  - passar dos 45 minutos na sessão é recusado;
  - `aplicar_tempo_fala` ajusta a fala atual.
- [ ] Ponta a ponta, com relógio controlado (`page.clock`): a presidência define 20 min de formal-informal e dá a palavra; o relógio do debate segue contando no painel e no telão; o informal esgotado mostra o cartão e volta ao formal-informal.
- [ ] Ajustar os testes do 06 que leem o cronômetro único.
- [ ] Capturas do painel e do telão refeitas.

## Pronto quando

- [ ] Dar a palavra nunca apaga o tempo de debate definido pela presidência.
- [ ] O informal-informal desconta só o tempo usado, até 45 minutos por sessão.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
