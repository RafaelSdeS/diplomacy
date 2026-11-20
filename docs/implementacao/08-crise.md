# Passo 08 · Crise

**Parte de:** piloto
**Depende de:** 06
**Objetivo:** uma fila de crise que continua clara quando todo mundo escreve ao mesmo tempo, com notas que só a própria delegação e a equipe de crise veem.

## Banco

```sql
create type status_nota as enum ('pendente', 'em_analise', 'aprovada', 'rejeitada', 'pede_ajuste');

create table nota_crise (
  id uuid primary key,                        -- gerado no aparelho: reenviar nunca duplica
  comite_id uuid not null references comite,
  delegacao_id uuid not null references delegacao,
  autor_id uuid not null references pessoa,
  tipo text not null check (tipo in ('nota', 'diretiva')),
  titulo text not null,
  texto text not null,
  criado_em timestamptz not null default now(),
  status status_nota not null default 'pendente',
  responsavel_id uuid references pessoa,
  resposta text,
  respondida_em timestamptz
);

create table atualizacao_crise (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references evento,
  texto text not null,
  autor_id uuid references pessoa,
  publicada_em timestamptz not null default now()
);

create table atualizacao_comite (              -- crise conjunta: uma atualização, vários comitês
  atualizacao_id uuid references atualizacao_crise, comite_id uuid references comite,
  primary key (atualizacao_id, comite_id)
);
```

- `ficha_delegacao`: view com as notas aprovadas de cada delegação, em ordem.
- `linha_do_tempo`: view que junta atualizações e notas aprovadas do comitê.

## Regras no banco

- `enviar_nota(id, tipo, titulo, texto)`: `insert ... on conflict (id) do nothing`. Antes, trava a linha da delegação (`select ... for update`) e confere `limite_notas_pendentes` das regras, o que evita corrida entre dois envios.
- `assumir_nota(id)`: `update ... set responsavel_id = auth.uid(), status = 'em_analise' where id = $1 and responsavel_id is null`. Se duas pessoas tentam ao mesmo tempo, só uma consegue.
- `responder_nota(id, status, resposta)`: só quem assumiu, ou alguém da crise do comitê.
- `posicao_na_fila(id)`: quantas notas pendentes do comitê são mais antigas.

## Regras de acesso

- O delegado vê só as notas da própria delegação.
- A equipe de crise do comitê vê todas as notas do comitê. A mesa não vê notas de crise.
- Atualizações são visíveis para os participantes dos comitês ligados a elas.

## Telas

| Tela | Celular | Notebook |
|---|---|---|
| Delegado `/comite/[sigla]/crise` | Escrever nota ou diretiva; "minhas notas" com situação e posição na fila; respostas com cara de telegrama | Igual, com a lista ao lado do formulário |
| Equipe `/crise/[sigla]` | Lista; um toque abre a nota | Fila à esquerda e nota aberta à direita; contador de pendentes e tempo da mais antiga no topo, em vermelho acima do limite; filtro por delegação; seleção de várias notas parecidas para a mesma resposta; respostas prontas |
| Atualização | Formulário curto | Formulário com escolha de um ou vários comitês |
| Telão | Não se aplica | A atualização aparece como plantão em destaque |

A Agora do delegado ganha um cartão "nova resposta de crise".

**Resolução de crise:** um botão na atualização cria um documento `resolucao_crise` ligado a ela, usando o editor do passo 09.

## Testes

Arquivos: `supabase/tests/08-crise.test.sql` e `tests/08-crise.spec.ts`.

- [ ] pgTAP: **a delegação A não lê a nota da delegação B.** Este é o teste de privacidade principal.
- [ ] pgTAP: a mesa e a press não leem notas de crise.
- [ ] pgTAP: o limite de notas pendentes é respeitado, inclusive com dois envios simultâneos.
- [ ] pgTAP: com duas pessoas assumindo a mesma nota, só uma consegue.
- [ ] pgTAP: enviar a mesma nota duas vezes cria uma só.
- [ ] pgTAP: só a equipe de crise do comitê responde notas e publica atualizações.
- [ ] pgTAP: uma atualização ligada a dois comitês aparece para os dois e não para um terceiro.
- [ ] pgTAP: `posicao_na_fila` dá a posição certa.
- [ ] Ponta a ponta: um script insere 30 notas de 15 delegações em poucos segundos; o contador, a nota mais antiga e a ordem da fila ficam certos.
- [ ] Ponta a ponta: a resposta chega ao celular do delegado sem recarregar.
- [ ] Ponta a ponta: no notebook, a fila e a nota aberta ficam lado a lado; no celular, um toque na lista abre a nota.
- [ ] Aparência: capturas de referência da fila da crise com 30 notas.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [ ] 15 delegações escrevendo ao mesmo tempo não quebram a fila nem duplicam notas.
- [ ] O teste de privacidade passa no CI.
- [ ] O delegado vê a posição da própria nota na fila.
