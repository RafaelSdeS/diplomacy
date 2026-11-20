# Passo 07 · Agenda e votação

**Parte de:** piloto
**Depende de:** 06
**Objetivo:** debater e votar a agenda, e fazer votações por delegação com o resultado calculado pelo banco.

## Banco

```sql
create table proposta_agenda (
  id uuid primary key default gen_random_uuid(),
  comite_id uuid not null references comite,
  delegacao_id uuid not null references delegacao,
  numero int not null,
  aprovada boolean not null default false
);

create table ponto_pauta (                    -- árvore: tópico › subtópico › ponto
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
  comite_id uuid not null references comite,
  sessao_id uuid not null references sessao,
  objeto text not null,                       -- "Tópico B no topo da agenda", "Projeto de resolução 1"...
  tipo text not null check (tipo in ('procedimental', 'substantiva')),
  regra text not null,                        -- maioria_simples, dois_tercos, csnu, unanimidade
  aberta boolean not null default true
);

create table voto (
  votacao_id uuid references votacao,
  delegacao_id uuid references delegacao,
  escolha escolha_voto not null,
  primary key (votacao_id, delegacao_id)      -- um voto por delegação
);
```

## Regras no banco

- `votar(votacao, escolha)`: confere se a delegação está presente, se a votação está aberta e se a situação da delegação permite votar. Observadora só vota em questão procedimental; suspensa não vota. Questão procedimental não aceita abstenção.
- `registrar_voto(votacao, delegacao, escolha)` (só a mesa): para votos contados nas placas.
- `resultado(votacao) returns (a_favor, contra, abstencoes, necessario, aprovada)`: usa a regra da votação e as funções do passo 05. Empate reprova.
- No piloto, `regra` aceita `maioria_simples` e `dois_tercos`. CSNU e unanimidade entram no passo 16.

## Fluxo da agenda

1. Cada delegação monta sua proposta em árvore: tópico, subtópicos e pontos.
2. As propostas aparecem lado a lado para comparação.
3. Moção de tópico no topo da agenda: lista especial com até 2 discursos a favor e 2 contra, consenso marcado pela mesa ou votação por maioria simples. Se a moção for rejeitada, o outro tópico entra.
4. A proposta aprovada vira a pauta do comitê, fixa no telão e na Agora, com o andamento de cada ponto.

## Telas

| Tela | Celular | Notebook |
|---|---|---|
| Agenda `/comite/[sigla]/agenda` | Montar a proposta e ver as outras uma de cada vez | Propostas lado a lado |
| Votar | Três botões grandes com ícone e texto (a favor, contra, abstenção) | Igual |
| Mesa: votações | Abrir, encerrar e registrar votos de placa | Lista de delegações com o voto de cada uma |
| Telão | Não se aplica | Grade de bandeiras com o voto de cada delegação (cor e ícone) e o resultado |

## Testes

- [ ] pgTAP: a mesma delegação não vota duas vezes.
- [ ] pgTAP: abstenção em questão procedimental é recusada; observadora não vota em questão substantiva.
- [ ] pgTAP: `resultado()` com os exemplos de maioria do guia; empate reprova.
- [ ] Ponta a ponta: um voto dado no celular aparece no telão.

## Pronto quando

- [ ] O comitê de teste escolhe o tópico, aprova a pauta e vê o andamento de cada ponto.
- [ ] Os resultados batem com as regras, e o voto nunca é indicado só pela cor.
