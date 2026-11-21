# Passo 23 · Lista de quem votou a favor e contra

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 6)
**Depende de:** 21
**Esforço:** P
**Objetivo:** todos no comitê veem como cada delegação votou, na hora do resultado e depois, num histórico.

## Hoje

- Todo o comitê já pode ler os votos: a política "quem está no comitê vê os votos (as placas são públicas)" está em `20261124090000_plenaria_e_votacao.sql:210`.
- A grade com o voto de cada delegação (`src/lib/ui/GradeVotos.svelte`) só aparece no painel da presidência e no telão, e só com a votação aberta.
- O delegado vê o resultado em texto (`textoResultado`) e só da última votação: `carregarSessao` traz uma votação (`limit 1`).

## Decisões

- Votos não são secretos (as regras não preveem voto secreto).
- "Não votaram" = delegações que podiam votar naquela votação (presentes na sessão; na substantiva, só membros) e não votaram.

## Banco

Nada novo: as leituras já são permitidas. Se a consulta do histórico ficar lenta com os 28 países do UNOCT, criar um índice `voto (comite_id, delegacao_id)`.

## Código e telas

- [ ] `src/lib/votacao.ts`: `agruparVotos(delegacoes, votos)` devolve `{ a_favor, contra, abstencao, sem_voto }`, cada um com as delegações em ordem alfabética do idioma.
- [ ] `src/lib/ui/ListaVotos.svelte`: os quatro grupos com título e contagem ("A favor (9)"), bandeira, ícone e texto (nunca só cor). Nome do país como texto agora; vira link no passo 26.
- [ ] **Sessão** (delegado): no cartão "Última votação", a `ListaVotos` abaixo do resultado.
- [ ] **Sessão**: seção "Votações desta sessão", com uma entrada recolhível (`<details>`) por votação encerrada, cada uma com o resultado e a `ListaVotos`.
- [ ] **Telão:** depois de encerrada, a lista fica na tela por 30 s (`encerrada_em` + 30 s, com a diferença de relógio que o telão já mede); depois volta à fila.
- [ ] **Página nova** `/comite/[sigla]/votacoes`: todas as votações encerradas do comitê, agrupadas por sessão, mais recentes primeiro. Link na tela do comitê. Uma consulta:

  ```ts
  supabase.from('votacao')
    .select('id, objeto, tipo, regra, aprovada, a_favor, contra, abstencoes, necessario, encerrada_em, sessao(numero, presenca(delegacao_id)), votos:voto(delegacao_id, escolha)')
    .eq('comite_id', comite.id).not('encerrada_em', 'is', null)
    .order('encerrada_em', { ascending: false })
  ```

## Textos e idiomas

Rótulos dos grupos e da página com tradução.

## Testes

Arquivos: `src/lib/votacao.test.ts` (ampliado) e `tests/23-votos.spec.ts`.

- [ ] Vitest: `agruparVotos` separa os quatro grupos e põe em "Não votaram" só quem podia votar.
- [ ] Ponta a ponta: depois de encerrada a votação, o delegado vê o próprio país em "A favor"; a página `/votacoes` lista essa votação com o mesmo agrupamento; axe na página nova.
- [ ] Captura do cartão de resultado.

## Pronto quando

- [ ] Qualquer pessoa do comitê sabe como cada delegação votou em qualquer votação.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
