# Passo 51 · Melhorias gerais de interface

**Parte de:** planos posteriores ([melhorias-interface](../melhorias-interface.pdf), [melhorias.txt](../melhorias.txt) e [melhorias depois da revisão](../melhorias-pos-revisao.pdf))
**Depende de:** 47
**Esforço:** G (em lotes pequenos, um por tela)
**Quando:** logo depois do 47 e do 52 (testes rápidos). Os lotes 0, 1 e 2 (ações em botões e modais, presidência e Agora) vêm **antes do piloto** (passo 12); os demais entram aos poucos, o ano todo, e congelam antes do ensaio de outubro de 2027.
**Objetivo:** cada tela mostra só o que vale para o momento, sem rolar para achar a ação principal; o resto do acabamento, tela por tela.

## O que construir

**Regra de rolagem**, que vale para todo lote: num notebook de 1366 × 768, a tarefa principal de cada papel cabe sem rolar; no celular, a ação principal aparece na primeira tela. Cada tela mostra só o que vale para a fase atual. O resto vira contagem que abre um painel lateral ou uma ficha do passo 47. Até três ações relacionadas ficam à vista; as demais vão para "Mais opções" (seção 11 de [melhorias-interface](../melhorias-interface.pdf)).

**Lote 0 · Ações claras: botões, modais e ícones** (pedido de 24/11/2026, depois de usar o app pronto do passo 47: "ainda está muito não intuitivo"). Vale para todas as telas e vem primeiro, porque muda o padrão que os lotes 1 e 2 seguem.

- **Formulário sempre aberto vira botão e modal.** Hoje várias abas são "uma caixa de texto e um botão", sem dizer para que servem. Agora, cada tela mostra o seu conteúdo (lista, histórico, situação), e a ação de criar algo é um botão com ícone e verbo ("Anotar sobre o Brasil", "Escrever carta") que abre um modal no centro da tela, com título e explicação curta. Telas que mudam:
  - **página da delegação:** a caixa "Anotação" vira "Anotar" (ícone de caderno), num modal já preenchido com a delegação;
  - **caderno:** "Nova anotação";
  - **mensagens:** "Novo bilhete" e "Falar com a mesa";
  - **cartas:** "Escrever carta";
  - **crise do delegado:** "Escrever à crise";
  - **blocos:** "Novo bloco" e "Novo documento";
  - **press:** "Pedir entrevista" e "Nova pergunta" (coletiva);
  - **secretaria:** "Novo aviso" e "Novo item" (cronograma);
  - **sessão do delegado:** "Ponto ou moção";
  - **agenda:** "Propor agenda".

  O rascunho continua salvo no aparelho, e fechar o modal com texto pede confirmação (o modal base já protege o clique no fundo).
- **Botão parece botão, link parece link.** Hoje muitas ações têm só cor de letra e sublinhado, sem fundo, e parecem links: os nomes que abrem fichas (`.abre-ficha` e `.nome-delegacao--ficha`, do passo 47) e os "Abrir", "Ler", "Ler e avaliar" e "Responder" das listas. A regra:
  - toda ação tem fundo (principal cheio, secundária com fundo claro) e, sempre que houver um, ícone;
  - sublinhado só em link de navegação dentro de texto corrido;
  - nas listas, a linha inteira é clicável, com uma seta no fim, quando abre uma ficha ou prévia.
- **As abas no modelo da aba Comitê**, que funcionou: cada aba começa com as suas ações em cartões ou botões com ícone, nome e uma linha de descrição (a `.grade-atalhos` de `/comite/<sigla>` e do "Mais"), e o conteúdo vem abaixo. Começar por Documentos, Mensagens, Cartas e Crise.
- **Cabeçalho só com ícones.** Perfil e Sair passam a ser só ícone, como a lupa e o sino, com `aria-label`, `title` e foco visível. Isso revê o passo 47, que dava texto aos dois. O Sair continua pedindo confirmação, então não há risco de sair sem querer. No celular, cabem quatro ícones (lupa, sino, Perfil e Sair), e tema e idioma ficam em "Mais".
- **Caderno de qualquer lugar.** Hoje, para anotar, é preciso ir até a aba Caderno. Passa a haver:
  - um botão "Anotar" (ícone de caderno) sempre à vista para o delegado, que abre o mesmo modal: sobre qual delegação (já preenchida com quem está com a palavra, ou com a ficha aberta) e o texto;
  - o mesmo botão na ficha e na página da delegação.

  A aba Caderno fica para ler e buscar. O registro é o da nota rápida do passo 46 (caixa de saída, sem rede também).

