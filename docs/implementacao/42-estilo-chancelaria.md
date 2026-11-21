# Passo 42 · Estilo chancelaria

**Depende de:** 39. Feito depois de 40 e 41, que também mexem em `src/routes/+layout.svelte` e no service worker.
**Esforço:** M
**Objetivo:** o app passa a ter a aparência da opção B ("chancelaria oficial"), escolhida em 21/11/2026 entre três protótipos: faixa azul-marinho profundo com fio dourado, cinzas neutros, cantos retos, títulos e documentos em Spectral e vermelho institucional só para o que está ao vivo.

## Referência

- Protótipos em `docs/estilos/`:
  - a comparação das três opções (`estilo-*.html`);
  - oito telas da opção B (`b-*.html`): sessão, Agora no celular, presidência com votação, projeto de resolução, crise, press, telão e DPO impresso.
- As cores e o tema escuro proposto estão em `docs/estilos/b-comum.js`. Os protótipos usam Tailwind só para ficarem prontos rápido. **O app continua com CSS próprio**: a tradução é para variáveis de `src/app.css`, sem framework.
- **De onde vêm as cores:**
  - marinho: Design System do gov.br, usado pelo Itamaraty (`#071D41`, `#0C326F`);
  - vermelho, mostarda e cinzas: DSFR francês (`#E1000F`, `#C9191E`, `#C3992A`, `#161616`, `#666666`, `#DDDDDD`, `#F6F6F6`);
  - Spectral: a fonte com serifa do DSFR.
  - O tema escuro não vem de nenhum site: é proposta nossa.

## Antes

- **Cabeçalho:** o `.timbre` (barra do app) tinha fundo papel e um fio marinho de 3 px em cima.
- **Cantos:** de 2 a 8 px, com selos em pílula e fotos redondas.
- **Fonte:** Source Serif 4, só no peso 600 fora de `/imprimir`. Na tela, a `.folha` do documento e do DPO usava esse arquivo também para o texto normal.
- **Cores fixas fora das variáveis** em vários lugares:
  - nas regras de papel de `app.css`;
  - no `.telao`;
  - em `src/lib/imagem-redes.ts`;
  - no `theme-color`;
  - no logo e nos ícones PNG.

## Decisões

1. **Fonte da interface:** continua a do sistema. A Noto Sans dos protótipos fica de fora: são ~40 KB a mais por um ganho pequeno.
2. **Spectral no lugar da Source Serif 4:**
   - o peso 600 vai no layout principal, para os títulos;
   - o 400 e o 400 itálico vão em `/imprimir` e nas rotas com `.folha` (`documento/[id]` e `comite/[sigla]/dpo`), importados na própria rota, fora da primeira abertura.
3. **A faixa marinho é o `.timbre`.** O `h1` de cada tela continua no conteúdo, com a linha dupla do passo 37. Levar o título para dentro da faixa, como nos protótipos, mexeria nas 47 telas.
4. **Dourado, com moderação:**
   - o fio de 2 px sob a faixa e sob o topo do telão;
   - a marca do item atual no menu;
   - o nome do evento na faixa;
   - a presidência, como antes.
   - No papel branco, o fio (`#C3992A`, contraste 2,7) é só enfeite.
5. **Vermelho vivo (`--cor-vivo`) só para o que está ao vivo:** a listra de 4 px de `.cartao--ao-vivo` e a faixa do plantão no telão. Sempre junto de texto.
6. **Cantos retos em tudo**, inclusive selos, fotos, bandeiras, leitor de QR e o logo.
7. **Telão:** continua marinho, agora `#071D41`, com o fio dourado sob o topo.
8. **Documentos (tela e papel iguais, regra do passo 37):** a faixa do tópico usa fios marinho e dourado em vez de fundo chapado. Gasta menos tinta e sai bem em preto e branco.
9. **Verde e âmbar** (`--cor-ok`, `--cor-alerta` e seus fundos) não mudam.

## Variáveis

Contraste calculado pela fórmula da WCAG. Quem garante o contraste de verdade, nas telas reais, é o axe.

