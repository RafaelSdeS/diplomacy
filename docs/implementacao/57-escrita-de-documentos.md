# Passo 57 · Escrever documentos sem atrito

**Parte de:** pedido de 24/11/2026 ("a escrita de documentos mais fácil e intuitiva, como nos projetos de resolução, que não está bom agora"; "as assinaturas em algum lugar bem visível"; "melhore os comentários das cláusulas: bem dinâmico, para não atrapalhar o debate e o fluxo")
**Depende de:** 09 (editor), 47 (modais), 55 (signatários com bandeira), 56 (projeto a partir de working papers)
**Esforço:** G (em duas partes)
**Quando:** a parte A antes do piloto, porque o roteiro tem 20 minutos de working paper e projeto. A parte B entra junto com o passo 49, se o piloto pedir.
**Objetivo:** o documento se lê como o documento final e se escreve no lugar. As assinaturas ficam no topo. Opinar numa cláusula custa um toque.

## Como é hoje (`/documento/<id>`, cerca de 24 KB)

- **Duas seções lado a lado:** "Cláusulas" (uma lista de botões, com rótulo, texto e selos) e "Conversa da cláusula" (vazia até escolher uma). Escolhida a cláusula, a conversa empilha:
  - a caixa de texto do redator e os botões de estado;
  - as propostas de alteração;
  - os comentários;
  - os estacionados;
  - o formulário de comentário.
- **Escrever uma cláusula:** um formulário fixo no fim da lista, com o tipo num `select`, o texto, os verbos sugeridos e "Acrescentar cláusula". A cláusula entra sempre no fim; não há como inserir no meio, nem mudar a ordem pela tela.
- **Assinaturas:** numa seção "Rodadas, assinaturas e envio" depois do editor, como texto ("Signatários (3 de no mínimo 5): Brasil, França…"), com o botão "Assinar" ao lado de "Abrir a rodada" e "Enviar à mesa".
- **Comentários:**
  - só texto, sem autor à vista (o banco guarda `delegacao_id` e `autor_id`, mas a tela mostra só o texto);
  - sem contagem na lista de cláusulas;
  - o redator só tem "Estacionar";
  - a mesa não comenta;
  - não há como dizer "concordo" sem escrever.

## Parte A · O documento no lugar (antes do piloto)

### Ler como o documento final

- **A coluna principal é o documento formatado:**
  - o cabeçalho (comitê, tópico, título, "Baseado em");
  - as preambulares em itálico, com o verbo destacado;
  - as operativas numeradas, com o verbo sublinhado e os subitens em a), b);
  - a mesma formatação da impressão (`impressao.ts`).
- **Cada cláusula é um bloco.** Ao lado de cada uma aparecem:
  - o estado (proposta, em discussão, acordada);
  - "Em foco";
  - a contagem de comentários e de posições (abaixo).

### Escrever no lugar

- **O redator clica numa cláusula e edita ali mesmo,** no texto, com "Salvar" e "Cancelar". Os botões "Pôr em discussão" e "Marcar como acordada" ficam no mesmo bloco.
- **Inserir onde se quer:** entre duas cláusulas, ao passar o mouse (ou num botão "+" sempre visível no celular), aparecem "+ Preambular", "+ Operativa" e "+ Subitem". A nova cláusula abre já em edição, naquele ponto.
- **Atalhos de teclado:**
  - Enter salva e abre a próxima cláusula do mesmo tipo;
  - Esc cancela;
  - Alt + ↑ e Alt + ↓ mudam a ordem.

  A ordem já existe no banco (`clausula.ordem`); falta a RPC de mover, que precisa respeitar preambulares antes de operativas e subitens dentro da operativa.
- **Verbos:** ao começar uma cláusula, as sugestões de verbo (`verbos.ts`) aparecem como chips, e a primeira palavra já sai formatada. Hoje os verbos ficam num grupo de botões abaixo da caixa de texto.
- **Para quem não é redator:** o mesmo documento, sem edição. "Propor alteração" fica no bloco da cláusula (abaixo).

### Assinaturas à vista