**Lote 0b · Depois de usar o lote 0** (pedido de 24/11/2026, à noite). Antes do lote 1:

- **Quem preside, à vista de todos.** Uma faixa com a bandeira e o nome de quem preside a sessão (a delegação sorteada ou a mesa), na sessão, na Agora, no painel e no telão. Para a delegação que preside: "Sua delegação preside a sessão", com o caminho para o painel.
- **Modal central como padrão.** As fichas (delegação, votação, ponto, nota) e a prévia de documentos passam a abrir no centro, como os outros modais. O painel lateral fica só para o que precisa conviver com a tela (nenhum caso hoje).
- **Na sessão, o "Anotar" vira modal.** A nota rápida do passo 46 deixa de ser uma caixa de texto solta na tela: um botão "Anotar" abre o modal, que guarda o contexto (quem falava) e o rascunho como antes.
- **Os links da sessão viram botões** com ícone (Agenda, Votações, Notas de crise, Telão, Chamada), no desenho da aba Comitê.
- **O caderno de qualquer lugar, para escrever e para ler.** O ícone do cabeçalho abre o caderno num modal: as anotações (com filtro por delegação e busca) e a nova anotação. Aberto a partir de uma delegação, já mostra as notas sobre ela.
- **"Compartilhar com" com bandeiras e modal**, pelo `Escolha`, como o "Para" do bilhete, que também passa a mostrar as bandeiras.
- **Mensagens reformulada.** Hoje a aba mistura bilhetes, conversa com a mesa, bloqueios e entrevistas numa página longa. Passa a ter:
  - no topo, as ações em cartões (novo bilhete, falar com a mesa);
  - os bilhetes agrupados por delegação, como conversas, com bandeira, a última mensagem e responder;
  - a conversa com a mesa à parte;
  - bloqueios e entrevistas como seções recolhidas, com contagem.
- **A aba Comitê fica como está.** Ela é o modelo das outras.

**Lote 1 · Presidência** (`/comite/<sigla>/sessao/presidencia`). Hoje empilha cerca de 13 blocos numa página: lista de oradores, próximos, pedidos de fala, chegadas, pausa, plenária, com a palavra, ajustes, votação, pedidos para aprovar, pontos e moções, projetos e emendas.

- Sempre à vista: com a palavra, o cronômetro e a lista com os próximos.
- Por contagem que abre um painel lateral: pedidos de fala, chegadas, pedidos para aprovar, pontos e moções.
- Só quando ativos: votação, plenária, projetos e emendas.
- Ajustes da fala e do debate num painel lateral, fora da coluna principal.

**Lote 2 · Agora** (`/`). Hoje empilha o bloco do papel e até cinco seções gerais (acontecendo agora, depois, avisos, respostas da crise, na press). O bloco do papel fica no topo; cada seção geral vira uma linha com contagem e o item mais recente, que abre o resto.

**Lote 3 · Bilhetes como conversa** (pedido de 24/11/2026: "a aba de bilhetes também pode ser melhorada; tente algo mais próximo de uma rede social, sem perder o tom oficial e sofisticado"). O lote 0b agrupou os bilhetes por delegação, mas cada conversa ainda é um `<details>` numa lista longa, e responder abre um modal. Proposta, no modelo dos aplicativos de conversa:

- **Duas colunas no notebook:** à esquerda, as conversas; à direita, a conversa aberta. No celular, a lista e, ao tocar, a conversa em tela inteira, com "Voltar".
- **Na lista de conversas, cada linha mostra:**
  - a bandeira, como avatar;
  - o nome da delegação em Spectral;
  - a prévia da última mensagem e a hora;
  - um ponto dourado quando há mensagem não lida.

  Em cima, a busca e o botão "Novo bilhete". A conversa com a mesa fica fixada no topo ("Mesa diretora", com o ícone do martelo).
- **Na conversa:**
  - as mensagens em balões: as minhas à direita, em marinho; as da outra delegação à esquerda, em fundo claro com fio dourado;
  - a hora em versalete pequeno;
  - separadores por sessão ("Sessão 3 · 14:00").

  A caixa de escrever fica fixa embaixo, com "Enviar" (Enter envia, Shift + Enter quebra linha) e o rascunho por conversa, como hoje. Sem emoji nem curtidas: o tom é de chancelaria (papel, marinho e dourado), não de rede social.
