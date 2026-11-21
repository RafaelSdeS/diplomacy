# Passo 36 · Press: WhatsApp, X e Instagram

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 20)
**Depende de:** 27
**Esforço:** P
**Objetivo:** levar uma matéria às redes do evento em um toque, no celular e no notebook.

## Hoje

- O feed do veículo (`src/routes/press/[sigla]/+page.svelte:43`) gera a imagem de post ou story (`src/lib/imagem-redes.ts`) e monta a legenda com `HASHTAGS`.
- No celular, abre o compartilhamento do sistema com a imagem e a legenda; dali, Instagram, WhatsApp e X. No notebook, só baixa a imagem.

## Decisões

- As matérias exigem login, então não há link público para a notícia: o texto compartilhado leva título, linha fina e hashtags.
- O Instagram não aceita link direto de postagem: continua pelo compartilhamento do sistema (celular) ou pela imagem baixada (notebook).

## Como ficou

- `legendaDaNoticia`, `linkWhatsApp`, `textoParaX` e `linkX` em `src/lib/press.ts`; no feed, "WhatsApp", "X" e "Copiar legenda" (se a cópia falhar, a legenda aparece num campo já selecionado).
- Achado no caminho: publicar uma matéria sem citar delegação falhava ao guardar na caixa de saída (o IndexedDB não guarda os proxies do `$state`). A caixa agora guarda uma cópia em JSON dos argumentos (`src/lib/caixa-de-saida.ts`), o que vale para todos os envios.

## Código

- [x] `src/lib/press.ts`:
  - `legendaDaNoticia(noticia, hashtags)`: título, linha fina e hashtags;
  - `linkWhatsApp(texto)` (`https://wa.me/?text=…`);
  - `linkX(texto)` (`https://x.com/intent/post?text=…`), cortando em 280 caracteres sem partir palavra.
- [x] Feed do veículo, junto dos botões de imagem:
  - "WhatsApp" e "X": links com o texto pronto (`target="_blank" rel="noopener"`);
  - "Copiar legenda" (`navigator.clipboard.writeText`, com aviso "Legenda copiada" e, se falhar, o texto selecionado num campo).
- [x] No notebook, "Imagem para post" continua baixando, e a dica diz: "Publique a imagem pelo Instagram no celular ou pelo Meta Business Suite."
- [x] O selo "Simulação · <evento>" vem do passo 27.

## Testes

Arquivos: `src/lib/press.test.ts` e `tests/36-press-redes.spec.ts`.

- [x] Vitest: os links codificam acentos e `#`; o texto do X não passa de 280 caracteres nem corta palavra.
- [x] Ponta a ponta: os botões têm os `href` esperados; "Copiar legenda" põe o texto na área de transferência (permissão `clipboard-write` no contexto do Playwright).
- [ ] Manual: compartilhar no WhatsApp e no Instagram, num Android e num iPhone.

## Pronto quando

- [x] A press publica uma matéria nas redes do evento em um toque.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
