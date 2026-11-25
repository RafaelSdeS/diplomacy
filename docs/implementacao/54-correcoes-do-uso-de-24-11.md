# Passo 54 · Correções do uso de 24/11

**Parte de:** pedido de 24/11/2026, depois dos lotes 1 e 2 do passo 51 (uso na conta da secretaria, que também é mesa do CSNU-T)
**Depende de:** 51 (lotes 0 a 2)
**Esforço:** P–M
**Situação:** pronto (25/11/2026).
**Quando:** antes de tudo o que vem depois: são defeitos à vista, e o piloto (passo 12) passaria por eles.
**Objetivo:** consertar o que atrapalha hoje: papéis somados, modais fora do centro, telão sem saída, lista de oradores solta. E criar uma página discreta "Sobre", com os créditos e os dados pessoais (LGPD).

## 1. Quem é secretaria e mesa não vê o comitê

**O que acontece.** A conta `rafesilvadesouza@gmail.com` é **mesa do CSNU-T** e **secretaria** do evento. O menu e a Agora são montados por um único papel, o `papelPrincipal()` de `src/lib/papeis.ts`, e a secretaria vem primeiro na prioridade (`['secretaria', 'diretoria_press', 'mesa', …]`). No `menu()` de `src/lib/menu.ts`, o papel principal secretaria monta só `[Agora, Participantes, Press, Cronograma, Avisos]`: sem Sessão nem Painel, sem Documentos, Mensagens e Comitê. Em `src/routes/+page.ts`, `comiteAoVivo` só existe para mesa e delegado. Resultado: nenhuma sessão para presidir, embora o banco deixe (`pode_presidir` → `tem_papel(comite, '{mesa}')`, e a conta é mesa).

**Não está certo.** A secretaria sozinha não preside, e isso continua assim: a regra `tem_papel(…, '{mesa}')` não aceita a secretaria. Mas quem também é mesa tem que ver o comitê.

**Correção** (sem migração):

- **Menu:** a pessoa recebe as telas de todos os seus papéis, na ordem do principal. Secretaria e mesa: Agora, Painel, Documentos, Mensagens, Comitê e Participantes (as demais em "Mais"). A regra passa a ser "o comitê aparece sempre que a pessoa tem um comitê", em vez de depender do papel principal.
- **Agora:** com mesa e secretaria, o bloco da mesa (sessão ao vivo, atalhos) vem em cima, e o cartão da secretaria vem logo abaixo, compacto (check-in e participantes). `comiteAoVivo` olha a participação de mesa ou delegado, qualquer que seja o principal.
- **Cabeçalho:** a faixa do país e do papel mostra os dois ("Mesa · CSNU-T · Secretaria").

**Decidido (25/11/2026, com a proposta):** a secretaria sem papel de mesa **não** assume a presidência. A secretaria convida alguém como mesa pela tela Participantes, e isso já resolve.

## 2. Modais no canto superior esquerdo

**Causa.** No lote 0b, as fichas passaram para o centro usando `classe="ficha"` no `Modal`. Só que `.ficha` já existia em `src/app.css` (linha ~627), na lista de definições das regras do comitê: `margin: 0 0 1.5rem`, `border-top` e `.ficha div { display: grid; border-bottom }`. O `margin: 0` anula o `margin: auto` que centraliza o `<dialog>` nativo, e o modal cola no canto. Os cinco modais afetados:

- a ficha da delegação (`FichaDelegacao.svelte`);
- a ficha do ponto (`FichaPonto.svelte`);
- a ficha da nota (`FichaNota.svelte`);
- a ficha da votação (`FichaVotacao.svelte`);
- a prévia de documentos (`Previa.svelte`).

O `.ficha div` também desenha linhas e grade em cada `<div>` dentro deles.

**Correção:** renomear a classe do modal para `modal-ficha` nos cinco componentes e no `dialog.ficha` do CSS. A `.ficha` das regras fica como está. O `classe="placa"` ocupa a tela inteira de propósito, então o `margin: 0` dele está certo.

**Para não voltar:** um teste ponta a ponta abre cada modal da lista e confere que o centro do `<dialog>` fica a menos de 2 px do centro da janela, no notebook e no celular.

## 3. Sair do telão

**Como é hoje.** `/telao/<sigla>` e `/telao/coletiva` não têm moldura (`semMoldura` em `+layout.svelte`), e o telão do comitê põe a tela cheia em qualquer clique (`svelte:window onclick={telaCheia}`). Não há botão para voltar: só o "voltar" do navegador.

**Correção:**