- **Não lidas sem migração:** a hora da última leitura de cada conversa fica guardada no aparelho; a contagem entra no ícone de Mensagens do menu.
- **Bloquear e ver a ficha:** o nome no topo da conversa abre a ficha da delegação (passo 55); "Bloquear" vai para "Mais opções" da conversa, e os bloqueios saem do fim da página.
- **Entrevistas:** continuam como pedidos em cima da lista, só quando há pedido pendente.
- **Teste:** a 1366 × 768, a lista e a conversa não rolam a página, só a própria coluna; uma mensagem nova chega na conversa aberta sem recarregar e marca a conversa como não lida para quem não está nela.

**Lotes seguintes**, pelas telas maiores: crise, blocos e secretaria. O documento virou o [passo 57](57-escrita-de-documentos.md), e as abas Agenda e Documentos, o [passo 56](56-ordem-do-topico.md).

**No lote dos blocos: trocar o redator** (prioridade pequena; **a primeira parte está feita**: o redator abre "Redatores · Mudar" no cartão do bloco e marca ou desmarca membros, com bandeiras; quem entra é marcado antes de quem sai, porque o bloco precisa de um redator). Hoje o redator é quem cria o bloco. O banco já permite passar ou dividir a redação (`definir_redator`, passo 09), mas nenhuma tela usa isso. A tela do bloco ganha:

- **o redator passa ou divide:** "Redatores" lista os membros, e o redator atual marca outros, ou passa a redação, com `Confirmar`;
- **troca por consenso:** um membro propõe outro redator e a troca vale quando a maioria do bloco aceita. Esta parte só entra se o piloto mostrar blocos travados por um redator ausente.

**Em todos os lotes:**

- Trilha de voltar consistente; as fichas do passo 47 abrem em toda página onde o objeto aparece.
- Números clicáveis e placeholders de carregamento em CSS, sem imagens novas.
- Estados vazios que explicam a ausência e a próxima ação; filtros visíveis, com contagem e "limpar".
- Feedback de rascunho ("salvando", "salvo neste aparelho", "enviado", "não enviado") e de reconexão sem esvaziar a tela.
- Densidade por papel (confortável no celular, compacta no notebook) e consistência dos selos de estado.
- Revisão das telas de links secundários e do "Mais" no celular.

**Preferências** (seção 23 de [melhorias-interface](../melhorias-interface.pdf)), num lote próprio: até cinco destinos favoritos, que aparecem no topo do "Ir para…" e do "Mais"; tamanho do texto e densidade no Perfil, guardados no aparelho, sem configuração a cada sessão.

## Estado (24/11/2026)

**Lote 0 feito:**

- **Botões com fundo:** o secundário ganhou fundo claro. Os nomes que abrem fichas e prévias têm fundo, borda e uma seta, e a seta fica fora do nome acessível (`content: '›' / ''`). "Ler", "Abrir", "Responder" e "Imprimir" das listas têm cara de botão.
- **Cabeçalho:** Perfil e Sair só com ícone, também no celular. O delegado tem o "Anotar no caderno" (`Anotar.svelte`, aberto por `abrirAnotacao()` de `ficha.svelte.ts`), que também está na ficha e na página da delegação, com a delegação já escolhida.
- **Formulário vira botão e modal** (`AcaoEmModal.svelte`): novo bilhete e falar com a mesa, escrever carta, escrever à crise, nova anotação ou fala no caderno, pedir entrevista, nova pergunta da coletiva, ponto ou moção, novo bloco, novo documento, novo aviso e novo item do cronograma. O modal fecha quando a ação dá certo; o erro aparece dentro dele. Vindo de "Mandar bilhete" (`?para=`), o bilhete já abre.
  - A proposta de agenda continua na página: é um editor longo, e a seção 5 de [melhorias-interface](../melhorias-interface.html) manda tarefa longa para página ou painel.
- **Abas no modelo da aba Comitê:** a grade de atalhos virou `GradeAtalhos.svelte`, que a aba Comitê e a central de Documentos usam (DPO, Blocos, Cartas e Caderno no topo; os links soltos do fim dos cartões saíram).
- **Testes:** `abrirAcao()` de `tests/ajuda.ts` abre o modal de uma ação.

**Lote 0b feito:**

