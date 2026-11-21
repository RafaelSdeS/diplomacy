# Passo 27 · Diplomacy: nome e logo

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 9)
**Depende de:** 25
**Esforço:** P mais o desenho do logo
**Objetivo:** o app passa a se chamar Diplomacy, com logo próprio; o nome do evento (UFRGSMUN) vem do banco.

## Como ficou

- Ícone "a placa": um "D" cujo vão é a placa levantada, com a borda dourada. Favicon, PNG 192/512, maskable e Apple, gerados com o Chromium headless.
- Manifest "Diplomacy"; cabeçalho com o logo, "Diplomacy" e o nome do evento.
- Títulos, imagem para as redes (selo e hashtags) e impressões com o nome do evento do banco.
- As três propostas para escolher em `/marca/opcoes.html` (escolhida a placa; a página saiu no passo 41).

## Antes

- Ícone: um "U" branco num quadrado azul (`static/favicon.svg`); `icone-192.png` e `icone-512.png` no mesmo desenho.
- `static/manifest.webmanifest`: `name` e `short_name` "UFRGSMUN".
- O cabeçalho (`src/routes/+layout.svelte`) mostra "UFRGSMUN · Simulação das Nações Unidas".
- "UFRGSMUN" aparece fixo em 41 arquivos de `src/`: quase todos no `<title>` (" · UFRGSMUN"), mais o selo da imagem para as redes (`src/lib/imagem-redes.ts`), o service worker e as telas de impressão.

## Decisões

- **Diplomacy** é a marca do app: logo, ícone, nome ao instalar, tela de entrada.
- **O evento** aparece pelo nome do banco (`evento.nome`), no cabeçalho, nos títulos, no selo das imagens e nos documentos impressos.
- **O logo é proposto aqui** (você pediu). Três opções em SVG; você escolhe uma e ela vira o ícone.

## O logo: três propostas

Regras para as três: sem o emblema da ONU (nada de ramos de oliveira em volta de um mapa), traço fino, legível a 16 px, versão em uma cor só, azul-marinho `#1b365d` com dourado `#8c6d2c` só em detalhe.

1. **A placa (recomendada).** Um "D" em serifa cujo vão interno forma a placa levantada de uma delegação: o gesto que o app digitaliza. No ícone, o D branco no quadrado azul-marinho, com a borda da placa em dourado.
2. **O selo.** Um selo circular de linha dupla fina, com "DIPLOMACY" em versalete na borda e um "D" no centro. Combina com os selos tipo carimbo do app, mas perde detalhe em tamanho pequeno.
3. **Globo e pena.** Três meridianos em arco cruzados por uma pena, em linha fina. Mais ilustrativo, menos austero.

## Arquivos

- [x] `static/marca/opcao-1-placa.svg`, `opcao-2-selo.svg`, `opcao-3-globo.svg` e `static/marca/opcoes.html` (as três em 16, 32, 64 e 192 px, com fundo escuro), publicada em `/marca/opcoes.html`. Escolhida em 21/11/2026: a placa (opção 1), que já era o ícone do app. As opções 2 e 3 e a página `opcoes.html` foram apagadas no passo 41.
- [x] `static/favicon.svg`, `static/icone-192.png`, `static/icone-512.png`, `static/icone-maskable-512.png` (desenho dentro da zona segura de 80%) e `static/apple-touch-icon.png` (180 px). Os PNG são gerados do SVG com o Chromium headless, como o PDF do plano, e versionados.
- [x] `static/manifest.webmanifest`: `name` "Diplomacy", `short_name` "Diplomacy", o ícone maskable com `"purpose": "maskable"`.
- [x] `src/app.html`: `apple-touch-icon` e `theme-color`.

## Código

- [x] `src/lib/titulo.svelte.ts`: `tituloDaAba(...partes)` junta as partes com " · " e põe no fim o nome do evento da pessoa, ou "Diplomacy" sem login. O nome vem de `marca.evento`, um estado que o layout preenche com `participacoes[0]?.evento_nome`. (O nome `titulo` já era usado por campos de formulário.)
- [x] Trocar os 43 `<title>` por `{tituloDaAba(t('Chamada'), data.comite.sigla)}` (feito por script).
- [x] Cabeçalho: logo pequeno, "Diplomacy" e, ao lado, o nome do evento.
- [x] `src/lib/imagem-redes.ts`: selo "Simulação · <evento>" com o nome recebido por parâmetro.
- [x] Telas de impressão (edição do dia, crachás), telão sem sessão, regras, sem acesso e aviso de privacidade: o nome do evento vem de `marca.evento` ou o texto fala em "evento". Os códigos de documento já vinham do banco.
- [x] `scripts/textos-fixos.ts`: passa a falhar se "UFRGSMUN" aparecer em `src/` fora de testes e do dicionário. Assim o nome não volta fixo.

## Testes

- [x] `npm run textos` falha com "UFRGSMUN" fixo fora de comentários, testes e dicionário (conferido) e passa depois da troca.
- [x] Vitest: `tituloDaAba()` com e sem evento; a hashtag sai do nome do evento.
- [x] Ponta a ponta: o título da sessão termina com o nome do evento do seed; o manifest tem "Diplomacy".
- [ ] Capturas de referência refeitas no CI (cabeçalho mudou em todas as telas), pelo `workflow_dispatch` "atualizar_capturas".
- [ ] Manual: instalar no Android e no iPhone e conferir o ícone e o nome na tela inicial.

## Pronto quando

- [x] O app instalado se chama Diplomacy e usa o logo recomendado (a placa), até você escolher.
- [x] Nenhuma tela tem o nome do evento fixo no código.
- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
