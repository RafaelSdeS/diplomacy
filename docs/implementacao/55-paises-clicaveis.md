# Passo 55 · Todo país abre a sua ficha

**Parte de:** pedido de 24/11/2026 ("em todo lugar em que aparecem países quero poder clicar e abrir um modal com suas informações, incluindo minhas anotações sobre eles")
**Depende de:** 47 (fichas), 51 lote 0b (caderno de qualquer lugar), 54 (fichas no centro)
**Esforço:** P–M (parte A); M (parte B)
**Quando:** logo depois do 54, antes do piloto. É pequeno e muda a sensação de todas as telas.
**Objetivo:** a bandeira e o nome de uma delegação sempre abrem a mesma ficha, onde quer que apareçam, e a ficha **sempre** mostra o que eu anotei sobre ela: as notas da minha delegação, para o delegado, e as da mesa, para a mesa (exigência do pedido de 24/11/2026).

## Como é hoje

- `NomeDelegacao.svelte` já abre a ficha com `ficha`, mas só cinco lugares usam isso (sessão, painel). Outros lugares levam à página da delegação (agenda, caderno) ou mostram a bandeira sem ação:
  - membros dos blocos (`blocos/+page.svelte`, linha ~136);
  - conversas das mensagens (~238 e ~426);
  - DPOs em Documentos (~58 e ~136) e na aba DPO (~188);
  - notas na fila da crise (`crise/[sigla]`, ~210 e ~234);
  - lista de delegações da aba Comitê;
  - signatários do documento, que são só nomes separados por vírgula;
  - votos (`ListaVotos`), chamada e coletiva.
- A ficha (`FichaDelegacao.svelte`) mostra delegados, DPOs e votos recentes, mais Mandar bilhete, Escrever carta e Anotar. **Não mostra as anotações** sobre a delegação.

## Parte A · Clicar em qualquer país (sem migração)

- **Um só jeito de mostrar uma delegação:** `NomeDelegacao` passa a abrir a ficha por padrão (`ficha` vira o padrão; `link={false}` só no telão e na impressão). Todo `<span class="com-bandeira"><Bandeira …/> {nome}</span>` das telas acima troca para `<NomeDelegacao …/>`. Uma busca no CI (`npm run textos`, ou um teste de unidade sobre os arquivos) recusa `com-bandeira` com `<Bandeira` fora de `NomeDelegacao`, do telão e da impressão.
- **Na conversa e no cartão do bloco**, a bandeira e o nome são o botão, e o resto da linha continua abrindo a conversa ou o bloco. Dois alvos claros, sem clique duplo.
- **Ficha com o caderno (obrigatório):** uma seção "Minhas anotações" com as notas da minha delegação sobre esta (`anotacao` com `tipo = 'sobre'` e `sobre_delegacao_id`), as mais novas primeiro, três à vista e "Ver todas" (abre o caderno filtrado, que já existe). Logo abaixo, "Compartilhadas comigo": as notas que outras delegações compartilharam comigo sobre esta. O botão "Anotar" fica no topo da seção, não no fim do modal.
- **Ficha com o essencial do comitê:**
  - os blocos de que a delegação faz parte;
  - os documentos que ela assinou;
  - a situação na chamada de hoje (presente ou ausente).

  Tudo numa linha cada, com contagem, para o modal não rolar.
- **Signatários com bandeira:** no documento, a lista vira bandeiras clicáveis (o passo 57 trata do lugar).

## Parte B · Anotações da mesa (aprovada em 24/11/2026)

Hoje a mesa não tem caderno: `anotacao.delegacao_id` é obrigatório, e "a mesa nunca lê o caderno" (passo 34). Quem está na conta da mesa abre a ficha e não tem onde anotar nada.

**Proposta:** um caderno da mesa, visto só pela mesa do comitê, para anotar o desempenho das delegações (útil para a premiação). A migração deixa `delegacao_id` nulo quando a dona é a mesa e põe uma RLS própria (mesa do comitê lê e escreve). Ela não toca na regra "a mesa nunca lê o caderno das delegações". A ficha mostra "Anotações da mesa" para a mesa e "Minhas anotações" para a delegação. O "Anotar" do cabeçalho e o caderno em modal (lote 0b do 51) passam a valer também para a mesa. Com isso, nenhum papel que abre a ficha fica sem as suas anotações.

A parte B vai junto com a parte A: sem ela, a mesa abriria a ficha sem anotações.

## Testes

- [ ] Unidade: nenhuma tela fora de `NomeDelegacao`, do telão e da impressão monta bandeira e nome sem ação.
- [ ] Ponta a ponta: clicar num membro do bloco, num remetente de bilhete e num signatário abre a ficha certa no centro; fechar devolve o foco a quem abriu.
- [ ] Ponta a ponta: uma anotação feita pelo "Anotar" aparece na ficha da delegação, sem recarregar, para o delegado e para a mesa; uma nota compartilhada aparece em "Compartilhadas comigo" para quem a recebeu, e não para os outros.
- [ ] pgTAP (parte B): a mesa lê e escreve as próprias notas; a delegação não as lê; a mesa continua sem ler o caderno das delegações.
- [ ] axe na ficha com as novas seções; o modal não rola a 1366 × 768 com três notas.
