# Passo 24 · Bloqueio de bilhetes entre delegações

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 7)
**Depende de:** 20
**Esforço:** P
**Objetivo:** uma delegação pode deixar de receber bilhetes de outra (Israel e Irã, por exemplo), e a bloqueada fica sabendo.

## Hoje

- A mesa liga a leitura e o bloqueio de todos os bilhetes do comitê (`definir_bilhetes`, regras `mesa_le_bilhetes` e `bilhetes_bloqueados`, tela `/comite/[sigla]/mensagens`).
- `enviar_mensagem` (`20261204100000_comunicacao.sql:173`) só confere o bloqueio do comitê inteiro. Uma delegação não consegue bloquear outra.

## Decisões

- **A delegação bloqueada fica sabendo** (você, 20/11). Ela vê o bloqueio na tela de Mensagens e, se tentar enviar, recebe "A delegação de Israel não aceita bilhetes da sua delegação."
- O bloqueio vale só para bilhetes. A conversa com a mesa e os outros canais não mudam.
- A mesa vê a lista de bloqueios do comitê, mas não desfaz.
- Os bilhetes antigos continuam visíveis.

## Banco

Migração `supabase/migrations/20261210090000_bloqueio_de_bilhetes.sql`:

- [ ] Tabela `bloqueio_bilhete`:
  - colunas: `comite_id`, `delegacao_id` (quem bloqueia), `bloqueada_id`, `criado_em`;
  - chave `(delegacao_id, bloqueada_id)`; chaves compostas `(delegacao_id, comite_id)` e `(bloqueada_id, comite_id)` para `delegacao`; `check (delegacao_id <> bloqueada_id)`.
- [ ] RLS de leitura: as duas delegações envolvidas e a mesa do comitê, com os conjuntos de `20261207100000_mensagens_rapidas.sql` (`delegacao_id in (select minhas_delegacoes()) or bloqueada_id in (select minhas_delegacoes()) or comite_id in (select meus_comites('{mesa}'))`). Sem escrita direta.
- [ ] `bloquear_bilhetes(p_comite uuid, p_delegacao uuid, p_bloquear boolean)`: usa `minha_delegacao`; insere ou apaga; recusa a própria delegação.
- [ ] `create or replace function public.enviar_mensagem`, a partir da versão de `20261204100000_comunicacao.sql:173`: no tipo `bilhete`, se existir bloqueio do destinatário contra o remetente, `raise exception 'A delegação de % não aceita bilhetes da sua delegação.', <nome do destinatário>`.
- [ ] Gatilho de Broadcast: `transmitir('delegacao', 'delegacao_id', 'delegacao', 'bloqueada_id', 'mesa', 'comite_id')`.
- [ ] Gatilho `bloquear_tecnologia_restrita` na tabela nova, como nas outras tabelas de delegado.
- [ ] `create or replace function public.apagar_dados_pessoais` (`20261205090000_lgpd.sql`): apagar também `bloqueio_bilhete` dos comitês do evento, junto das mensagens.
- [ ] Regenerar os tipos.

## Telas

Em `src/routes/comite/[sigla]/mensagens/+page.svelte`:

- [ ] Na escolha do destinatário do bilhete, quem bloqueou a sua delegação aparece desabilitado, com "não aceita seus bilhetes".
- [ ] Seção "Bloqueios":
  - "Sua delegação não recebe bilhetes de": lista com "Desbloquear", mais um `<select>` e "Bloquear".
  - "Não aceitam bilhetes da sua delegação": lista só de leitura.
- [ ] A mesa vê "Bloqueios no comitê" (quem bloqueou quem), só leitura.
- [ ] A conversa com uma delegação que bloqueou a sua mostra um aviso fixo no lugar do campo de envio.

## Textos e idiomas

- [ ] A mensagem de erro tem parte variável: entra em `EN_PADROES` (`src/lib/i18n-en.ts`) com a regex e a tradução "The delegation of … does not accept notes from your delegation."
- [ ] O teste de i18n confere todo `raise exception`. Rodar `npm run textos`.

## Testes

Arquivos: `supabase/tests/24-bloqueio-de-bilhetes.test.sql` e `tests/24-bloqueio-de-bilhetes.spec.ts`.

- [ ] pgTAP: só a própria delegação bloqueia e desbloqueia; o envio bloqueado é recusado com a mensagem; outro remetente continua enviando; a bloqueada lê o bloqueio; uma terceira delegação não lê; a mesa lê; não dá para bloquear a si mesma.
- [ ] Ponta a ponta, com dois navegadores e duas delegações do CSNU-T: A bloqueia B; B vê o aviso e o destinatário desabilitado; A desbloqueia; o bilhete de B chega.

## Pronto quando

- [ ] Uma delegação bloqueia e desbloqueia outra, e as duas sabem do bloqueio.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
