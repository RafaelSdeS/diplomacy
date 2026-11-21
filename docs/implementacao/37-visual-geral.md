# Passo 37 · Visual geral

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 19)
**Depende de:** 20 a 36 (por último, porque eles mudam a estrutura das telas)
**Esforço:** G
**Objetivo:** o app deixa de parecer básico e ganha o aspecto austero, profissional e "premium" de um documento diplomático, com textos formais bonitos para a imersão dos delegados.

## Hoje

- A base está definida em `src/app.css` (1.721 linhas): cores, Source Serif 4 nos títulos, selos, linhas de 1 px, tema escuro. As regras estão na seção "Aparência" do [índice](README.md#aparência).
- Mesmo assim, as telas ficaram básicas: cartões iguais lado a lado, muitos botões do mesmo peso, pouca hierarquia.
- DPO, cartas e resoluções só ficam bonitos na impressão (`/imprimir/…`, CSS de A4 em `app.css`); na tela, aparecem como texto comum.
- O cronograma é uma lista por dia. O perfil é um formulário.

## Decisões

- Manter a austeridade: nada de gradiente, sombra pesada nem animação decorativa.
- Bilhetes entre delegações continuam com cara de conversa (são a exceção pedida); o resto dos textos ganha cara de documento.
- O limite de 300 KB na primeira abertura continua: nenhuma fonte nova.

## Como ficou

- Superfícies: a tela é a "mesa" (`--cor-superficie`), cartões, campos, cabeçalho e menu são "papel" (`--cor-fundo`); no escuro, o papel fica acima da mesa. Títulos em 28, 22 e 18 px; raio de 4 px.
- Timbre: todo `h1` de tela ganha a linha fina dupla (CSS, sem trocar a marcação de 47 telas). A data e a sessão à direita ficaram de fora: o rótulo de cada tela já diz o contexto.
- `.folha`: o documento na tela usa o papel claro da impressão (também no tema escuro); a leitura do DPO pela mesa passa a ser uma folha.
- Cartões: `cartao--destaque` (borda marinho, topo de 3 px) no "Com a palavra" da sessão e do painel e nas situações que pedem atenção; `cartao--discreto`. Os atalhos do fim da sessão viraram links.
- Carimbo com borda dupla. Placa da delegação como o cartão dobrado da mesa (`.placa-nome`).
- Telas: Agora com a data no rótulo; página da delegação e perfil como credencial (bandeira grande, foto em moldura); press com cabeçalho de jornal; cronograma em linha do tempo, com o comitê como etiqueta; entrar numa folha com a marca; telão com a linha dupla e a faixa de crise legível no fundo marinho.
- Ficaram de fora: o painel em três colunas com os relógios no centro (a ordem atual já foi ajustada nos passos 28 a 31 e os testes de atalho dependem dela) e ícones por tipo de item no cronograma (o item não tem tipo no banco).
- `tests/37-visual.spec.ts`: axe no tema escuro nas telas principais de delegado, mesa, crise e secretaria.

## Fundamentos (primeiro)

- [x] **Tokens em `app.css`:**
  - escala tipográfica (títulos em serifa: 28, 22, 18 e 15 px; corpo 16 px; rótulos em versalete 12 px);
  - espaçamentos de 4 em 4;
  - superfícies "papel" (branco), "mesa" (cinza muito claro) e "destaque" (marinho suave).
- [x] **Timbre** (sem componente: CSS em `.app main > h1`, sobre a marcação que todas as telas já têm): o cabeçalho de toda tela, no lugar do par `<p class="rotulo">…</p><h1>`. Mostra evento e comitê em versalete, o título em serifa, a data ou a sessão à direita e uma linha fina dupla embaixo. Recebe a trilha do passo 25.
- [x] **A classe `.folha`** (sem componente: a classe basta): o documento na tela, com o mesmo CSS da impressão (folha clara, margens, serifa, cláusulas numeradas, assinaturas). Tirar do bloco de impressão o que é comum, para tela e papel não divergirem.
- [x] **Cartões em três pesos:** destaque (um por tela), normal e discreto. **Botões:** um primário por área; o resto, secundário ou link.
- [x] **Selos tipo carimbo** (aprovado, em votação, confidencial) com borda dupla e versalete, usados com moderação.

## Telas (na ordem de uso)

1. [x] **Sessão** (delegado): o cartão "Com a palavra" vira o destaque; a placa ganha cara de placa de mesa (nome do país em serifa, bandeira grande).
2. [x] **Painel da presidência:** três colunas com hierarquia clara, com os relógios no centro; o dourado só no cartão da presidência.
3. [x] **Telão:** letra maior, cabeçalho com timbre, modo crise (passo 35) sóbrio, sem piscar.
4. [x] **Agora:** capa no estilo primeira página (evento, data, sessão), cartões por papel com hierarquia.
5. [x] **Comitê e página da delegação:** a delegação como ficha de credencial (bandeira, nome oficial em versalete, delegados em cartões com moldura de foto).
6. [x] **Documentos** (editor, DPO, cartas): leitura em `Folha`; o editor mantém as ferramentas ao lado da folha.
7. [x] **Press:** capa do veículo com cabeçalho de jornal (nome do veículo em serifa grande, data, "Simulação"), matérias em colunas no notebook.
8. [x] **Cronograma:** linha do tempo por dia, com marcador de "agora", tipos de item (sessão, intervalo, cerimônia) por ícone e texto, comitê como etiqueta.
9. [x] **Perfil:** cartão de credencial (foto em moldura, nome, papel, comitê, bandeira) acima do formulário.
10. [x] **Entrar:** marca Diplomacy (passo 27), nome do evento, fundo papel.
11. [x] **Tema escuro:** revisar tudo acima nos dois temas.

## Testes

- [ ] Capturas de referência de todas as telas refeitas no CI (`workflow_dispatch` "atualizar_capturas"), nos 3 tamanhos.
- [x] axe com contraste nos dois temas (Playwright `emulateMedia({ colorScheme: 'dark' })`) em todas as rotas.
- [x] `npm run tamanho`: a primeira abertura continua abaixo de 300 KB.
- [ ] Manual: telão num projetor em sala clara; Android e iPhone reais; leitura de um DPO na tela comparada com o impresso.

## Pronto quando

- [ ] Uma pessoa do UFRGSMUN que nunca viu o app o descreve como "oficial" e "bem acabado".
- [ ] Documentos na tela e no papel têm a mesma aparência.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.

Pode virar vários commits: um para os fundamentos e um por grupo de telas.