- **Uma faixa logo abaixo do título**, fixa ao rolar:
  - as bandeiras dos signatários, clicáveis (passo 55);
  - "3 de 5 assinaturas", com uma barra;
  - o botão principal **"Assinar"** (ou "Retirar assinatura").

  No projeto, "Faltam 2 assinaturas para enviar à mesa".
- **"Enviar à mesa"** fica na mesma faixa, para o redator. Ele aparece só quando o mínimo foi atingido; antes, aparece desabilitado com o motivo. A escolha entre consenso e votação vai para o modal de envio, com `Confirmar`.
- As rodadas ("Rodada 2 de 3 · até 15:40") também ficam na faixa, num selo. "Abrir rodada" vai para "Mais opções" do redator.
- A mesma contagem de assinaturas aparece na linha do documento em Documentos e em Blocos.

### Comentários que não atrapalham

- **Posição num toque:** cada membro do bloco (e a mesa) marca em cada cláusula **Apoio**, **Ressalva** ou **Contra**, com uma posição por delegação, que pode mudar. A cláusula mostra as contagens com bandeiras ao passar o mouse. Assim o redator vê na hora onde está a discordância, sem ninguém precisar escrever durante o debate.
- **Comentário curto, com autor:** a bandeira e o nome da delegação (ou "Mesa"), e a hora. O campo é de uma linha (até 280 caracteres) e abre a partir da posição: quem marca "Ressalva" ou "Contra" é convidado a dizer o porquê, e pode pular.
- **Na própria cláusula:** a contagem (ícone de balão e "3") abre os comentários logo abaixo da cláusula, sem a coluna vazia "Conversa da cláusula". No notebook, a cláusula escolhida pode abrir um painel ao lado, com os comentários e as propostas. No celular, uma folha de baixo.
- **O redator fecha o assunto:** "Resolvido" recolhe o comentário, com contagem ("2 resolvidos"), e "Estacionar" continua para voltar depois. As propostas de alteração aceitas resolvem os comentários daquela cláusula.
- **Ao vivo e sem barulho:** os comentários chegam pelo tempo real que a página já usa (`AoVivo`). Cláusulas com novidade ganham um ponto ("novo"), guardado no aparelho, sem migração para "lido". O redator recebe um único aviso por rodada ("5 comentários novos em 3 cláusulas"), não um por comentário.
- **A mesa comenta**, marcada como "Mesa", para correções de forma antes do envio.

**Migração:**

- tabela `posicao_clausula` (clausula, delegação, `apoio | ressalva | contra`, chave única por cláusula e delegação, RLS como a de `comentario`);
- `comentario.resolvido`;
- `comentario.texto` passa a ter até 280 caracteres. Os antigos ficam como estão: o limite novo vale só para novos, com o `check` na RPC.

## Parte B · Junto com o passo 49 (se o piloto pedir)

A proposta estruturada (alterar, adicionar, remover, mover), a comparação do que mudou, o fim da rodada que congela propostas e o histórico. Está descrita no [passo 49](49-edicao-por-clausula.md). Com a parte A pronta, o 49 fica menor: a posição num toque já cobre o "manter" e o "perguntar".

## Fora desta etapa

Edição livre simultânea (decidido em 20/11/2026: não fazer), menção de delegação com `@` e reações além das três posições.

## Testes

- [ ] pgTAP: só membros do bloco e a mesa marcam posição; uma posição por delegação e cláusula; só o redator resolve; a mudança de ordem não põe operativa antes de preambular.
- [ ] Unidade: a formatação do documento na tela é igual à da impressão; a regra de ordem de `mover_clausula`.
- [ ] Ponta a ponta com dois navegadores: o redator insere uma operativa no meio e edita no lugar; o outro membro vê sem recarregar, marca "Ressalva" e comenta; o redator resolve.
- [ ] Ponta a ponta: a faixa de assinaturas mostra "Faltam N"; assinar atualiza a contagem para todos; "Enviar à mesa" só fica disponível com o mínimo.
- [ ] Ponta a ponta, a 1366 × 768: as assinaturas e o "Assinar" ficam à vista sem rolar; no celular, também, na primeira tela.
- [ ] Teclado: Enter, Esc e Alt + setas no editor; axe no documento e no painel de comentários.
