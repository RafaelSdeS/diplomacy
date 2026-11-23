# Passo 47 · Modais, saída segura e ícones

**Parte de:** planos posteriores ([interface e demonstração](../interface-e-demonstracao.md); regras em [melhorias-interface](../melhorias-interface.html))
**Depende de:** 43 e 44
**Esforço:** M
**Quando:** depois do piloto (passo 12), junto com a parte B do passo 45 e antes do 48. Se o piloto mostrar toques errados em ações sem confirmação, o item 2 pode ir antes do resto.
**Objetivo:** ações curtas acontecem no lugar, sem trocar de página, e as irreversíveis pedem confirmação que explica o efeito. O passo 43 entregou a ficha da delegação, o "Ir para…" e o componente `Confirmar`; este passo os espalha pelo app.

## O que construir

Em ordem:

1. **Saída com confirmação** (hoje *Sair* sai direto): usuário, comitê ou delegação, "Os dados desta sessão serão removidos deste aparelho". Se a caixa de saída tiver itens (`caixa.pendentes()`), a modal diz "há N itens não enviados" e oferece **enviar agora** (reenvia e sai quando a caixa esvaziar) ou **sair mesmo assim** (descarta). Ao confirmar, usa a limpeza do passo 44.
2. **`Confirmar` em toda ação irreversível ou coletiva** (hoje só agenda e presidência): encerrar sessão e votação, retirar adoção e ponto, encerrar coletiva, ocultar notícia, excluir conta, remover participação, trocar de cenário na demonstração. A modal explica a consequência, não repete o botão.
3. **Modal para consulta curta:** prévia de DPO, carta, working paper, projeto e notícia; o documento completo segue com URL para compartilhar e imprimir.
4. **Cabeçalho com ícones** pela tabela de [interface-e-demonstracao.md](../interface-e-demonstracao.md#ícones): só a lupa e o sino sem texto; Perfil e Sair com texto; no celular, Perfil, Sair, tema e idioma em "Mais". Lucide já instalado, importado ícone a ícone.
5. **"Ir para…" ampliado:** veículos, matérias, comitês e agrupamento por papel, começando só com dados leves e buscando mais conforme a digitação, com espera curta entre as teclas (hoje carrega até 200 documentos ao abrir, `IrPara.svelte:33`).
6. **Desfazer no lugar de confirmar** quando a ação é reversível (retirar ponto, remover item não enviado).

## Fora desta etapa

Favoritos, personalização de painel e a revisão geral de densidade e estados (passo 51).

## Testes

- [ ] Ponta a ponta: *Sair* abre a confirmação, cancelar mantém a sessão, confirmar apaga os caches e volta ao login; com um item na caixa de saída a modal mostra o aviso e "enviar agora" envia antes de sair; cada ação irreversível da lista pede confirmação.
- [ ] Textos novos em português e inglês (`npm run textos` passa).
- [ ] axe, foco inicial, Escape e retorno do foco em cada modal; todo ícone com nome acessível.
- [ ] Teclado: Tab e Enter percorrem o cabeçalho, as modais e o "Ir para…".
- [ ] `npm run tamanho` abaixo de 300 KB depois dos ícones.
- [ ] Capturas: cabeçalho (notebook e celular), modal de saída e modal da delegação.
