# Passo 38 · Melhorias de uso

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 23)
**Depende de:** 21 (cada melhoria pode entrar antes, junto do passo que mexe na mesma tela; a coluna "Junto de" sugere onde)
**Esforço:** P cada, M no total
**Objetivo:** tirar pequenos atritos do dia a dia do evento. A lista vem desta análise e cresce com o que aparecer no piloto (questionário em `docs/piloto.md`).

## As melhorias

| # | Melhoria | Onde | Junto de |
|---|---|---|---|
| 1 | Tela sempre acesa na sessão | Sessão, painel | 21 |
| 2 | "Sua vez": aviso quando a delegação recebe a palavra e nos últimos segundos | Sessão | 28 |
| 3 | Votação aberta chama a atenção | Sessão, Agora | 32 |
| 4 | Retirar o próprio ponto ou moção | Sessão | 29 |
| 5 | Rascunhos guardados no aparelho | Ponto, bilhete, carta, notícia, nota de crise | — |
| 6 | Filtrar listas longas de delegações | Chamada, bilhete, votos da mesa, próximos | 21 |
| 7 | Contador de caracteres | Campos com limite | — |
| 8 | Confirmar o que não tem volta | Encerrar votação, passar a presidência | 21 |
| 9 | Hora relativa | Avisos, notas, mensagens, notícias | — |
| 10 | Tema claro ou escuro escolhido | Perfil | 37 |
| 11 | Telão em tela cheia com uma tecla | Telão | — |

### 1. Tela sempre acesa na sessão

O telão já usa a Wake Lock API. Fazer o mesmo na Sessão e no painel, com um `$effect` que pede a trava ao entrar, renova ao voltar o app para a frente (`visibilitychange`) e solta ao sair. Extrair para `src/lib/tela-acesa.ts` e usar nas três telas.

### 2. "Sua vez"

Quando `orador` passa a ser a própria delegação:
- faixa "A palavra é sua" no topo;
- `navigator.vibrate(200)` onde existir (Android; o iPhone ignora);
- nos últimos `aviso_fala_seg`, o relógio já muda de cor; acrescentar uma vibração curta.

### 3. Votação aberta chama a atenção

Ao abrir uma votação: a tela rola até o cartão de voto, o foco vai para o título do cartão (anunciado pelo leitor de tela) e o aparelho vibra uma vez. Só uma vez por votação (guardar o id).

### 4. Retirar o próprio ponto ou moção

Função `retirar_ponto(p_ponto)`: só a delegação autora, e só enquanto o pedido está `aberto` ou `em_ordem` (antes de virar lista ou votação); status `retirado`, que entra na `check`. Botão "Retirar" em "Seus pedidos". Teste pgTAP e uma verificação na ponta a ponta do passo 29.

### 5. Rascunhos guardados no aparelho

Texto em edição salvo no `localStorage` a cada pausa de digitação, com a chave `rascunho:<tela>:<comite>`, e apagado no envio. Leitura e escrita dentro de `try/catch` (aba anônima ou armazenamento bloqueado não quebram nada). `src/lib/rascunho.ts`, com Vitest.

### 6. Filtrar listas longas de delegações

Campo "Filtrar" acima das listas com mais de 12 delegações: filtra por nome, sem acento e sem diferenciar maiúsculas (`normalize('NFD')`). `src/lib/filtro.ts`, com Vitest.

### 7. Contador de caracteres

Nos campos com `maxlength` (37 hoje), "120 de 300" embaixo, ligado por `aria-describedby`, que fica âmbar nos últimos 10%. Componente `src/lib/ui/Contador.svelte`.

### 8. Confirmar o que não tem volta

`<dialog>` de confirmação, que o passo 21 cria para encerrar a sessão, reaproveitado em "Encerrar a votação", "Passar a presidência" e "Retirar adoção". Componente `src/lib/ui/Confirmar.svelte`.

### 9. Hora relativa

"Há 2 min", "há 1 h" com `Intl.RelativeTimeFormat` no idioma da pessoa; a hora exata no `title` e num `<time datetime>`. `src/lib/tempo.ts`, com Vitest.

### 10. Tema escolhido

No perfil: "Automático", "Claro" ou "Escuro". Grava `data-theme` no `<html>` e no `localStorage` (com `try/catch`). O CSS já tem o tema escuro; acrescentar `:root[data-theme="light"]` e `:root[data-theme="dark"]` ao lado do `prefers-color-scheme`.

### 11. Telão em tela cheia

Tecla F alterna a tela cheia (`requestFullscreen`), e o cursor some depois de 3 s parado. A dica "F: tela cheia" aparece só ao mexer o mouse.

## Testes

Arquivos: `src/lib/rascunho.test.ts`, `src/lib/filtro.test.ts`, `src/lib/tempo.test.ts`, `supabase/tests/38-retirar-ponto.test.sql` e `tests/38-uso.spec.ts`.

- [ ] Vitest das três funções puras.
- [ ] pgTAP de `retirar_ponto`: só a autora; só antes da lista ou da votação.
- [ ] Ponta a ponta:
  - o rascunho do bilhete volta depois de recarregar a página;
  - o filtro acha "Côte"/"Costa do Marfim" sem acento;
  - a confirmação aparece ao encerrar uma votação;
  - o tema escolhido sobrevive à recarga.
- [ ] axe nas telas tocadas.
- [ ] Manual: vibração e tela acesa num Android real; no iPhone, sem erro.

## Pronto quando

- [ ] As 11 melhorias estão no ar, cada uma no passo em que entrou ou aqui.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
