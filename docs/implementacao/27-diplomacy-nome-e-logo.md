# Passo 27 · Diplomacy: nome e logo

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 9)
**Depende de:** 25
**Esforço:** P mais o desenho do logo
**Objetivo:** o app passa a se chamar Diplomacy, com logo próprio; o nome do evento (UFRGSMUN) vem do banco.

## Hoje

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

- [ ] `static/marca/opcao-1.svg`, `opcao-2.svg`, `opcao-3.svg`, mais uma página simples `static/marca/opcoes.html` com as três em 16, 32, 192 px, claro e escuro, para escolher. Depois da escolha, apagar as não usadas.
- [ ] `static/favicon.svg`, `static/icone-192.png`, `static/icone-512.png`, `static/icone-maskable-512.png` (desenho dentro da zona segura de 80%) e `static/apple-touch-icon.png` (180 px). Os PNG são gerados do SVG com o Chromium headless, como o PDF do plano, e versionados.
- [ ] `static/manifest.webmanifest`: `name` "Diplomacy", `short_name` "Diplomacy", o ícone maskable com `"purpose": "maskable"`.
- [ ] `src/app.html`: `apple-touch-icon` e `theme-color`.

## Código

- [ ] `src/lib/titulo.ts`: `titulo(...partes)` junta as partes com " · " e põe no fim o nome do evento da pessoa, ou "Diplomacy" sem login. O nome vem de um estado que o layout preenche com `participacoes[0]?.evento_nome`.
- [ ] Trocar os `<title>` dos 41 arquivos por `{titulo(t('Chamada'), data.comite.sigla)}`. É troca mecânica.
- [ ] Cabeçalho: logo pequeno, "Diplomacy" e, ao lado, o nome do evento.
- [ ] `src/lib/imagem-redes.ts`: selo "Simulação · <evento>" com o nome recebido por parâmetro.
- [ ] Telas de impressão e códigos de documento (`src/lib/formatacao.ts`, `src/lib/impressao.ts`): o nome do evento vem dos dados carregados, não fixo.
- [ ] `scripts/textos-fixos.ts`: passa a falhar se "UFRGSMUN" aparecer em `src/` fora de testes e do dicionário. Assim o nome não volta fixo.

## Testes

- [ ] `npm run textos` falha com "UFRGSMUN" fixo e passa depois da troca.
- [ ] Vitest: `titulo()` com e sem evento.
- [ ] Ponta a ponta: o título da sessão termina com o nome do evento do seed; o manifest tem "Diplomacy".
- [ ] Capturas de referência refeitas no CI (cabeçalho mudou em todas as telas).
- [ ] Manual: instalar no Android e no iPhone e conferir o ícone e o nome na tela inicial.

## Pronto quando

- [ ] O app instalado se chama Diplomacy e usa o logo escolhido.
- [ ] Nenhuma tela tem o nome do evento fixo no código.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
