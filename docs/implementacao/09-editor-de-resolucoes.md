# Passo 09 · Editor de resoluções

**Parte de:** piloto
**Depende de:** 07
**Objetivo:** escrever working papers e projetos de resolução em blocos, com redator, cláusulas, rodadas com fim e cláusula acordada travada.

## Banco

Migração `supabase/migrations/20261126090000_editor.sql`.

- [x] `bloco` e `bloco_membro` (com `redator`). Quem cria o bloco é o redator, e o redator pode passar ou dividir a redação.
- [x] `documento` (working paper, projeto ou resolução de crise), com subtópico da agenda adotada, atualização de crise (para a resolução de crise), situação, forma de aprovação, cláusula em foco e `max_rodadas`. Ganha número no envio à mesa.
- [x] `clausula` (preambular, operativa, subitem ou texto livre do working paper), com `versao`, `status` e `origem_id` (fusão).
- [x] `proposta_alteracao`, `comentario` (com `estacionado`), `pedido_reabertura`, `rodada` e `assinatura`.
- [x] Fica para depois: `termometro` (manter, alterar ou remover por cláusula) e `nota_bloco` (anotações soltas). Os comentários estacionados e o texto livre do working paper cobrem o uso do piloto.

## Regras no banco

- [x] Toda escrita passa por funções que checam quem pode, como nos passos anteriores.
- [x] Só o redator altera o texto de uma cláusula. Os outros membros do bloco propõem alterações e comentam.
- [x] Concorrência: `editar_clausula(id, texto, versao)` só grava se a versão for a que o redator viu. Se outra pessoa mudou antes, devolve o erro `40001`, e a tela recarrega a versão nova.
- [x] Cláusula `acordada` fica travada: não muda, não recebe propostas e não sai do texto, nem pelo redator. Para reabrir, `reabrir_clausula_min_delegacoes` delegações do bloco pedem (3).
- [x] Rodadas: abrir uma rodada exige que a anterior tenha terminado e respeita `max_rodadas`. Depois da última, o documento só pode ser enviado à mesa.
- [x] Documento enviado fica travado. Daí em diante, mudanças só por emenda (passo 16).
- [x] Quem vê: o bloco vê os próprios documentos; a mesa, o que foi enviado; o comitê, o que a mesa aprovou.

## Working papers e projetos (regras do UNOCT)

- [x] **Working paper** é informal: sem signatários e sem formato fixo. Além de cláusulas, aceita blocos de texto livre (notícias, resoluções anteriores, links). Observadoras também escrevem. Ele só pode ser mencionado no comitê depois de aprovado pela mesa: status `aprovado_mesa`, e só então fica visível para o comitê inteiro.
- [x] **Projeto de resolução** só pode ser enviado com no mínimo `assinaturas_projeto_min` signatários (5), e só delegações membros o apresentam. No envio, o redator escolhe a aprovação por consenso ou por votação (`documento.aprovacao`). O que vem depois da aprovação da mesa (leitura, consenso, emendas e votação) é a fase de ação, no passo 16.

## Formatação (TypeScript, funções puras)

- [x] `src/lib/formatacao.ts`: cláusulas numeradas pela ordem; preambulares e operativas terminam com ponto e vírgula, a última operativa com ponto; operativa com subitens termina com dois-pontos, e os subitens têm letras.
- [x] A linha do comitê sai do `nome_oficial`, por exemplo "The United Nations Office of Counter-Terrorism:"; o idioma escolhe "Signatários" ou "Signatories".
- [x] Os signatários saem do `nome_oficial` das delegações que assinaram, em ordem alfabética.
- [x] Verbos sugeridos ao começar uma cláusula, vindos do guia de vocabulário (inglês) e da tradução (português), em `src/lib/verbos.ts`.

## Telas

| Tela | Celular | Notebook |
|---|---|---|
| Blocos `/comite/[sigla]/blocos` | Lista de blocos e membros; criar e entrar | Igual |
| Documento `/documento/[id]` | Lista de cláusulas; um toque abre a conversa da cláusula | Cláusulas à esquerda e conversa da cláusula à direita |
| Comum às duas | Barra de progresso ("7 de 11 acordadas"), cláusula em foco destacada, tempo da rodada (ligado ao cronômetro da sessão), notas do bloco, botão de assinar e envio à mesa | |
| Fusão | Escolher cláusulas de dois ou mais working papers para um projeto | Working papers lado a lado |

O tempo real usa `documento`, `clausula`, `proposta_alteracao`, `comentario`, `assinatura` e `rodada`, filtrados pelo documento (`assinarDocumento` em `src/lib/tempo-real.ts`). A tela de blocos acompanha `bloco_membro` e `documento` do comitê.

- [x] Blocos em `/comite/[sigla]/blocos` (link na sessão e no comitê): criar, entrar e sair; novo documento com tipo, tópico, subtópico da agenda adotada ou atualização de crise; documentos do comitê.
- [x] Documento em `/documento/[id]`: cláusulas à esquerda e a conversa da cláusula à direita no notebook (no celular, abaixo, e o toque rola até ela); barra de progresso; cláusula em foco destacada para todos; rodadas; assinaturas; envio; aprovação ou devolução pela mesa; fusão ("trazer cláusulas de working papers", lado a lado); "ver como documento", no formato do UNOCT.
- [x] Os campos do editor são limpos já no envio: quem digita a próxima cláusula enquanto a anterior é gravada não perde o texto. O teste pegou isso.

## Testes

Arquivos: `supabase/tests/09-editor.test.sql` (30 testes), `src/lib/formatacao.test.ts` (7 testes) e `tests/09-editor.spec.ts` (em série, com nomes de bloco e de documento únicos por execução).

- [x] Vitest: numeração, pontuação, linha do comitê em português e em inglês, e signatários com o nome oficial.
- [x] Vitest: os verbos sugeridos aparecem a partir das primeiras letras.
- [x] pgTAP: quem não é redator não altera o texto, mas propõe alterações e comenta.
- [x] pgTAP: quem não é do bloco não vê o documento enquanto ele é rascunho, nem a mesa.
- [x] pgTAP: cláusula acordada não muda, e reabrir exige o número mínimo de pedidos.
- [x] pgTAP: conflito de versão é detectado.
- [x] pgTAP: não abre rodada além de `max_rodadas`, e documento enviado fica travado.
- [x] pgTAP: working paper só fica visível ao comitê depois de aprovado pela mesa; observadora escreve working paper, mas não projeto.
- [x] pgTAP: projeto com menos de 5 signatários não é enviado.
- [x] pgTAP: na fusão, cada cláusula guarda a origem.
- [x] Ponta a ponta: uma proposta feita no celular e aceita pelo redator aparece para todo o bloco sem recarregar.
- [x] Ponta a ponta: a barra de progresso e a cláusula em foco atualizam para todos.
- [x] Ponta a ponta: o fluxo completo (bloco, working paper com verbo sugerido, proposta, acordada, envio e aprovação pela mesa, projeto por fusão com 5 signatários) funciona no celular e no notebook.
- [x] Acessibilidade: axe sem erros nos blocos e nos documentos, nos dois temas; reflow com 320 px.
- [x] Aparência: capturas de referência do documento aberto no celular e no notebook.

## Pronto quando

- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [x] Um bloco de teste escreve um working paper, junta as cláusulas num projeto e envia à mesa.
- [x] Tudo funciona no celular e no notebook.
