# Passo 53 · DPO como arquivo público

**Parte de:** pedido de 24/11/2026 ("o DPO é um arquivo público preparado de antemão")
**Depende de:** 10 (DPO no app), 44 (cache e arquivos), 47 (prévia)
**Esforço:** M
**Quando:** depois do piloto, antes da demonstração (48), para que ela já mostre o fluxo certo. O piloto usa um cenário fictício e não precisa de DPO.
**Objetivo:** o DPO volta a ser o que é num MUN: um documento que a delegação prepara antes do evento, entrega como arquivo e fica aberto ao comitê.

## Como é hoje (passo 10)

- **Editor no app:** um rascunho de texto por tópico (`dpo.texto` e `referencias`).
- **Aprovação da mesa:** a delegação envia, e a mesa aprova ou pede ajustes, com comentário.
- **Leitura:** quem lê é a mesa e, se a regra `dpos_publicos` estiver ligada, as outras delegações; a impressão sai em `/imprimir/dpo/<id>`.
- **Onde aparece:** a Agora ("DPOs pendentes"), a central de Documentos ("Seu DPO" e "Para avaliar"), a ficha e a página da delegação e a prévia.

## O que construir

- **Envio de arquivo:** a delegação envia um arquivo por tópico: PDF de até 5 MB, num bucket próprio do Storage (o caminho segue o padrão das imagens, passo 40). Enviar de novo troca o arquivo e mantém o histórico da data.
- **Público para o comitê:** o DPO fica aberto às delegações do comitê, à mesa, à press e à crise assim que é enviado. A regra `dpos_publicos` sai.
- **Prazo:** continua sendo um item do cronograma. O app mostra "enviado em" e "depois do prazo", mas não bloqueia.
- **Sem aprovação:** a mesa lê e, se quiser, deixa um comentário. Ela pode retirar um arquivo indevido, que fica registrado.
- **Leitura:** a prévia do passo 47 abre o PDF (no celular, um link para baixar), e a página do comitê ganha a lista "DPOs" com bandeira e tópico.
- **Saem:** o editor de texto do DPO, a tela de impressão e o "Para avaliar" de DPOs. Os rascunhos de texto que existirem viram um PDF gerado pela impressão atual, uma vez, na migração.

## Decidido por padrão (confirme ou mude)

- **Formato do arquivo:** só PDF, para ler igual em todo aparelho. DOCX abriria diferente em cada um.
- **Aprovação:** sem aprovação da mesa. Se o UFRGSMUN exigir aprovação antes de publicar, ela volta como etapa opcional por comitê.

## Fora desta etapa

Modelo de DPO para baixar, contagem de palavras e verificação de formatação.

## Testes

- [ ] pgTAP: só a própria delegação envia ou troca o arquivo, e quem está no comitê lê. Quem é de outro comitê não lê.
- [ ] Ponta a ponta: enviar um PDF, vê-lo na prévia de outra delegação, trocar o arquivo e ver a data nova.
- [ ] Ponta a ponta: um arquivo que não é PDF, ou maior que 5 MB, é recusado com mensagem clara.
- [ ] A migração converte um rascunho de texto em PDF e não perde nenhum DPO.
