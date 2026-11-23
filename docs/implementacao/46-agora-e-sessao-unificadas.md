# Passo 46 · Agora operacional e sessão unificada

**Parte de:** planos posteriores (sobras dos passos 32 e 43)
**Depende de:** 43
**Esforço:** M
**Objetivo:** durante a sessão, o delegado vê o que está acontecendo, anota e prepara a próxima fala sem sair da sessão. O passo 32 deu o "Agora" por papel e o 43 deu a sessão em duas colunas. Falta tirar a nota rápida do `<details>` e dar ao rascunho da próxima fala um lugar sempre visível.

Este passo reúne o que antes estava como "Escopo reduzido para o piloto" nos passos 32 e 43. Aquelas seções descreviam como futuro algo que já existia; agora apontam para cá.

## Pergunta que o Agora responde

"O que eu preciso fazer agora?" Nada além disso: sem telas novas, preferências nem recomendações inteligentes.

- Um cartão em destaque por papel; sem pendência, o estado atual, a próxima etapa e "nada esperando você agora".
- Cada pendência leva direto à ação ou abre um modal curto, nunca a uma lista que contém a ação.
- Delegado: sessão ao vivo e, abaixo, votação ativa, bilhete novo, chegada, ponto ou moção, DPO ou rodada com prazo.
- Mesa: estado da sessão e no máximo três ações (chamada, pedidos, documentos enviados).
- Press, crise e secretaria: só o que exige ação imediata.
- A atualização ao vivo busca só os dados do cartão principal.

## Sessão do delegado

- Bloco persistente: orador, dois relógios, tópico, estado do debate e votação ativa.
- **Área sempre visível de nota rápida e próxima fala**, ligada a comitê, sessão, tópico, orador e hora. Tipos: "Nota", "Sobre esta delegação" e "Fala". Reutiliza o caderno (passo 34); o modelo de dados não cresce além dessa associação. A tabela `anotacao` já guarda `topico` e `orador_delegacao_id` (`20261215090000_caderno.sql`): conferir se guarda também a sessão e a hora e acrescentar só o que faltar. O passo 50 traz mais tipos de captura (ponto, pedido, contradição, aliado, pergunta, dado); se `tipo` for uma restrição do banco, ela é ampliada lá, não aqui.
- Preservar o texto digitado e a posição de leitura ao mudar de orador, atualizar ao vivo ou reconectar.
- Ponto ou moção, placa, voto e crise aparecem conforme o estado da sessão.
- Celular: folha curta ou modal pequeno, uma ação principal. Notebook: sessão à esquerda, ações e rascunho à direita.

## Mesa e presidência

Situação, orador, fila curta, pedidos pendentes e votação ativa numa área só. Chamadas, ajustes de tempo e "assumir delegação" ficam recolhidos. Confirmar só o que é coletivo ou irreversível; o que dá para reverter oferece desfazer.

## Fora desta etapa

Editor de discurso, favoritos, layouts configuráveis, presença por tecla, compartilhamento do caderno nesta área e ensaio completo (passo 50).

## Testes

- [ ] Unidade: a nota captura o contexto certo (tópico, orador, hora).
- [ ] Ponta a ponta: o rascunho sobrevive à troca de orador e à reconexão; o Agora de cada papel mostra só o que cabe a ele; sem pendência aparece "nada esperando você agora".
- [ ] axe e capturas no celular e no notebook.
- [ ] Manual: uma pessoa que nunca viu o app entende a situação e a próxima ação em menos de dez segundos.
