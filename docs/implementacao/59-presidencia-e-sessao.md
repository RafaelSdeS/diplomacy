# Passo 59 · Uma presidência só, numa tela só, e a sessão na ordem certa

**Parte de:** uso de 25/11/2026 ("a lista de placas levantadas não é necessariamente a ordem em que serão faladas, o presidente decide"; "o botão de ponto ou moção deveria estar mais em cima"; "o presidente ainda é uma delegação que vota e fala: fica ruim ter duas abas"; "só pode haver UM presidente por sessão; a presidência só é passada se a sessão acabar ou houver voto de não confiança")
**Depende de:** 29 (bureau e presidência), 30 (lista curta), 43 e 46 (sessão), 51 lote 1 (painel), 54 (cartão "A palavra")
**Esforço:** M
**Situação:** pronto (25/11/2026).
**Quando:** antes do piloto. O roteiro passa pela presidência de uma delegação, e hoje ela confunde quem já conhece as regras.
**Objetivo:** a delegação que preside conduz e participa na mesma tela; há um único presidente; as placas são um conjunto, e a ordem de fala é a que a presidência escolhe; ponto ou moção fica à mão.

## O que acontece hoje (investigado em 25/11/2026)

- **Dois presidentes ao mesmo tempo.** `pode_presidir()` devolve verdadeiro para a mesa **sempre** (`tem_papel(comite, '{mesa}') or …`), além da delegação da vez. Enquanto a França preside, a mesa também dá a palavra, mexe no cronômetro e abre votações pelo mesmo painel.
- **A presidência passa a qualquer momento.** O botão "Passar a presidência" (`passar_presidencia`) está no painel para a delegação e para a mesa, durante todo o debate. Pela regra (regras-de-procedimento.md), ela só passa no fim da sessão (a sessão nova pega a próxima do rodízio, em `abrir_sessao`) ou com a não-confiança aprovada (já implementado).
- **A fila parece uma ordem.** Os pedidos de fala são uma lista numerada (`<ol>`, por `criado_em`); o delegado vê "Placa levantada · 1ª na fila"; no painel, o Enter dá a palavra ao primeiro da fila quando a lista curta está vazia. Tudo isso diz "a ordem é de quem levantou primeiro", o que não é a regra: a presidência escolhe.
- **Duas telas para quem preside.** A delegação que preside usa o Painel para conduzir e a Sessão para votar, fazer ponto e anotar. No painel não há o voto da própria delegação.
- **Ponto ou moção no fim.** Na Sessão, o cartão "Ponto ou moção" vem depois do alerta, da chegada, das desconfianças e da votação, no fim da coluna (e no celular, depois de tudo). Na Agora, aparece só na pausa.

## O que construir

### 1. Uma presidência por vez (migração)

- **O bureau preside só o que a regra oficial manda** (confirmado em 25/11/2026: "siga as regras oficiais"): a plenária de abertura, na primeira sessão, em que também se sorteia a lista de presidências; a fase de ação (projetos de resolução e emendas); e os casos excepcionais. Todo o resto do debate fica com a delegação da vez, na ordem sorteada.
- `pode_presidir()`: a mesa preside só quando o bureau preside (`bureau_preside()`: plenária, fase de ação, nenhuma delegação da vez ou caso excepcional assumido). Com uma delegação presidindo, a mesa é **bureau**: julga os pontos (`aprovado_bureau`), confirma chegadas e avalia documentos, sem os controles de condução.
- **"Passar a presidência" sai.** `passar_presidencia` deixa de existir como ação livre; a troca acontece:
  - no fim da sessão: a sessão seguinte abre com a próxima do rodízio (já é assim);
  - na não-confiança aprovada: assume a próxima da lista de espera (já é assim).
- **"Assumir a presidência" fica só para casos excepcionais:** sai do fluxo normal do painel da mesa e vai para "Mais opções", com `Confirmar` e um motivo curto que fica no registro da sessão. "Devolver" volta para **a mesma** delegação, não para a próxima.
- **Delegação da vez ausente:** assume a próxima presente na ordem sorteada (decidido em 25/11/2026). `tomar_proxima_presidencia` pula as ausentes na chamada sem gastar a vez delas, que continuam na lista para as próximas sessões.
- Quem perde a presidência perde tudo na hora: o painel some da tela dela ao vivo (a tela relê `pode_presidir`), e a RPC recusa.

### 2. Quem preside, numa tela só

- Para a delegação da vez, **a Sessão é o painel**: o menu "Sessão" e a Agora levam ao painel, e o painel ganha um cartão **"Sua delegação"** com o que ela faz como delegação:
  - o voto dela na votação aberta (o mesmo `Votar`), ao lado da grade;
  - "Dar a palavra a si mesma" (a presidência também discursa), que fica registrado como fala da delegação;
  - "Anotar" e o aviso de bilhetes novos (passo 61).
- Quando a presidência acaba (fim da sessão ou não-confiança), a tela volta sozinha à Sessão normal, com um aviso.

