# Passo 06 · Sessão e telão

**Parte de:** piloto
**Depende de:** 04 e 05
**Objetivo:** conduzir uma sessão pelo app, com chamada, quórum, presidência em rodízio, pedidos de fala, cronômetro, pontos e moções, e mostrar tudo no telão.

## Banco

```sql
create type forma_debate as enum ('formal_formal', 'formal_informal', 'informal_informal');
create type situacao_presenca as enum ('presente', 'presente_e_votando');

create table sessao (
  id uuid primary key default gen_random_uuid(),
  comite_id uuid not null references comite,
  numero int not null,
  presidencia_delegacao_id uuid references delegacao,   -- nulo = bureau preside
  inicio timestamptz, fim timestamptz,
  unique (comite_id, numero)
);

create table presenca (
  sessao_id uuid references sessao, delegacao_id uuid references delegacao,
  situacao situacao_presenca not null,
  primary key (sessao_id, delegacao_id)
);

create table rodizio_presidencia (            -- ordem sorteada; o que passar das sessões vira lista de espera
  comite_id uuid references comite, ordem int, delegacao_id uuid references delegacao,
  primary key (comite_id, ordem)
);

create table estado_sessao (                  -- uma linha por comitê, atualizada ao vivo
  comite_id uuid primary key references comite,
  sessao_id uuid references sessao,
  forma forma_debate not null default 'formal_formal',
  orador_delegacao_id uuid references delegacao,
  cronometro_inicio timestamptz,
  cronometro_duracao_seg int,
  cronometro_pausado_restante_seg int,        -- preenchido enquanto pausado
  informal_inicio timestamptz,
  atualizado_em timestamptz not null default now()
);

create table pedido_fala (                    -- a placa digital
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references sessao,
  delegacao_id uuid not null references delegacao,
  criado_em timestamptz not null default now(),
  atendido boolean not null default false
);

create table ponto_mocao (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references sessao,
  delegacao_id uuid not null references delegacao,
  tipo text not null,                         -- ponto_ordem, ponto_duvida, privilegio_pessoal, informal_informal, adiamento_sessao...
  detalhe text,
  status text not null default 'aberto',
  criado_em timestamptz not null default now()
);
```

## Presidência

- `pode_presidir(comite_id)`: é da mesa, ou é delegado da delegação que preside a sessão atual.
- As ações de quem preside passam por funções que checam `pode_presidir`. Ninguém altera `estado_sessao` direto:
  - `dar_palavra(delegacao)`;
  - `iniciar_cronometro(seg)`, `pausar()`, `retomar()` e `somar_segundos(n)`;
  - `mudar_forma(forma, minutos)`, que respeita o limite de 45 minutos de informal-informal;
  - `passar_presidencia()`.
- `sortear_presidencia(comite, voluntarias uuid[])` (só a mesa): grava a ordem do rodízio.
- O bureau preside a primeira sessão e as de votação: nelas, `presidencia_delegacao_id` fica nulo.

## Cronômetro

- O banco guarda só o início, a duração e o tempo restante na pausa. Cada aparelho calcula o tempo que falta, e nada é enviado a cada segundo.
- Ao abrir a tela, o app chama `agora()` no banco para corrigir a diferença de relógio do aparelho.
- O aviso de fim de tempo usa `aviso_fala_seg` das regras (10 s): aparece na tela e não depende só de cor.

## Tempo real

- `estado_sessao`, `pedido_fala` e `ponto_mocao` entram na publicação `supabase_realtime`, filtrados por comitê ou sessão.
- Todas as assinaturas de tempo real ficam em `src/lib/tempo-real.ts`. Assim, a troca para Broadcast no passo 13 mexe num arquivo só.

## Telas

| Tela | Celular | Notebook |
|---|---|---|
| Delegado `/comite/[sigla]/sessao` | Botão grande "Levantar placa", orador atual, tempo restante, enviar ponto ou moção, placa em tela cheia | Igual, com mais espaço |
| Presidência `/comite/[sigla]/presidencia` | Funciona, em uma coluna | Pedidos de fala por ordem de chegada à esquerda, cronômetro ao centro, pontos e moções à direita; atalhos de teclado (espaço pausa, Enter dá a palavra ao próximo) |
| Mesa `/comite/[sigla]/chamada` | Lista de delegações com botões de presença | Igual, com o quórum calculado ao lado |
| Telão `/telao/[sigla]` | Não se aplica | 1920 × 1080: forma de debate, orador com bandeira, cronômetro grande e pauta (passo 07) |

O telão usa a API de tela cheia e o Wake Lock, para a tela não apagar. Ele roda logado com a conta da mesa no notebook do projetor e não tem botões.

## Testes

Arquivos: `supabase/tests/06-sessao.test.sql`, `src/lib/sessao/cronometro.test.ts` e `tests/06-sessao.spec.ts`.

- [ ] pgTAP: um delegado de uma delegação que não preside não consegue dar a palavra nem mexer no cronômetro.
- [ ] pgTAP: o delegado da delegação que preside consegue, e a mesa sempre consegue.
- [ ] pgTAP: na primeira sessão, quem preside é o bureau.
- [ ] pgTAP: só a mesa sorteia o rodízio; `passar_presidencia` segue a ordem sorteada e depois a lista de espera.
- [ ] pgTAP: o informal-informal não passa de 45 minutos.
- [ ] pgTAP: a chamada calcula o quórum certo.
- [ ] Vitest: o tempo restante do cronômetro com pausa, retomada, segundos somados e diferença de relógio do aparelho.
- [ ] Vitest: o aviso começa quando faltam 10 segundos.
- [ ] Ponta a ponta: um pedido de fala aparece no painel da presidência em menos de 1 segundo (dois navegadores).
- [ ] Ponta a ponta: dois navegadores mostram o mesmo tempo, com diferença máxima de 1 segundo.
- [ ] Ponta a ponta: os atalhos de teclado do painel funcionam.
- [ ] Ponta a ponta: o telão em 1920 × 1080 mostra orador, bandeira e cronômetro sem rolagem.
- [ ] Aparência: capturas de referência do painel da presidência e do telão.
- [ ] Manual: o telão num projetor de verdade, lido do fundo da sala.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [ ] Uma sessão de teste roda com chamada, sorteio do rodízio, falas cronometradas, pontos, moções e telão.
- [ ] O telão é legível em 1920 × 1080, e o painel funciona com 360 px e com 1366 px.
