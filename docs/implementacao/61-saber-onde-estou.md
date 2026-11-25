# Passo 61 · Saber onde estou e o que chegou

**Parte de:** uso de 25/11/2026 ("eu que sei como funcionam as coisas não consegui entender de primeira qual a ordem das coisas"; "as mensagens recebidas devem ter algum tipo de notificação visual"; "ao assinar o working paper, ele some da aba Documentos?"; "muito do que percebo é que não é intuitivo o suficiente")
**Depende de:** 51 lote 3 (bilhetes como conversa), 55, 56, 59
**Esforço:** M
**Quando:** antes do piloto, junto com o 59.
**Objetivo:** em qualquer tela, a pessoa sabe em que momento o comitê está, o que vem depois e o que espera por ela; o que chega (bilhete, documento) se anuncia; o que é dela não some.

## O que acontece hoje (investigado em 25/11/2026)

- **A ordem só aparece depois da plenária.** A trilha do tópico (passo 56) só existe com um tópico em debate (`topico_atual`). Na plenária de abertura, em que o comitê passa a primeira sessão, a Sessão e a Agora não mostram a ordem nenhuma: nem que a plenária tem três momentos, nem que ela acaba com a moção do tópico, nem que depois vêm agenda, working papers e projeto. Foi exatamente onde o uso de 25/11 se perdeu.
- **A trilha é discreta.** Na Sessão e na Agora ela é compacta (ícones), sob "Tópico em debate"; o "o que fazer agora" é uma linha cinza.
- **Bilhete novo não se anuncia.** Não há contagem no menu, nem aviso em outra tela: só a lista "Precisa de você" da Agora (para a delegação) e a aba Mensagens. O lote 3 do 51 previa a contagem no menu, mas ainda não foi feito.
- **O documento assinado some da aba Documentos.** O passo 56 tirou a seção "Dos seus blocos". O documento do bloco sem a minha assinatura aparece em "Para você"; assinado, ele sai de lá e só fica dentro do modal da etapa (por exemplo, "Working papers 3" no cartão do tópico). Parece que sumiu.

## O que construir

### 1. A linha do comitê, sempre à vista

- Uma faixa no topo da Sessão (e um resumo na Agora e na aba Comitê) com o caminho **inteiro**: Plenária de abertura (briefing → discursos de abertura → moção do tópico no topo) → Tópico em debate (agenda → working papers → projeto → resolução) → próximo tópico.
- O momento atual em destaque, com uma frase **"Agora:"** e outra **"Depois:"**, por papel. Exemplos:
  - plenária, discursos: "Agora: discursos de abertura, todas as delegações falam em ordem alfabética. Depois: uma delegação propõe o tópico no topo, e a sala vota.";
  - plenária, moção do tópico (delegação): "Agora: proponha qual tópico abre o debate (Fazer um ponto ou moção → Moção de introdução do tópico no topo).";
  - plenária, moção do tópico (mesa): "Agora: espere a moção de uma delegação em Pontos e moções; abra a votação.".
- Cada etapa leva ao lugar dela (a agenda, a lista de documentos, a votação). A trilha do tópico (passo 56) vira o segundo nível dessa linha.

### 2. "Como funciona o comitê", uma tela

- Uma página curta, com a linha do comitê desenhada e uma frase por etapa, em linguagem de quem nunca usou o app, para cada papel (delegação, presidência, mesa). Abre pelo "?" da linha do comitê e pela aba Comitê. Nada de tutorial longo.

### 3. O que chegou se anuncia

- **Contagem no menu:** "Mensagens" ganha um número (bilhetes e mensagens da mesa não lidos), na lateral e na barra do celular. O título da aba do navegador também ("(2) Sessão · CSNU").
- **Aviso em qualquer tela:** chegando um bilhete, aparece por alguns segundos, no canto, "Bilhete de Brasil", com "Abrir" (e a bandeira). Não rouba o foco nem toca som. Durante uma votação aberta, o aviso espera.
- **Lido sem migração:** a hora da última leitura de cada conversa fica no aparelho (como no lote 3 do 51); abrir a conversa zera a contagem dela.
- O mesmo vale para o documento novo do bloco e para o documento devolvido pela mesa.

### 4. O que é meu não some

- Na aba Documentos, uma linha fixa **"Seus documentos"** (dos blocos da delegação), com a contagem e o estado de cada um, que abre a lista num modal: rascunhos, enviados, aprovados. Assinar tira o documento de "Para você", mas não da linha "Seus documentos".
- Na ficha do documento (prévia), "Sua delegação assinou" à vista.

## Testes

- [ ] Ponta a ponta: na plenária, a Sessão do delegado e da mesa mostra a linha do comitê com o momento certo e o "Agora/Depois" de cada papel; aprovada a moção do tópico, a linha passa à agenda, sem recarregar.
- [ ] Ponta a ponta com dois navegadores: o Brasil manda um bilhete; a França, na Sessão, vê o aviso e a contagem no menu; ao abrir a conversa, a contagem zera.
- [ ] Ponta a ponta: a delegação assina um working paper do bloco; ele sai de "Para você" e continua em "Seus documentos".
- [ ] axe na linha do comitê, no aviso e na página "Como funciona", nos dois temas.
