# Passo 47 · Modais, menus de escolha, saída segura e ícones

**Parte de:** planos posteriores ([interface e demonstração](../interface-e-demonstracao.md); regras em [melhorias-interface](../melhorias-interface.html))
**Depende de:** 43 e 44
**Esforço:** G
**Quando:** logo depois do passo 46, **antes do piloto** (passo 12) e do 48. Em 24/11/2026 o piloto foi adiado porque a interface ainda está carregada: ações simples levam a outra página, pedem rolagem ou passam por menus genéricos. O 47 e os dois primeiros lotes do 51 vêm antes da sessão de teste.
**Objetivo:** ações curtas acontecem no lugar, sem trocar de página; as irreversíveis pedem confirmação que explica o efeito; as escolhas usam componentes do próprio app, não o menu padrão do navegador. O passo 43 entregou a ficha da delegação, o "Ir para…" e o componente `Confirmar`; este passo cria a base comum dos modais e a espalha pelo app.

## O que construir

Em ordem:

1. **Modal base** (`src/lib/ui/Modal.svelte`), feito antes dos demais, que todos os modais do app usam. Hoje `Confirmar`, `FichaDelegacao` e `IrPara` têm cada um o seu próprio `<dialog>`, e este passo cria cerca de dez novos. O modal base é um `<dialog>` com título específico, descrição curta, ação principal e cancelar visíveis, fechamento por botão, Escape e clique no fundo (que não fecha com dados digitados), foco inicial previsível e retorno do foco ao elemento que abriu. Tem duas formas: **central** (confirmação e ação curta) e **painel lateral** (fichas). Os três componentes atuais passam a usá-lo. Regras em [melhorias-interface](../melhorias-interface.html), seção 5.
2. **Saída com confirmação** (hoje *Sair* sai direto): usuário, comitê ou delegação, "Os dados desta sessão serão removidos deste aparelho". Se a caixa de saída tiver itens (`caixa.pendentes()`), a modal diz "há N itens não enviados" e oferece **enviar agora** (reenvia e sai quando a caixa esvaziar) ou **sair mesmo assim** (descarta). Ao confirmar, usa a limpeza do passo 44.
3. **`Confirmar` em toda ação irreversível ou coletiva** (hoje só agenda e presidência): encerrar sessão e votação, retirar adoção e ponto, encerrar coletiva, ocultar notícia, excluir conta, remover participação, trocar de cenário na demonstração. A modal explica a consequência, não repete o botão.
4. **Fichas de votação, ponto, moção e nota** (vindas do passo 51), no mesmo painel lateral da ficha da delegação. Abrem por clique onde o objeto aparece (presidência, Agora, votações, crise), sem mudar a URL; trazem estado, quem participa e as ações que o papel permite. A ficha da votação mostra o placar e, para a mesa, encerrar; a do ponto ou moção, quem propôs, o estado e retirar ou votar.
5. **Modal para consulta curta:** prévia de DPO, carta, working paper, projeto e notícia; o documento completo segue com URL para compartilhar e imprimir.
6. **Modais de ação curta** (lista de [interface-e-demonstracao.md](../interface-e-demonstracao.md#respostas-e-entrevistas)), no lugar de uma página inteira para poucos campos:
   - aceitar ou recusar entrevista e escolher o horário (`/press/entrevistas`);
   - escolher os destinatários de uma carta (`/comite/<sigla>/cartas`);
   - adicionar as delegações citadas numa matéria (`/press/escrever`);
   - nova carta e novo bilhete a partir da ficha da delegação ou das mensagens, com o rascunho salvo como hoje.
7. **Menus de escolha.** Hoje há cerca de 40 `<select>` nativos em 19 telas, mais no documento (5), nos blocos (4), na presidência, nas mensagens e nos participantes da secretaria (3 cada). Regra da seção 6 de [melhorias-interface](../melhorias-interface.html):
   - **Escolha curta** (até seis opções, cabe em poucas palavras, não muda a sessão): continua `<select>`, com o visual do app só em CSS no `.campo select` de `app.css` (`appearance: none`, seta própria, estados de foco, erro e desabilitado nos dois temas). Sem JavaScript novo.
   - **Lista de delegações, documentos, participantes ou pontos** (mais de seis opções, ou com bandeira, estado ou descrição): componente `Escolha` (`src/lib/ui/Escolha.svelte`), uma lista com busca, bandeira e selo de estado, aberta no modal base quando não cabe no lugar. Teclado: setas, Enter e digitar para filtrar.
   - **Escolha que encerra, aprova ou muda a sessão:** cartões ou botões com `Confirmar`, nunca `<select>`.
8. **Cabeçalho com ícones** pela tabela de [interface-e-demonstracao.md](../interface-e-demonstracao.md#ícones): só a lupa e o sino sem texto; Perfil e Sair com texto; no celular, Perfil, Sair, tema e idioma em "Mais". Lucide já instalado, importado ícone a ícone.
9. **"Ir para…" ampliado:** veículos, matérias, comitês e agrupamento por papel, começando só com dados leves e buscando mais conforme a digitação, com espera curta entre as teclas (hoje carrega até 200 documentos ao abrir, `IrPara.svelte:33`).
10. **Desfazer no lugar de confirmar** quando a ação é reversível (retirar ponto, remover item não enviado).

## Estado (24/11/2026)

**Item 1 feito:** `src/lib/ui/Modal.svelte`, com `abrir()` e `fechar()` por `bind:this`, `lateral` para as fichas (a regra `dialog.ficha` do CSS virou `dialog.modal-lateral`) e o clique no fundo protegido quando há texto digitado. `Confirmar`, `FichaDelegacao`, `IrPara` e o exemplo do `/estilo` já o usam, sem mudança visual. O foco inicial continua o nativo: no `Confirmar`, o botão da ação, porque o teste do piloto confirma com Tab e Enter. Testes em `tests/47-modais.spec.ts`. A placa da sessão e a leitura da fala no caderno também usam o modal base, com `nome` (o `aria-label`) no lugar de `rotulo`, porque não têm título à vista; nenhuma tela tem mais `<dialog>` próprio.

**Item 2 feito:** *Sair* sempre abre o modal "Sair da conta?", com nome, delegação ou papel e comitê, e "Os dados desta sessão serão removidos deste aparelho". Com itens na caixa de saída, o mesmo modal vira o aviso do passo 44 ("Itens não enviados: N", enviar agora ou sair mesmo assim). Os testes que saem usam `sair()` de `tests/ajuda.ts`; `tests/44-seguranca.spec.ts` confere que cancelar mantém a sessão e os caches.

**Item 3 feito:** "Encerrar a coletiva" e "Ocultar notícia" passaram a usar `Confirmar` (o de encerrar a coletiva saiu de dentro do formulário de abrir, porque formulário não se aninha). O resto da lista já confirmava: encerrar sessão e votação, retirar adoção e remover acesso; o pedido de exclusão da conta tem confirmação própria na tela. Retirar ponto fica com o desfazer do item 10, porque dá para propor de novo. A troca de cenário entra com o passo 48. Teste de encerrar a coletiva (cancelar e confirmar) em `tests/17-comunicacao.spec.ts`; ocultar notícia, em `tests/11-press.spec.ts`.

**Item 4 feito:** `FichaVotacao`, `FichaPonto` e `FichaNota` (`src/lib/ui/`), no painel lateral. Abrem pelo nome do objeto (botão `.abre-ficha`) na presidência, na sessão do delegado, na Agora (votação aberta e respostas da crise) e na crise, sem mudar a URL. Os dados vêm da própria tela, que já os lê ao vivo: o placar anda e o estado muda com a ficha aberta. O `Modal` ganhou `aberto`, para a ficha abrir e fechar pelo estado da tela. A ficha da votação mostra estado, regra, resultado e os votos por grupo, e para quem preside, encerrar; a do ponto, quem propôs, detalhe, assinaturas e as ações do papel (na presidência, as mesmas da lista, por snippet: julgar, aceitar, lista especial, votar, recusar; na sessão, retirar o próprio). A página de votações continua abrindo cada votação no lugar. Testes em `tests/47-fichas.spec.ts` (comitê isolado `47`).

**Item 5 feito:** `src/lib/ui/Previa.svelte`, uma só no layout (carrega na primeira vez, como a ficha da delegação), aberta por `abrirPrevia(tipo, id)` de `ficha.svelte.ts`. Busca o DPO, a carta, o working paper ou projeto (cláusulas formatadas por `formatarDocumento`) ou a matéria pelo id, com o que a RLS deixa ler, e mostra o texto no painel lateral, com o link para a versão completa (impressão do DPO e da carta, página do documento, matéria no veículo). Abre pelo título na central de Documentos ("Do comitê" e cartas), na página de cartas, nos DPOs de outras delegações (o "Imprimir" virou "Ler") e no "Na press" da Agora. Os documentos dos próprios blocos e os "Ler e avaliar" da mesa seguem como links, porque levam a editar ou avaliar. Teste da carta em `tests/47-fichas.spec.ts`.

**Próximos (itens 6 a 10).** Começar pelo 6, os modais de ação curta (entrevista, destinatários de carta, delegações citadas, nova carta e bilhete pela ficha).

**Atenção no item 7 (menus).** O visual próprio do `<select>` muda as capturas de referência do CI (`presidencia.png`, `fila.png` e, com um exemplo de menu no `/estilo`, `estilo-*.png`). No mesmo trabalho, gerar as capturas de novo pelo CI, num ramo para a `main` não ficar vermelha: `gh workflow run ci.yml --ref <ramo> -f atualizar_capturas=true`, baixar os artefatos `capturas-N` para `tests/capturas/`, fazer o commit e só então levar à `main`. Só um `<select>` fica fora de `.campo` (o andamento da agenda), então a regra vale para o elemento `select`.

## Fora desta etapa

Favoritos, tamanho do texto e a revisão de rolagem, densidade e estados, tela por tela (passo 51).

## Testes

- [x] Modal base: um teste de componente cobre foco inicial, Escape, clique no fundo (fecha vazio, não fecha com texto digitado) e retorno do foco; os modais do app herdam esse comportamento.
- [x] Ponta a ponta: *Sair* abre a confirmação, cancelar mantém a sessão, confirmar apaga os caches e volta ao login; com um item na caixa de saída a modal mostra o aviso e "enviar agora" envia antes de sair.
- [x] Ponta a ponta: cada ação irreversível da lista do item 3 pede confirmação.
- [x] Ponta a ponta: clicar numa votação, num ponto e numa nota abre a ficha sem mudar a URL, e a ação da ficha (encerrar votação, retirar ponto) funciona dali.
- [ ] Ponta a ponta: aceitar uma entrevista, escolher destinatários de carta e citar uma delegação numa matéria sem sair da página.
- [ ] Ponta a ponta: escolher uma delegação digitando parte do nome no `Escolha`, só com o teclado.
- [ ] Textos novos em português e inglês (`npm run textos` passa).
- [ ] axe em cada modal; todo ícone com nome acessível.
- [ ] Teclado: Tab e Enter percorrem o cabeçalho, as modais e o "Ir para…".
- [ ] `npm run tamanho` abaixo de 300 KB depois dos ícones e do `Escolha`.
- [ ] Capturas: cabeçalho (notebook e celular), modal de saída, fichas da delegação e da votação, `Escolha` aberto e um `<select>` curto, nos dois temas.
