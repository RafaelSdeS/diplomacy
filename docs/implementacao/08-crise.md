# Passo 08 · Crise

**Parte de:** piloto
**Depende de:** 06
**Objetivo:** uma fila de crise que continua clara quando todo mundo escreve ao mesmo tempo, com notas que só a própria delegação e a equipe de crise veem.

## Banco

Migração `supabase/migrations/20261125090000_crise.sql`.

- [x] `nota_crise`: o `id` vem do aparelho, então reenviar a mesma nota não duplica. Guarda tipo (nota ou diretiva), título, texto, situação, responsável, resposta e quando foi respondida. `criado_em` usa `clock_timestamp()`, para a ordem da fila ficar certa.
- [x] `atualizacao_crise` e `atualizacao_comite`: uma atualização pode valer para vários comitês do mesmo evento (crise conjunta). As chaves compostas impedem misturar comitês de eventos diferentes.
- [x] As visões `ficha_delegacao` e `linha_do_tempo` não foram criadas. O filtro por delegação na fila e a lista de atualizações de cada tela cobrem o mesmo uso, com menos peças.

## Regras no banco

- [x] `enviar_nota(id, comite, tipo, título, texto)`: só delegados, só em comitê com crise. Trava a linha da delegação (`for update`), confere `limite_notas_pendentes` das regras (pendentes e em análise) e ignora um id já recebido.
- [x] `assumir_nota(id)`: `update ... where responsavel_id is null and status = 'pendente'`. Se duas pessoas tentam ao mesmo tempo, só uma consegue; a outra recebe "Outra pessoa da crise já assumiu esta nota".
- [x] `responder_notas(ids, status, resposta)`: responde uma ou várias notas parecidas de uma vez (aprovar, rejeitar ou pedir ajuste). Só a equipe de crise de cada comitê envolvido.
- [x] `posicao_na_fila(id)`: quantas notas pendentes do comitê são mais antigas, mais um. A delegação vê a posição da própria nota sem ver as outras.
- [x] `publicar_atualizacao(comites, texto)`: quem publica é da crise de todos os comitês escolhidos.

## Regras de acesso

- [x] O delegado vê só as notas da própria delegação. A equipe de crise do comitê (e a secretaria) vê todas. A mesa e a press não veem notas de crise.
- [x] Uma atualização aparece para quem participa de pelo menos um dos comitês ligados a ela.
- [x] `nota_crise` e `atualizacao_comite` estão no tempo real. A RLS decide quem recebe cada nota.

## Telas

| Tela | O que tem |
|---|---|
| Delegado `/comite/[sigla]/crise` | Atualizações de crise; escrever nota ou diretiva (o id nasce com o rascunho, e reenviar depois de uma falha de rede não duplica); notas da delegação com situação, posição na fila e a resposta com cara de telegrama |
| Equipe `/crise/[sigla]` | Contador de pendentes e espera da mais antiga, em alerta a partir de 10 minutos; fila (primeiro as que esperam, da mais antiga) com filtro por delegação e "só as que esperam"; seleção de várias notas; nota aberta ao lado no notebook (no celular, abaixo, e o toque rola até ela); assumir; respostas prontas; aprovar, pedir ajuste ou rejeitar; publicar atualização para um ou vários comitês |
| Telão | A atualização mais recente aparece como plantão em destaque por 5 minutos |
| Agora | Cartão "Respostas da crise" com as últimas respostas às notas da delegação |

- [x] "Crise" no menu para a equipe de crise. Os delegados chegam pela tela da sessão ("Notas de crise") e pelo cartão da Agora.
- [x] **Resolução de crise:** feita no passo 09. Um bloco cria, na tela de blocos, um documento do tipo resolução de crise ligado a uma atualização e o escreve no editor.
- [x] Com tecnologia restrita (OEA), os delegados não escrevem notas pelo app (feito no passo 16).

## Testes

Arquivos: `supabase/tests/08-crise.test.sql` (21 testes), `src/lib/crise.test.ts` (3 testes) e `tests/08-crise.spec.ts` (em série, num projeto; começa respondendo o que sobrou de outra execução).

- [x] pgTAP: **a delegação A não lê a nota da delegação B.** Este é o teste de privacidade principal.
- [x] pgTAP: a mesa e a press não leem notas de crise.
- [x] pgTAP: o limite de notas pendentes é respeitado; com os envios simultâneos, no teste de ponta a ponta (três de uma vez, só dois passam).
- [x] pgTAP: com duas pessoas assumindo a mesma nota, só uma consegue.
- [x] pgTAP: enviar a mesma nota duas vezes cria uma só.
- [x] pgTAP: só a equipe de crise do comitê responde notas e publica atualizações; várias notas respondidas de uma vez.
- [x] pgTAP: uma atualização ligada a dois comitês aparece para eles e não para um terceiro.
- [x] pgTAP: `posicao_na_fila` dá a posição certa, e a delegação não vê a posição da nota de outra.
- [x] Ponta a ponta: 30 notas de 15 delegações chegam em poucos segundos pela API, com três envios simultâneos por delegação (só dois passam); o contador, a nota mais antiga e a ordem da fila ficam certos.
- [x] Ponta a ponta: a resposta chega ao celular do delegado sem recarregar.
- [x] Ponta a ponta: várias notas parecidas respondidas de uma vez; a atualização chega ao delegado e vira plantão no telão.
- [x] Vitest: ordem da fila, contador com alerta e tempo de espera por extenso.
- [x] Acessibilidade: axe sem erros nas duas telas, nos dois temas, e reflow com 320 px.
- [x] Ponta a ponta: no notebook, a fila e a nota aberta ficam lado a lado; no celular, um toque na lista abre a nota.
- [x] Aparência: capturas de referência da fila da crise com 30 notas.

## Pronto quando

- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [x] 15 delegações escrevendo ao mesmo tempo não quebram a fila nem duplicam notas.
- [x] O teste de privacidade passa.
- [x] O delegado vê a posição da própria nota na fila.
