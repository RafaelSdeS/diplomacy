# Passo 53 · DPO como arquivo público

**Parte de:** pedido de 24/11/2026 ("o DPO é um arquivo público preparado de antemão")
**Depende de:** 10 (DPO no app), 44 (cache e arquivos), 47 (prévia)
**Esforço:** M
**Situação:** pronto (26/11/2026), antes do piloto, a pedido.
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

## A aba do DPO (pedido de 24/11/2026, à noite)

"A aba para escrever o DPO pode ser melhorada." Enquanto o formato (arquivo ou texto) não for decidido, a aba melhora o que já existe:

- **No topo:** os DPOs do comitê em cartões, com bandeira, delegação, tópico e situação; cada um abre a prévia.
- **"Meu DPO":** um cartão por tópico, com a situação, a data de envio e uma ação clara ("Escrever", "Continuar", "Ver o comentário da mesa").
- **A escrita:** uma tela focada, com o texto em parágrafos, contagem de palavras, referências em lista e prévia do documento impresso ao lado (no notebook).

## Decidido por padrão (confirme ou mude)

- **Formato do arquivo:** só PDF, para ler igual em todo aparelho. DOCX abriria diferente em cada um.
- **Aprovação:** sem aprovação da mesa. Se o UFRGSMUN exigir aprovação antes de publicar, ela volta como etapa opcional por comitê.

## Fora desta etapa

Modelo de DPO para baixar, contagem de palavras e verificação de formatação.

## Feito (26/11/2026)

- **Banco** (`20261229090000_dpo_como_arquivo.sql`): o DPO ganhou `arquivo`, `envios` (a data de cada envio) e `retirado_em`. O bucket `dpos` aceita só PDF de até 5 MB, em `<comitê>/<delegação>/<tópico>.pdf`. Só a própria delegação sobe e troca o arquivo. Lê quem pode ver o DPO, e a mesa lê todos (apagar exige ler).
- **Sem aprovação:** saíram `salvar_dpo`, `avaliar_dpo` e o `enviar_dpo` antigo. O novo `enviar_dpo(comitê, tópico)` registra o arquivo que já subiu. Enviado, o DPO é do comitê, e a regra `dpos_publicos` deixou de valer.
- **A mesa:** `comentar_dpo` grava um comentário numa tabela à parte (`dpo_comentario`), que só a delegação e a mesa leem. `retirar_dpo` pede o motivo, que vira o comentário e fica no `registro`. Depois a tela apaga o arquivo do Storage. Um envio novo apaga o comentário, como no passo 10.
- **A aba DPO:** "Meu DPO" vem primeiro, com um cartão por tópico, a situação, "enviado em", o selo "depois do prazo", os envios anteriores e os botões "Enviar o PDF" ou "Trocar o PDF". Depois vem "DPOs do comitê", em cartões com bandeira e tópico, "Abrir o PDF" e, para a mesa, "Comentar" e "Retirar". O prazo é o fim do item do cronograma com "DPO" no título.
- **A prévia:** abre o PDF numa aba nova. A CSP do app (`object-src 'none'`) não deixa embutir.
- **Saíram:** o editor de texto, a tela `/imprimir/dpo` e o "Para avaliar" de DPOs, tanto na Agora da mesa quanto em Documentos.
- **A demonstração** gera os PDFs a partir dos textos (`scripts/demonstracao/pdf.ts`, sem dependência nova).

**Diferente do plano:**
- Os textos escritos no app antes do passo **não viram PDF**. Continuam legíveis como texto, com "Ler o texto". Até aqui só há dados de teste, e gerar PDF numa migração SQL não é possível.
- A lista de DPOs **não entrou na aba Comitê**. Ela fica na aba DPO e em Documentos, e a aba Comitê segue só com atalhos.
- "Meu DPO" fica **acima** da lista do comitê, porque a ação principal da delegação precisa ficar à vista sem rolar.

## Testes

- [x] pgTAP: só a própria delegação envia ou troca o arquivo, e quem está no comitê lê. Quem é de outro comitê não lê.
- [x] Ponta a ponta: enviar um PDF, outra delegação abri-lo, trocar o arquivo e ver a data anterior; a mesa comenta e retira.
- [x] Ponta a ponta: um arquivo que não é PDF, ou maior que 5 MB, é recusado com mensagem clara.
- [x] A migração não perde nenhum DPO: os textos antigos ficam legíveis, e o comentário da mesa passa para `dpo_comentario`.