| Variável | Antes, claro | Agora, claro | Antes, escuro | Agora, escuro |
|---|---|---|---|---|
| `--cor-fundo` (papel) | `#ffffff` | `#ffffff` | `#15243a` | `#121a29` |
| `--cor-superficie` (mesa) | `#f3f4f6` | `#f6f6f6` | `#0e1a2b` | `#0b111c` |
| `--cor-linha` | `#d9dee5` | `#dddddd` | `#2b3d57` | `#2a3448` |
| `--cor-texto` | `#1f2933` | `#161616` (16,7 na mesa) | `#e7ecf3` | `#e8ecf2` (14,7) |
| `--cor-texto-suave` | `#52606d` | `#666666` (5,7; 5,3 na mesa) | `#a7b4c6` | `#98a2b3` (6,8) |
| `--cor-marinho` (títulos, links, botões, foco) | `#1b365d` | `#0c326f` (12,3) | `#a9c1e6` | `#a9c1e6` (9,5) |
| `--cor-marinho-suave` | `#e9eef5` | `#eef1f7` | `#1c2f4b` | `#1a2740` |
| `--cor-sobre-marinho` | `#ffffff` | `#ffffff` | `#0e1a2b` | `#071d41` |
| `--cor-dourado` (texto) | `#8c6d2c` | `#695240` (7,3) | `#d2b26a` | `#ddbb62` (9,4) |
| `--cor-erro` | `#a1231b` | `#c9191e` (5,8) | `#f0a39b` | `#ff8a80` (7,6) |
| `--cor-erro-fundo` | `#fbe9e7` | `#fef4f4` | `#3a1714` | `#3a1517` |
| `--cor-faixa` (nova) | — | `#071d41` (branco: 16,7) | — | `#050c1a` |
| `--cor-sobre-faixa` (nova) | — | `#ffffff` | — | `#ffffff` |
| `--cor-fio-dourado` (nova) | — | `#c3992a` (6,3 na faixa) | — | `#c3992a` |
| `--cor-vivo` (nova) | — | `#e1000f` | — | `#ff5c5c` |
| `--raio` | `4px` | `0` | | |
| `--fonte-titulo` | Source Serif 4 | `'Spectral', Georgia, 'Noto Serif', serif` | | |

## Como ficou

- **Variáveis:** as da tabela, nos dois blocos do tema escuro. Todos os 31 `border-radius` usam `--raio`.
- **Fonte:**
  - `@fontsource/spectral` no lugar de `@fontsource/source-serif-4`;
  - o 400 e o itálico entram em `/imprimir`, `documento/[id]` e `comite/[sigla]/dpo`;
  - a imagem para as redes (`imagem-redes.ts`) usa a Spectral no título, com a Georgia de reserva.
- **Faixa:**
  - o `.timbre` redefine as variáveis para fundo escuro, como o `.telao` já fazia: marca, nome da conta, botões e foco ficam brancos sem mudar a marcação;
  - o nome do evento fica dourado;
  - o item atual do menu ganha o fio dourado (em cima no celular, à esquerda no notebook).
- **Logo:** não precisou de versão para a faixa. O quadrado marinho do logo se funde com ela e o "D" branco continua visível.
  - Cores novas e cantos retos em `static/favicon.svg` e `static/marca/opcao-1-placa.svg`.
  - Os quatro PNG foram gerados de novo a partir do SVG com o Chromium do Playwright; o `maskable` tem o desenho a 80 %.
- **Ao vivo:** `.cartao--ao-vivo` no "Com a palavra" da sessão e do painel e no cartão "Sessão ao vivo" do Agora. As outras situações continuam com `.cartao--destaque`.
- **Cronômetro:** não mudou. Âmbar nos últimos 10 s e vermelho (`--cor-erro`, agora `#c9191e`) quando o tempo acaba. Os protótipos tinham uma barra de progresso que o app não tem.
- **Telão:** fundo `#071d41`, fio dourado sob o topo. O plantão (atualização de crise ou nota urgente da press) é uma faixa `#c9191e` com texto branco.
- **Papel:**
  - as cores fixas de `.folha`, impressão, crachás e edição da press seguem a nova paleta;
  - a faixa do tópico usa fios.
- **Outros:**
  - `theme-color` é `#071d41` em `src/app.html` e no manifesto;
  - `/estilo` mostra as três cores novas;
  - a seção "Aparência" do [índice](README.md#aparência) foi atualizada.
- **Tamanho:** a primeira abertura foi de 160,9 KB para 162,4 KB (gzip), de 300 KB.

## Testes

- [x] `npm run rapido`: tipos, textos fixos e 106 testes de unidade.
- [x] Suíte de ponta a ponta inteira no computador: 223 passaram, 0 falharam, com o axe nos dois temas (`tests/37-visual.spec.ts` e o axe de todas as rotas).
- [x] `npm run capturas`: 14 imagens refeitas:
  - 01 estilo, 6 imagens;
  - 06 presidência e telão;
  - 08 fila;
  - 09 documento, 2 imagens;
  - 10 DPO impresso;
  - 35 telão em crise e desfecho.
- [x] `npm run tamanho`: 162,4 KB.
- [ ] Manual:
  - telão num projetor em sala clara;
  - faixa e barra de status (`theme-color`) em Android e iPhone reais;
  - ícone do app na tela inicial;
  - DPO impresso em preto e branco;
  - logo na faixa nos dois temas.

## Pronto quando

- [ ] As telas reais, abertas ao lado dos protótipos `b-*.html`, têm a mesma atmosfera nos dois temas.
- [x] Documento na tela e no papel continuam iguais.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.

Fica de fora: a Noto Sans (decisão 1) e o título de cada tela dentro da faixa (decisão 3).