- Ao mexer o mouse aparece, junto da dica "F: tela cheia", um botão **"Sair do telão"** (ícone de porta, com fundo). Ele sai da tela cheia, se estiver ativa, e volta para a tela de origem (`voltar.svelte.ts`), ou para `/comite/<sigla>/sessao` (ou `/press/coletiva`) quando o telão foi aberto direto.
- O clique no botão não pode disparar a tela cheia: `stopPropagation`, ou trocar o `onclick` da janela por um clique só no fundo.
- O Escape sai da tela cheia (comportamento do navegador). Fora da tela cheia, o Escape não faz nada, para não fechar o telão sem querer durante a sessão.

## 4. A lista de oradores, junto de quem fala

**O que acontece em `/comite/<sigla>/sessao`** (passo 43: duas colunas no notebook):

- **Mesa, ou quem não é delegação:** a coluna da esquerda ("o que a delegação faz") fica vazia, porque a placa, o ponto ou moção e a chegada só existem para a delegação. "Com a palavra" e a lista ficam sozinhos na metade direita, soltos na página.
- **Delegação:** a lista de oradores é um cartão separado, abaixo de "Com a palavra" e depois do cartão "Anotar". E a "Sua placa", que é o que põe a delegação na lista, fica na outra coluna. Os "Pedidos de fala" são um terceiro cartão.

**Correção:**

- **Um cartão "A palavra"**, no desenho do painel da presidência e do telão:
  - em cima, a bandeira e o nome de quem fala, com o cronômetro;
  - logo abaixo, "A seguir": a lista numerada, com a posição da própria delegação destacada ("Você é a 3ª");
  - depois, "Placas levantadas" (os pedidos de fala), como uma linha com a contagem que abre a lista num modal.
- **"Levantar placa"** entra no mesmo cartão, embaixo da lista: a ação fica onde está o efeito.
- **Uma coluna só quando não há o que fazer:** sem delegação (mesa, crise, press), a página usa uma coluna, com "A palavra" largo no topo. A mesa vê ainda o botão "Painel da presidência", em destaque.
- O "Anotar" sai do meio dos cartões e vai para a barra de botões da sessão, junto de Agenda, Votações e Telão.

## 5. "Sobre o Diplomacy": créditos e dados pessoais

Hoje "Meus dados (LGPD)" é um botão no Perfil, e o aviso de privacidade aparece só na tela de entrada. Não há créditos.

- **Página `/sobre`**, pública como `/privacidade`. O acesso é discreto: uma linha pequena no fim do Perfil e do "Mais" ("Sobre o Diplomacy"), e o logo do cabeçalho com clique longo, ou o atalho `?`, abre a mesma página. Nada no menu principal.
- **Conteúdo:**
  - o que é o app, em duas linhas;
  - os créditos: "Criado e desenvolvido por **Rafael Silva de Souza**", com link para <https://rafaelsdes.github.io/> (decidido em 24/11/2026);
  - a versão (o commit do build);
  - os links para "Meus dados (LGPD)", com baixar, corrigir e pedir exclusão (o que `/perfil/meus-dados` já faz), e para o aviso de privacidade;
  - o contato do encarregado de dados. **Pendente:** o contato não existe ainda; a página diz que o encarregado é a organização do evento (a controladora). Entra com o texto final do aviso de privacidade.
- Os textos traduzidos ficam em constantes `.ts` (o `npm run textos` recusa texto solto em `.svelte`).


## Testes

- [x] Unidade (`menu.test`): secretaria e mesa recebem Painel, Documentos, Mensagens, Comitê e Participantes; só secretaria continua sem o comitê.
- [x] Ponta a ponta: uma conta de secretaria e mesa abre o painel da presidência pela barra e vê a sessão ao vivo na Agora.
- [x] Ponta a ponta: os cinco modais (ficha da delegação, do ponto, da nota e da votação, e a prévia) abrem no centro, no notebook e no celular.
- [x] Ponta a ponta: no telão, "Sair do telão" volta à sessão, e o clique nele não põe a tela cheia.
- [x] Ponta a ponta, a 1366 × 768: na sessão, a lista de oradores fica dentro do cartão "A palavra"; como mesa, a página usa uma coluna.
- [x] `/sobre` abre sem login, mostra o nome e o link do criador, passa no axe e leva a "Meus dados".

## Como ficou

- `noComite()` (`src/lib/papeis.ts`) acha a participação no comitê (mesa antes de delegado), qualquer que seja o principal; o menu, a Agora e o cabeçalho usam ela. O teste usa a mesa do CE-T-32, que o seed também faz secretaria.
- No debate, "A seguir" é a lista curta da presidência (a lista de oradores só existe na plenária e na lista especial).
- "?" e o clique longo no logo (700 ms) abrem `/sobre`; a versão vem de `CF_PAGES_COMMIT_SHA` ou do `git rev-parse` no build (`vite.config.ts`).
