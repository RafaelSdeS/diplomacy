# Passo 10 · DPO, cartas e documentos em PDF

**Parte de:** piloto
**Depende de:** 09
**Objetivo:** escrever o DPO no app e imprimir DPOs, resoluções e cartas no formato dos documentos do UNOCT 2026, que vale para todos os comitês.

## DPO

- Novo tipo de `documento`: `dpo`, um por delegação e por tópico.
- Campos: tópico, texto (parágrafos) e referências (lista numerada).
- Situação: `enviado`, `aprovado` ou `pede_ajustes`, com comentário da mesa.
- Prazo de envio vindo do cronograma; a Agora mostra a situação do DPO.
- A mesa decide se os DPOs do comitê ficam abertos para as outras delegações (`regras.dpos_publicos`).

## Cartas diplomáticas

- Novo tipo de `documento`: `carta`, com remetente (uma delegação ou um bloco), destinatários (delegações ou blocos) e visibilidade (pública no comitê ou privada aos destinatários).
- As regras de acesso respeitam a visibilidade.

## Modelos de impressão

Em `src/lib/impressao/`, com HTML e CSS de impressão (`@page` A4 e fontes locais):

| Modelo | Conteúdo |
|---|---|
| DPO | Nome oficial do país e bandeira ou brasão no topo, comitê, faixa com o tópico, texto em duas colunas (`column-count: 2`), referências numeradas e assinatura da delegação |
| Working paper, projeto e resolução | Título, preambulares, linha do comitê, operativas com subitens e signatários |
| Carta | Cabeçalho do remetente, destinatários, corpo e assinatura |

- Rota `/imprimir/[tipo]/[id]`: mostra só o documento e chama `window.print()`. No celular, o próprio sistema oferece "Salvar como PDF".
- Brasões e bandeiras próprios (comitês históricos, personagens) ficam no bucket `imagens` do Storage; só a mesa envia.

## Testes

Arquivos: `supabase/tests/10-documentos.test.sql`, `src/lib/impressao/impressao.test.ts` e `tests/10-impressao.spec.ts`.

- [ ] pgTAP: o DPO fica fechado para as outras delegações até a mesa liberar.
- [ ] pgTAP: uma carta privada só aparece para o remetente e os destinatários.
- [ ] pgTAP: só a mesa muda a situação de um DPO.
- [ ] Vitest: os modelos montam o cabeçalho, as referências numeradas e a assinatura a partir dos dados.
- [ ] Ponta a ponta: a página de impressão do DPO tem cabeçalho, duas colunas e referências; a do projeto tem a linha do comitê e os signatários.
- [ ] Aparência: o PDF gerado pelo Playwright (`page.pdf()`, no Chromium) é comparado com uma imagem de referência, para pegar mudanças de layout sem querer.
- [ ] Manual: o PDF sai igual no Chrome, no Firefox e no Safari.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [ ] Um DPO do comitê de teste sai no padrão dos DPOs do UNOCT.
- [ ] Um projeto de resolução e uma carta saem no formato combinado.
- [ ] Escrever o DPO funciona no celular e no notebook.