- **Quem preside:** `QuemPreside.svelte` mostra a faixa na sessão e na Agora (o painel e o telão já mostravam). Para a delegação que preside, a faixa diz "Sua delegação preside a sessão" e leva ao painel.
- **Modais no centro:** fichas e prévia abrem no centro.
- **Botões na sessão:** Chamada, Agenda, Votações, Notas de crise e Telão viram botões com ícone.
- **"Anotar" na sessão:** abre a nota rápida num modal.
- **O caderno de qualquer tela:** o ícone do cabeçalho abre o "Caderno", com a nova anotação em cima e as notas embaixo, com busca; aberto a partir de uma delegação, mostra só o que foi anotado sobre ela.
- **Compartilhar com bandeiras:** "Compartilhar com" e o "Para" do bilhete usam o `Escolha` com bandeiras; o compartilhar salva ao fechar a lista (`onpronto`).
- **Mensagens:** no topo, os pedidos de entrevista que esperam resposta. Depois, os bilhetes como conversas por delegação (bandeira, última mensagem, contagem, a mais recente aberta, "Responder"), a conversa com a mesa e, no fim, os bloqueios.
- **DPO:** "Meu DPO" em cartões por tópico (situação, data de envio, palavras, comentário da mesa, Escrever ou Continuar, Ler, Imprimir). A escrita abre num modal largo, com a contagem de palavras e a prévia ao lado. Os DPOs do comitê aparecem em cartões com bandeira, e a mesa avalia num modal.
- **Dados de exemplo online:** o CSNU-T tem DPOs, dois blocos com working papers e um projeto, cartas, bilhetes, notas de crise e anotações, criados entrando como as delegações de teste.

**Lote 1 feito (presidência):**

- **Sempre à vista:** pedidos de fala e lista, "Com a palavra" com o cronômetro, e a votação (grande quando aberta, compacta quando encerrada).
- **"Para decidir":** um cartão com uma linha por tipo, com a contagem (destacada quando há algo):
  - pontos e moções (sempre);
  - pedidos do bureau, chegadas, projetos e emendas (só quando há).

  Cada linha abre um modal no centro; agir dentro dele (aceitar, votar, julgar, confirmar, abrir votação) fecha o modal e devolve ao painel. "Passar a presidência" fica no cartão.
- **Ajustes:** os da fala e do debate abrem num modal, que fecha quando uma mudança é aplicada.
- **Teste:** no debate, a 1366 × 768, nem a página nem as colunas rolam (teste em `43-fluxo`).
- **Limite conhecido:** com a votação aberta num comitê de 15 delegações, a coluna da votação ainda pode rolar (a grade de votos e a chamada ocupam espaço). O teste cobre o debate; a votação aberta fica para a revisão depois do piloto.
- **Testes:** `abrirPainel()` em `tests/ajuda.ts`.

**Lote 2 feito (Agora):**

- **O bloco do papel fica em cima.** A sessão ao vivo do delegado tem duas colunas no notebook: o que acontece à esquerda; a placa (sem o nome grande) e "Abrir a sessão" à direita. Os três atalhos da mesa são botões numa linha, com a contagem dentro.
- **"Precisa de você":** sai quando não há pendência e a sessão ao vivo já está à vista.
- **"No evento":** "Acontecendo agora", "Depois", "Avisos", "Respostas da crise" e "Na press" viram linhas, cada uma com o mais recente; "Ver tudo" abre o resto num modal.
- **Teste:** a Agora da mesa e a do delegado (com sessão aberta) não rolam a 1366 × 768 (teste em `43-fluxo`).

## Fora desta etapa

Itens que dependem de um segundo evento, habilidades especiais para delegações, edição livre simultânea e telas inteiras de personalização.

## Testes

- [ ] Lote 0, ponta a ponta: em cada tela da lista, a ação de criar é um botão que abre um modal no centro, e o texto digitado sobrevive a fechar e reabrir.
- [ ] Lote 0: anotar sobre uma delegação a partir da sessão, da ficha e da página da delegação, sem ir à aba Caderno.
- [ ] Lote 0: Perfil e Sair só com ícone, com nome acessível, no notebook e no celular.
- [ ] Lote 0, captura: nenhuma ação sem fundo nas telas revisadas (botões têm fundo; links sublinhados só em texto corrido).

- [ ] Ponta a ponta, a 1366 × 768: a área principal da presidência não rola em cada fase (debate, votação aberta, plenária) e a da Agora não rola para a mesa e para o delegado; o teste compara a altura do conteúdo com a da janela.
- [ ] Capturas e axe nas telas revisadas, no tema claro e no escuro.
- [ ] Ponta a ponta: o voltar leva à tela de origem e preserva filtro e rolagem.
- [ ] Ponta a ponta: um favorito marcado aparece no topo do "Ir para…" e continua lá depois de recarregar.
- [ ] Teclado e leitor de tela nas modais e nas fichas.
- [ ] Manual: uma pessoa nova encontra uma tarefa comum em poucos passos.
