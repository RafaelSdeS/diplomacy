# Passo 33 · Números e telas clicáveis

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 17)
**Depende de:** 26 e 32
**Esforço:** M
**Objetivo:** todo número abre o que ele conta, e todo nome de país abre a página da delegação.

## Hoje

Números que são só texto: "Presentes: 12 de 15" e o quórum (chamada), "9 de 15 votaram" (painel), as contagens de assinaturas (não-confiança, emendas, documento), "1 aviso novo" (Agora), a posição na fila. Os nomes de país viram link no passo 26.

## Decisões

- Usar `<details>` com estilo próprio, não a Popover API, que não funciona em iPhones antigos (o mesmo cuidado de evitar `Object.groupBy`).
- Um componente só, para não espalhar código.

## Código

- [ ] `src/lib/ui/Contagem.svelte`: props `rotulo` e `itens` (lista de `{ texto, href?, bandeira? }`), e um snippet opcional para conteúdo próprio. O número aparece como `<summary>`, e a lista abre embaixo. Esc fecha (o `<details>` já responde ao Enter).
- [ ] Onde usar:

  | Tela | Número | Abre |
  |---|---|---|
  | Chamada e painel | Presentes 12 de 15 | presentes e ausentes |
  | Painel | 9 de 15 votaram | quem votou e quem falta |
  | Sessão e painel | Pedidos de fala (3) | a fila, com a sua posição marcada |
  | Sessão e painel | Assinaturas da não-confiança | quem assinou |
  | Painel e documento | Assinaturas da emenda e do projeto | quem assinou |
  | Agora | Avisos novos | os avisos |
  | Sessão | Tópico em debate | a agenda adotada do tópico |
  | Comitê | Delegações (28) | já é a lista; cada país é link |

## Testes

Arquivo: `tests/33-numeros.spec.ts`.

- [ ] Ponta a ponta: "Presentes" abre a lista certa; "votaram" mostra quem falta; com teclado, Enter abre e Esc fecha.
- [ ] axe nas telas tocadas.

## Pronto quando

- [ ] Nenhum número importante da sessão é beco sem saída.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
