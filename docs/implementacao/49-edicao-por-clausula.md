# Passo 49 · Edição colaborativa por cláusula

**Parte de:** planos posteriores ([plano da edição colaborativa](../plano-editor-documentos.pdf), fonte em [HTML](../plano-editor-documentos.html))
**Depende de:** 09 e 44, e da validação do piloto (abaixo)
**Esforço:** G
**Situação (26/11/2026):** a primeira entrega foi absorvida pelo [passo 63](63-um-projeto-por-topico.md), que já não espera o piloto: a proposta estruturada (incluir, alterar, mover, retirar), a decisão explícita (por quem preside a sessão, não pelo redator), o texto atual e o proposto lado a lado, o histórico e a junção de working papers com a origem. A rodada com prazo sai. O que sobrar daqui só volta se o piloto pedir.
**Objetivo:** um bloco fecha um texto sem horas de comentários soltos: propostas curtas e estruturadas por cláusula, prazo e decisão explícita. Não é um editor em que todos digitam ao mesmo tempo.

## Antes de começar: validar com o piloto

Os planos deste passo e do 50 nasceram sem dados de uso. Só construir depois que a sessão do piloto ([piloto.md](../piloto.md)) responder, com as perguntas que o roteiro agora traz:

- a rodada de propostas do passo 9 deu conta, ou o bloco travou? Onde?
- o redator disse que precisava de comparação de texto, propostas estruturadas ou prazo por rodada?

Se o piloto não mostrar dor, o passo 49 fica para depois do evento. Se mostrar, o piloto diz quais partes valem a pena.

## O que construir (a primeira entrega)

- Documento em cláusulas, com uma proposta por vez.
- Proposta estruturada (manter, alterar, adicionar, remover, mover, perguntar) em vez de comentário livre, com comparação do que mudou.
- Prazo curto por rodada; ao fim, o app congela propostas novas e mostra o que está acordado, pendente ou sem resposta.
- Decisão pelo redator ou pela delegação responsável; cláusula acordada fica travada e registrada.
- Histórico de alterações e fusão básica de working papers, mantendo a origem.
- Celular: lista de cláusulas e uma folha com uma ação principal, não as duas colunas do notebook.

## Fora desta etapa

Edição livre simultânea, cursor ou presença por tecla, fusão complexa, conflitos em texto livre e aprovação configurável para todos os tipos de documento.

## Testes

- [ ] pgTAP: só o redator altera o texto; membro do bloco propõe e comenta; cláusula acordada não aceita mudança; proposta fora do prazo é recusada.
- [ ] Ponta a ponta com dois navegadores: proposta, comparação, aceitar, recusar, fim da rodada e fusão.
- [ ] Unidade: o cálculo da diferença entre duas versões de uma cláusula.
- [ ] axe e teste em celular e notebook; reconexão preserva a cláusula selecionada e o texto local.
