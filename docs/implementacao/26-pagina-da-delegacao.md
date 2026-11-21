# Passo 26 · Página da delegação

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 10)
**Depende de:** 23 e 24
**Esforço:** M
**Objetivo:** clicar num país em qualquer tela abre a página da delegação, com os delegados, os documentos públicos dela e as ações possíveis. É o ponto onde os passos seguintes se penduram (anotações, números clicáveis).

## Como ficou

- Página `/comite/[sigla]/delegacao/[id]`: bandeira, nome oficial em versalete, situação, delegados (foto ou iniciais, minibiografia), DPOs e cartas abertos, matérias da press, votos recentes e, para outra delegação, "Mandar bilhete" e bloquear bilhetes.
- Os países viram links pelo `ui/NomeDelegacao.svelte`; o perfil ganhou "Página da delegação".
- Nada no banco: as permissões existentes já cobriam tudo.

## Antes

- Na tela do comitê (`src/routes/comite/[sigla]/+page.svelte`), as delegações são uma lista sem link.
- O DPO de outra delegação só aparece no fim da tela de DPO, com o link "Imprimir", e só se o comitê abriu os DPOs aprovados (`pode_ver_dpo`).
- O banco aceita mais de um delegado por delegação (no seed, os EUA têm dois), mas nenhuma tela mostra quem são.
- O perfil (`/perfil`) tem foto, nome, minibiografia e idioma, sem os dados da delegação.
- As permissões já cobrem o que a página precisa:
  - participantes leem as participações do próprio comitê (passo 04);
  - `pode_ver_pessoa` libera nome e minibiografia;
  - a política "fotos: quem pode ver a pessoa vê a foto" (`20261121090000_informacoes.sql:131`) libera a foto;
  - `pode_ver_dpo` e `pode_ver_carta` controlam os documentos.

## Decisões

- Sem e-mail na página. Foto e minibiografia só para quem é do mesmo comitê (já é a regra).
- O telão não tem links (é projetado). Nas outras telas, todo nome de país vira link.

## Banco

Nada novo. Se a página precisar de muitas consultas, juntar numa função `delegacao_resumo(p_delegacao)` só se a medição de dados do passo 15 mostrar ganho.

## Telas

**Página nova** `src/routes/comite/[sigla]/delegacao/[id]/+page.ts` e `+page.svelte`. O load faz as consultas em paralelo:

- `delegacao`: nome, nome oficial, bandeira, situação.
- Delegados: `participacao` com `papel = 'delegado'` e `delegacao_id`, com `pessoa(id, nome, bio, foto_path)`; as fotos com `createSignedUrl` do bucket `fotos` (como em `/perfil`).
- DPOs: `dpo` da delegação (a RLS decide o que aparece), com link para `/imprimir/dpo/[id]`.
- Cartas públicas: `carta` com `remetente_delegacao_id = id` e `publica`.
- Na press: `citacao` da delegação com notícia publicada (como no Agora), com link para a notícia.
- Votos recentes: `voto` da delegação com `votacao(objeto, aprovada, encerrada_em)`, os 10 últimos.

Conteúdo, nesta ordem:

1. Cabeçalho: bandeira grande, nome, nome oficial em versalete, situação (membro, observadora, suspensa).
2. Delegados: cartão por pessoa (foto ou iniciais, nome, minibiografia).
3. Documentos: DPOs e cartas públicas.
4. Na press: as matérias que citam a delegação.
5. Votos recentes, com ícone e texto (componente do passo 23).
6. Ações, para outra delegação do comitê: "Mandar bilhete" (link para `/comite/[sigla]/mensagens?para=<id>`, que pré-seleciona o destinatário) e "Bloquear bilhetes" (passo 24). O passo 34 acrescenta "Suas anotações".

**Links em todo o app:**

- [x] `src/lib/ui/NomeDelegacao.svelte` (props `sigla`, `delegacao`, `link = true`): bandeira mais nome, como link. Entrou na tela do comitê, na fila de placas e nas listas de oradores (sessão e painel), na agenda e na lista de votos. Ficaram de fora a chamada (cada delegação já é um botão), o orador em destaque e o telão (projetado, sem link); cartas, DPOs e mensagens ganham links no passo 33.
- [x] A tela de Mensagens lê `?para=` e pré-seleciona o destinatário.

**Perfil:**

- [x] Bloco "Sua delegação", com bandeira, nome, comitê e link para a página da delegação.

## Testes

Arquivos: `supabase/tests/26-delegacao.test.sql` e `tests/26-delegacao.spec.ts`.

- [x] pgTAP (garantia, mesmo sem tabela nova): pessoa de outro comitê não lê a participação, a pessoa nem a foto dos delegados desta delegação; o delegado do mesmo comitê lê.
- [x] Ponta a ponta: na tela do comitê, clicar em "EUA" abre a página com os dois delegados; "Mandar bilhete" abre Mensagens com os EUA escolhidos; a própria delegação chega pela página do perfil e não vê as ações de bilhete; axe no celular e no notebook. A visibilidade dos DPOs já é coberta pelo pgTAP do passo 10 (`pode_ver_dpo`).

## Pronto quando

- [x] De qualquer tela, um toque no país leva aos delegados e aos documentos públicos daquela delegação.
- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
