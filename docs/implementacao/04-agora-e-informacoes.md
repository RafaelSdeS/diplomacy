# Passo 04 · Tela "Agora", perfis, comitê, cronograma e avisos

**Parte de:** piloto
**Depende de:** 03
**Objetivo:** dar a cada pessoa uma tela inicial com o que importa naquele minuto, mais as informações do evento.

## Banco

```sql
create table cronograma_item (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references evento,
  comite_id uuid references comite,          -- nulo = vale para todos
  titulo text not null,
  local text,
  inicio timestamptz not null,
  fim timestamptz not null
);

create table aviso (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references evento,
  comite_id uuid references comite,          -- nulo = para todos
  texto text not null,
  autor_id uuid references pessoa,
  criado_em timestamptz not null default now()
);

alter table pessoa add column bio text, add column foto_path text;
```

- Leitura: participantes do evento, ou do comitê quando `comite_id` estiver preenchido.
- Escrita: secretaria (avisos gerais e cronograma) e mesa (avisos do próprio comitê).
- `aviso` entra na publicação `supabase_realtime`.

## Telas

| Rota | Celular | Notebook |
|---|---|---|
| `/` Agora | Cartões empilhados, o mais importante primeiro | Cartões em duas colunas |
| `/cronograma` | Lista do dia com o item atual destacado | Lista por dia, com os dias lado a lado |
| `/avisos` | Lista, com os não lidos marcados | Igual, mais largo |
| `/comite/[sigla]` | Tema, tópicos, mesa, delegações com bandeira e guias | Mesmo conteúdo em duas colunas |
| `/perfil` | Nome, foto, minibiografia, função e comitê | Igual |

- **Agora** neste passo: sessão atual (sala e horário, a partir do cronograma), próximo item e avisos não lidos. Os passos seguintes adicionam seus próprios cartões: posição na fila de fala, resposta de crise, situação do DPO e plantão da press.
- **Bandeiras:** `flag-icons`, carregando só o SVG de cada país usado.
- **Fotos:** reduzidas no aparelho antes do envio (até 512 px, WebP), no bucket `fotos` do Storage. Cada pessoa só altera a própria foto.
- **Guias:** links para o Drive. O PDF não é carregado junto com a tela.

## Testes

Arquivos: `supabase/tests/04-informacoes.test.sql`, `src/lib/ui/reduzir-imagem.test.ts` e `tests/04-agora.spec.ts`.

- [ ] pgTAP: um aviso de um comitê não aparece para quem é de outro comitê.
- [ ] pgTAP: só a secretaria publica avisos gerais e mexe no cronograma; a mesa publica avisos só do próprio comitê.
- [ ] pgTAP: cada pessoa altera só a própria foto no Storage.
- [ ] Vitest: a redução de imagem entrega no máximo 512 px.
- [ ] Ponta a ponta: a secretaria publica um aviso, e ele aparece para um delegado sem recarregar, nas três telas.
- [ ] Ponta a ponta: a Agora destaca o item do cronograma que está acontecendo (relógio controlado).
- [ ] Ponta a ponta: a página do comitê lista as 15 delegações com bandeira e nome.
- [ ] Acessibilidade: axe sem erros na Agora, no cronograma, nos avisos, no perfil e no comitê.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [ ] A Agora mostra a sessão atual, o próximo item e os avisos.
- [ ] Um aviso novo chega sem recarregar a página.
- [ ] As telas funcionam com 360 px e com 1366 px.
