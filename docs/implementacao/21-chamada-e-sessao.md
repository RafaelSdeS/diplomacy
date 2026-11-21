# Passo 21 · Chamada, abertura, encerramento e chegada atrasada

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), itens 3 e 4)
**Depende de:** 20
**Esforço:** P–M
**Objetivo:** transformar o começo e o fim de cada sessão num roteiro guiado, com uma chamada rápida e um jeito simples de aceitar a delegação que chega depois.

## Hoje

Em `src/routes/comite/[sigla]/sessao/chamada/+page.svelte`:

- "Abrir sessão" e "Encerrar sessão" ficam na tela da chamada.
- "Abrir a próxima sessão" encerra a atual sem confirmação; `abrir_sessao` também fecha as votações abertas.
- Cada delegação tem três botões de opção: ausente, presente, presente e votando.
- Não há "Concluir chamada" nem caminho para o painel; o sorteio do rodízio fica na mesma tela.
- Encerrar não mostra resumo.
- A mesa já pode marcar presença a qualquer momento, e o quórum se recalcula. A delegação não tem como avisar que chegou.

## Decisões

- **"Presente" e "presente e votando" são a mesma coisa** (você, 20/11). A chamada passa a ter dois estados, ausente e presente, e cai a regra que proíbe abstenção para quem está "presente e votando".
- Toda ação que encerra algo (sessão, votação) pede confirmação.
- Chegada: a delegação avisa e a mesa confirma com um toque.

## Banco

Migração `supabase/migrations/20261208090000_chamada.sql`:

- [ ] `update public.presenca set situacao = 'presente' where situacao = 'presente_e_votando';` e `check (situacao = 'presente')` em `presenca`. O valor fica no enum: tirar valor de enum no Postgres exige recriar o tipo, e não vale a pena.
- [ ] `create or replace function public.validar_voto`, a partir da versão de `20261203090000_procedimento.sql:175`, sem o bloco que recusa abstenção de quem está presente e votando.
- [ ] Coluna `presenca.marcada_em timestamptz not null default now()`, a hora da chegada.
- [ ] Tabela `aviso_chegada` (`sessao_id`, `comite_id`, `delegacao_id`, `criado_em`; chave `(sessao_id, delegacao_id)`; chaves compostas como em `presenca`):
  - RLS: quem está no comitê lê; não há escrita direta.
  - Gatilho de Broadcast `transmitir('comite', 'comite_id')`.
  - Fica fora do bloqueio de tecnologia restrita: avisar a chegada não é escrever durante a sessão.
- [ ] `avisar_chegada(p_comite)`: usa `exigir_delegacao`; recusa se a delegação já está presente; `on conflict do nothing`.
- [ ] Gatilho `after insert on presenca` que apaga o aviso da mesma delegação.
- [ ] `marcar_todas_presentes(p_comite)`: só a mesa; insere todas as delegações não suspensas da sessão atual; `on conflict do nothing`.
- [ ] `resumo_sessao(p_sessao uuid) returns jsonb` (stable, com as permissões de quem chama): início, fim, presentes, pontos e moções por situação, votações (objeto e resultado). Falas ficam de fora: o app ainda não registra as falas.
- [ ] Regenerar `src/lib/database.types.ts`.

## Telas

**Chamada**, reorganizada em roteiro:

1. **Preparação:** o sorteio do rodízio. A seção fica recolhida depois que a ordem existe.
2. **Abrir sessão:** botão único, só quando não há sessão aberta. Some o "Abrir a próxima sessão".
3. **Chamada:**
   - cada delegação é um botão grande que alterna entre ausente e presente (`aria-pressed`), com a bandeira;
   - botão "Marcar todas como presentes";
   - "Presentes: 12 de 15 · Quórum 5 · Há quórum" fixo no topo da lista.
4. **Concluir chamada:** leva ao painel da presidência (que também conduz a plenária).

A tela continua acessível depois, pelo link "Chamada" no painel, para chegadas e correções.

**Painel da presidência** (só a mesa):

- [ ] Botão "Encerrar sessão", com `<dialog>` de confirmação. Depois de encerrar, o cartão "Sessão 3 encerrada" mostra o resumo (`resumo_sessao`) e o botão "Abrir a sessão 4".
- [ ] Cartão "Chegadas": "Chegou: França", com "Confirmar presença" (o mesmo upsert da chamada).

**Sessão** (delegado):

- [ ] Se a delegação está ausente: cartão "Sua delegação está ausente na chamada", com o botão "Cheguei". Depois do aviso: "Aguardando a mesa confirmar".

**Código:**

- [ ] `src/lib/votacao.ts`: `escolhasPermitidas` deixa de olhar a situação de presença para a abstenção.

## Textos e idiomas

Todos os rótulos novos e as mensagens de erro novas com tradução em `src/lib/i18n-en.ts`. Sai o texto "Presente e votando".

## Testes

Arquivos: `supabase/tests/21-chamada.test.sql`, `src/lib/votacao.test.ts` (ajuste) e `tests/21-chamada.spec.ts`.

- [ ] pgTAP: `presenca` só aceita "presente"; abstenção permitida na substantiva para quem está presente.
- [ ] pgTAP: só a própria delegação ausente avisa a chegada; a confirmação apaga o aviso; `marcar_todas_presentes` é só da mesa; `resumo_sessao` conta as moções e as votações da sessão.
- [ ] Ajustar `supabase/tests/06-sessao.test.sql:170` e `07-plenaria-e-votacao.test.sql:215`, que usam "presente_e_votando".
- [ ] Vitest: `escolhasPermitidas('substantiva', 'membro', 'presente')` inclui a abstenção.
- [ ] Ponta a ponta (notebook, em série, como o 06): abrir; marcar todas; desmarcar uma; concluir; painel; a delegação ausente avisa; a mesa confirma; a delegação vota; encerrar com confirmação; resumo.
- [ ] Ajustar `tests/06-sessao.spec.ts:78` e `:84`, que marcam a presença pelos botões de opção.
- [ ] Capturas de referência da chamada e do painel refeitas no CI.

## Pronto quando

- [ ] Abrir, fazer a chamada, conduzir e encerrar a sessão é um caminho sem volta para trás nem tela escondida.
- [ ] Uma delegação que chega no meio é aceita em dois toques e passa a votar.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