### 3. Placas sem ordem; a ordem é a dos próximos

- **"Placas levantadas"**, não "Pedidos de fala": no painel, as placas aparecem como uma grade de bandeiras **em ordem alfabética**, sem número. Tocar numa abre "Dar a palavra" ou "Pôr nos próximos".
- **"Próximos"** é a única lista com ordem: a que a presidência montou. O Enter dá a palavra ao primeiro dos próximos, e **nunca** à placa mais antiga.
- **Para a delegação:** "Placa levantada" (sem posição). Quando a presidência a põe nos próximos: "Você é a 2ª dos próximos". O cartão "A palavra" (passo 54) já mostra os próximos como "A seguir".
- O telão mostra as placas levantadas como grade, sem ordem, e "A seguir" com os próximos.

### 4. Ponto ou moção em cima

- **Sessão:** "Fazer um ponto ou moção" vira o primeiro botão da barra da sessão (primário, com ícone de mão), antes de Agenda, Votações e Telão. Os pedidos da delegação viram uma linha curta abaixo ("2 pedidos esperando a mesa"), que abre a lista num modal.
- **Agora:** o mesmo botão no cartão da sessão ao vivo, sempre (não só na pausa).
- **Celular:** o botão fica fixo no rodapé da Sessão, acima da barra do menu.

## Decisões (25/11/2026)

1. **A presidência fala como delegação:** sim, por "Dar a palavra a si mesma"; o cronômetro corre como para as outras.
2. **O bureau preside só o que a regra oficial manda:** a plenária de abertura (primeira sessão, com o sorteio das presidências), a fase de ação e os casos excepcionais. No debate, tudo com a delegação da vez.
3. **Delegação da vez ausente:** assume a próxima sorteada que estiver presente.

As regras oficiais (regras-de-procedimento.md) valem, confirmado em 25/11/2026.

## Testes

- [x] pgTAP: na plenária e na fase de ação, a mesa preside; no debate com uma delegação da vez, a mesa não dá a palavra nem mexe no cronômetro (só julga e confirma chegadas), até assumir um caso excepcional; a sessão nova pula a delegação da vez ausente sem gastar a vez dela; a não-confiança aprovada passa a presidência, e a anterior perde `pode_presidir`; não há mais `passar_presidencia` livre.
- [x] Ponta a ponta: a França preside e vota no painel, sem trocar de tela; a mesa não vê os controles de condução até assumir.
- [x] Ponta a ponta: três delegações levantam a placa em ordem; o painel as mostra em ordem alfabética, sem número; o Enter não dá a palavra a ninguém até a presidência montar os próximos; a delegação vê "Você é a 1ª dos próximos" só depois.
- [x] Ponta a ponta, a 1366 × 768 e no celular: "Fazer um ponto ou moção" à vista sem rolar na Sessão e na Agora.

## Como ficou

- Migração `20261225090000_presidencia_unica.sql`: `pode_presidir()` só dá a condução à mesa quando o bureau preside (`bureau_preside()`); `passar_presidencia` saiu; `assumir_presidencia(…, p_motivo)` guarda o motivo em `estado_sessao.motivo_mesa`; `tomar_proxima_presidencia` pula as ausentes quando a chamada da sessão aberta já foi feita (fim da plenária, não-confiança); `presidencia_ausente()` (mesa) passa à próxima presente e devolve a vez à ausente. Na abertura da sessão a chamada ainda não existe, então a da vez é a da ordem, e a mesa vê o aviso se ela faltar.
- Painel: para a mesa sem a condução, o cartão "A mesa como bureau" (quem conduz, o aviso da ausente com "Passar à próxima presente", "Acompanhar a sessão"), mais "Para decidir" sem "Pontos e moções" e a votação sem "Encerrar". "Mais opções" tem "Mesa assume a presidência" (com motivo e confirmação) e "Devolver a presidência a …". A faixa "Preside a sessão" mostra "caso excepcional: motivo".
- A delegação da vez: a Sessão redireciona ao painel; o painel tem "Sua delegação" (voto na votação aberta e "Dar a palavra a si mesma"); ao perder a presidência, volta à Sessão com o aviso "A presidência da sua delegação terminou.".
- Placas: "Placas levantadas" em ordem alfabética, sem número, no painel, no cartão "A palavra" e no telão (o telão só numera os próximos e a lista de oradores); o delegado vê "Placa levantada"; o Enter dá a palavra ao primeiro dos próximos (ou da lista de oradores), nunca à placa mais antiga.
- Ponto ou moção: o primeiro botão da barra da Sessão; o cartão vira "Seus pontos e moções" (só com pedidos); na pausa, "Fazer agora"; na Agora, sempre, ao lado de "Abrir a sessão" (leva à Sessão com o modal aberto, `?ponto`). O rodapé fixo no celular não foi feito: o botão já é o primeiro da tela.
- Testes: o ajudante `comiteEmDebate` faz a mesa assumir (caso excepcional) para os testes de condução; o do bureau (29) pede `mesaConduz: false`.
