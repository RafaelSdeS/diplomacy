# Passo 58 · Documentos da mesa para o comitê

**Parte de:** pedido de 24/11/2026 ("o bureau ter alguma maneira de divulgar documentos com o comitê, quase um Google Docs")
**Depende de:** 44 (cache e Storage), 47 (prévia), 53 (bucket de PDF, se vier antes), 56 (lugar na aba Documentos)
**Esforço:** M
**Situação:** pronto em parte (25/11/2026); faltam o telão e o "está editando".
**Quando:** depois do piloto. O piloto manda o guia fictício antes, por fora. Pode subir na fila se a mesa do piloto pedir.
**Objetivo:** a mesa publica textos e arquivos para o comitê, atualiza durante o evento, e todo o comitê vê a versão do momento, sabendo o que mudou.

## Como é hoje

A mesa não tem como publicar nada para o comitê, a não ser:

- o link do guia de estudos (`comite.guia_url`, na aba Comitê);
- os avisos (do evento inteiro, da secretaria).

Todo `documento` pertence a um bloco (`bloco_id not null`), e a mesa não faz parte de bloco. Exemplos do que falta: a lista de itens já debatidos, um esclarecimento de regra, um quadro da crise, o roteiro do dia, as cláusulas aprovadas até agora e o guia revisado.

## O que construir

- **Tabela `documento_mesa`:**
  - `id`, `comite_id`, `titulo`, `corpo` (texto com marcação simples: títulos, listas, negrito, links);
  - `arquivo` opcional (PDF, no bucket do passo 53 ou num `documentos-mesa` próprio, até 10 MB);
  - `publicado`, `fixado`, `versao`, `atualizado_em`, `atualizado_por`.

  **RLS:** a mesa do comitê lê e escreve; quem participa do comitê lê só os publicados. A secretaria lê todos, mas não escreve.
- **Escrever, como um documento simples:** a mesa abre "Novo documento da mesa" e escreve num editor de página inteira, com a prévia ao lado (a mesma do DPO no lote 0b do passo 51). O rascunho fica salvo no aparelho e no banco ("rascunho", não publicado). "Publicar" pede `Confirmar` na primeira vez; depois, "Publicar alterações".
- **Duas pessoas da mesa no mesmo documento**, sem edição simultânea (decidido em 20/11/2026):
  - o editor mostra "Fulano está editando" (presença do canal de tempo real);
  - ao salvar, o banco confere a `versao`. Se outra pessoa salvou antes, a tela mostra a diferença e pergunta se junta ou sobrescreve. Nada se perde em silêncio.
- **O comitê lê ao vivo:**
  - a lista "Da mesa", na aba Documentos (passo 56) e na aba Comitê;
  - os fixados ficam no topo;
  - quem está lendo vê "Atualizado agora" e o texto muda sem recarregar (`lerAoVivo`);
  - cada documento mostra "Atualizado às 14:32" e, para quem já tinha lido, um selo "Novo" ou "Alterado" (o lido fica guardado no aparelho, sem migração).
- **O que mudou:** a tabela `documento_mesa_versao` guarda o texto de cada publicação. "Ver alterações" mostra o que entrou e o que saiu desde a versão anterior, com a mesma diferença por palavra que o passo 49 vai usar. Guardar só as publicações, não cada salvamento.
- **Aviso de publicação:** publicar ou alterar um documento fixado avisa o comitê (o sino; o push, se a pessoa permitiu). Alterações pequenas podem sair sem aviso, com a caixa "Avisar o comitê" desmarcada.
- **Telão:** "Mostrar no telão" projeta o documento (fonte grande, rolagem pela mesa) e substitui o painel da sessão até "Voltar à sessão".
- **Sem rede:** o último texto publicado fica no cache do comitê (passo 40). A edição precisa de rede, e a tela diz isso.

## Decisões

1. **Texto escrito no app e arquivo: os dois** (decidido em 24/11/2026). O texto, para o que muda durante o evento; o PDF anexo, para o que já vem pronto (guia, regras).
2. **Em aberto: delegações comentam os documentos da mesa?** **Proposta: não, nesta etapa.** As dúvidas vão pela conversa com a mesa (Mensagens), que já existe.

## Fora desta etapa

Edição simultânea, comentários das delegações, pastas e documentos para um bloco só.

## Testes

- [x] pgTAP: a mesa cria, edita e publica; a delegação lê só os publicados do próprio comitê; ninguém de outro comitê lê; salvar com a `versao` antiga é recusado.
- [x] Unidade: a diferença por palavra entre duas versões; a marcação simples vira HTML seguro (sem script nem atributos).
- [x] Ponta a ponta com dois navegadores: a mesa publica e a delegação vê sem recarregar; a mesa altera e a delegação vê "Alterado" e as alterações.
- [x] Ponta a ponta: duas pessoas da mesa salvam o mesmo documento; a segunda vê a diferença e escolhe.
- [ ] Offline: o documento publicado abre sem rede depois de visto uma vez.
- [ ] axe no editor, na leitura e no telão.

## Como ficou

- Banco (`20261228090000_documentos_da_mesa.sql`): `documento_mesa` guarda a última publicação (o comitê só vê com `versao > 0`); `documento_mesa_rascunho`, o texto em edição, que só a mesa e a secretaria leem; `documento_mesa_versao`, cada publicação. `salvar_documento_mesa` confere a versão (código `DM409` se outra pessoa salvou antes; não `40001`, que o PostgREST repete); `publicar_documento_mesa` copia o rascunho e, com "Avisar o comitê", cria um aviso do comitê (o sino); `ajustar_documento_mesa` fixa e anexa o PDF (bucket `documentos-mesa`, `<comitê>/<documento>.pdf`, até 10 MB).
- Telas: na aba Documentos, a linha "Da mesa" (o mais recente, fixados primeiro, "Novo" ou "Alterado" pela publicação lida no aparelho) abre a lista, onde a mesa cria. `/comite/<sigla>/documentos/mesa/<id>`: o comitê lê ao vivo, com "Atualizado agora" e "Ver alterações" (diferença por palavra, `src/lib/diferenca.ts`); a mesa escreve com a prévia ao lado (marcação simples em `src/lib/marcacao.ts`: títulos, listas, negrito e links, tudo escapado), salva, publica (a primeira vez com confirmação), fixa, anexa o PDF ou exclui. No conflito, vê a diferença e escolhe "Manter o meu texto" ou "Ficar com o texto salvo".
- **Ainda não:** "Mostrar no telão", o "Fulano está editando" (a conferência da versão já impede perder texto) e a lista na aba Comitê (fica na aba Documentos).
